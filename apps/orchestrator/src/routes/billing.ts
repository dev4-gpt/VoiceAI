import { Router, Request, Response } from 'express';
import { billingService } from '../services/billingService';
import { requireApiKey } from '../middleware/auth';
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
    const { monthlyTraffic, averageContractValueUsd, currentConversionPct, afterHoursTrafficSharePct } = req.body;
    const params: ROIParameters = {
      monthlyTraffic: Number(monthlyTraffic) || 5000,
      averageContractValueUsd: Number(averageContractValueUsd) || 3500,
      currentConversionPct: currentConversionPct !== undefined ? Number(currentConversionPct) : 0.8,
      afterHoursTrafficSharePct: afterHoursTrafficSharePct !== undefined ? Number(afterHoursTrafficSharePct) : 32
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
billingRouter.post('/subscribe', requireApiKey, (req: Request, res: Response) => {
  try {
    const { clientId, planId, billingCycle } = req.body;
    if (!clientId || !planId) {
      return res.status(400).json({ error: 'Missing required fields: clientId, planId' });
    }
    if (!isValidPlanId(planId)) {
      return res.status(400).json({
        error: `Unknown planId '${planId}'. Must be one of: ${VALID_PLAN_IDS.join(', ')}`
      });
    }

    const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
    const checkout = billingService.simulateCheckout(clientId, planId, cycle);

    res.json({
      status: 'success',
      message: `Successfully updated subscription to plan ${planId} (${cycle})`,
      checkout
    });
  } catch (err: any) {
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
