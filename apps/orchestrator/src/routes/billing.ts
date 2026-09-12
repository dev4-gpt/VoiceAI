import { Router, Request, Response } from 'express';
import { billingService } from '../services/billingService';
import { requireApiKey } from '../middleware/auth';
import { stripeService } from '../services/stripeService';
import type { SubscriptionTierId, ROIParameters } from '@voice-os/shared';

export const billingRouter = Router();

/** The only plan ids that may be billed. Anything else is rejected, never defaulted. */
const VALID_PLAN_IDS: SubscriptionTierId[] = ['starter', 'pro', 'enterprise'];

function isValidPlanId(value: unknown): value is SubscriptionTierId {
  return typeof value === 'string' && (VALID_PLAN_IDS as string[]).includes(value);
}

// GET /api/billing/plans
billingRouter.get('/plans', (_req: Request, res: Response) => {
  try {
    const plans = billingService.getPlans();
    res.json({
      status: 'success',
      plans,
      currency: 'USD',
      annualDiscountPct: 20
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/usage/:clientId
billingRouter.get('/usage/:clientId', requireApiKey, (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const companyName = (req.query.company as string) || undefined;
    const usage = billingService.getClientUsage(clientId, companyName);
    res.json({
      status: 'success',
      usage
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/calculate-roi
billingRouter.post('/calculate-roi', (req: Request, res: Response) => {
  try {
    const {
      monthlyTraffic,
      averageContractValueUsd,
      currentConversionPct,
      afterHoursTrafficSharePct,
      voiceConversionPct,
      closeRatePct,
      planId,
      billingCycle
    } = req.body;
    // Optional percentages pass through undefined so the service applies its
    // documented defaults; a caller-supplied 0 is a real value and is kept.
    const optionalNumber = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
    const params: ROIParameters = {
      monthlyTraffic: Number(monthlyTraffic) || 5000,
      averageContractValueUsd: Number(averageContractValueUsd) || 3500,
      currentConversionPct: optionalNumber(currentConversionPct),
      afterHoursTrafficSharePct: optionalNumber(afterHoursTrafficSharePct),
      voiceConversionPct: optionalNumber(voiceConversionPct),
      closeRatePct: optionalNumber(closeRatePct),
      planId: isValidPlanId(planId) ? planId : 'pro',
      billingCycle: billingCycle === 'annual' ? 'annual' : 'monthly'
    };

    const calculation = billingService.calculateRoi(params);
    res.json({
      status: 'success',
      result: calculation
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/subscribe
billingRouter.post('/subscribe', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { clientId, planId, billingCycle, email } = req.body;
    if (!clientId || !planId) {
      return res.status(400).json({ error: 'Missing required fields: clientId, planId' });
    }
    if (!isValidPlanId(planId)) {
      return res.status(400).json({
        error: `Unknown planId '${planId}'. Must be one of: ${VALID_PLAN_IDS.join(', ')}`
      });
    }

    const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
    const plan = billingService.getPlans().find((p) => p.id === planId);
    if (!plan) {
      return res.status(400).json({ error: `Unknown planId '${planId}'` });
    }

    // No payment provider means no checkout. Saying so beats the previous
    // behaviour of returning a Stripe-shaped session that charged nobody while
    // activating the plan anyway.
    if (!stripeService.isConfigured()) {
      return res.status(503).json({
        error: 'Billing is not configured on this server.',
        code: 'BILLING_UNCONFIGURED',
        message: 'Set STRIPE_SECRET_KEY to enable checkout.'
      });
    }

    const origin = req.header('origin') || process.env.CLIENT_URL || 'http://localhost:3000';
    const checkout = await stripeService.createCheckoutSession({
      tenantId: clientId,
      plan: {
        id: plan.id,
        name: plan.name,
        // The catalog is authored in dollars; Stripe bills in cents.
        priceMonthlyCents: Math.round(plan.priceMonthlyUsd * 100),
        priceAnnualMonthlyCents: Math.round(plan.priceAnnualMonthlyUsd * 100),
        minutesLimit: plan.voiceMinutesMonthly
      },
      billingCycle: cycle,
      successUrl: `${origin}/?checkout=success&plan=${planId}`,
      cancelUrl: `${origin}/?checkout=cancelled`,
      customerEmail: typeof email === 'string' ? email : undefined
    });

    if (!checkout.checkoutUrl) {
      return res.status(502).json({
        error: checkout.reason || 'Could not create a checkout session.',
        code: 'CHECKOUT_FAILED'
      });
    }

    res.json({
      status: 'success',
      // The plan is NOT active yet. It activates when Stripe confirms payment on
      // the webhook, which is the only source of truth for whether money moved.
      message: `Checkout session created for ${planId} (${cycle}). Subscription activates on payment confirmation.`,
      checkout: { checkoutUrl: checkout.checkoutUrl, sessionId: checkout.sessionId },
      testMode: stripeService.isTestMode()
    });
  } catch (err: any) {
    console.error('[Checkout Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/record-call
billingRouter.post('/record-call', requireApiKey, (req: Request, res: Response) => {
  try {
    const { clientId, durationSeconds, isAfterHours, leadCaptured, estimatedDealValueUsd } = req.body;
    if (!clientId || durationSeconds === undefined) {
      return res.status(400).json({ error: 'Missing clientId or durationSeconds' });
    }

    const duration = Number(durationSeconds);
    if (!Number.isFinite(duration) || duration < 0) {
      return res.status(400).json({ error: 'durationSeconds must be a non-negative number' });
    }

    // Deal value is only defaulted when genuinely absent. A caller-supplied 0 is a
    // real value (a disqualified lead) and must not be replaced by the default,
    // which would silently inflate the tenant's reported pipeline.
    let dealValue = 2997;
    if (estimatedDealValueUsd !== undefined && estimatedDealValueUsd !== null) {
      const parsed = Number(estimatedDealValueUsd);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res.status(400).json({ error: 'estimatedDealValueUsd must be a non-negative number' });
      }
      dealValue = parsed;
    }

    const updated = billingService.recordCallUsage(
      clientId,
      duration,
      isAfterHours !== undefined ? Boolean(isAfterHours) : true,
      Boolean(leadCaptured),
      dealValue
    );

    res.json({
      status: 'success',
      usage: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
