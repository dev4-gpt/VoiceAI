import { Router, Request, Response } from 'express';
import { billingService } from '../services/billingService';
import type { SubscriptionTierId, ROIParameters } from '@voice-os/shared';

export const billingRouter = Router();

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
billingRouter.get('/usage/:clientId', (req: Request, res: Response) => {
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
billingRouter.post('/subscribe', (req: Request, res: Response) => {
  try {
    const { clientId, planId, billingCycle } = req.body;
    if (!clientId || !planId) {
      return res.status(400).json({ error: 'Missing required fields: clientId, planId' });
    }

    const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
    const checkout = billingService.simulateCheckout(clientId, planId as SubscriptionTierId, cycle);

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
billingRouter.post('/record-call', (req: Request, res: Response) => {
  try {
    const { clientId, durationSeconds, isAfterHours, leadCaptured, estimatedDealValueUsd } = req.body;
    if (!clientId || durationSeconds === undefined) {
      return res.status(400).json({ error: 'Missing clientId or durationSeconds' });
    }

    const updated = billingService.recordCallUsage(
      clientId,
      Number(durationSeconds),
      isAfterHours !== undefined ? Boolean(isAfterHours) : true,
      Boolean(leadCaptured),
      estimatedDealValueUsd ? Number(estimatedDealValueUsd) : 2997
    );

    res.json({
      status: 'success',
      usage: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
