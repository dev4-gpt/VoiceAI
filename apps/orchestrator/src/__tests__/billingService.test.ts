import { BillingService } from '../services/billingService';

describe('BillingService — SaaS Subscription & ROI Engine', () => {
  let service: BillingService;

  beforeEach(() => {
    service = new BillingService();
  });

  it('returns all 3 venture-scale subscription tiers with annual discount', () => {
    const plans = service.getPlans();
    expect(plans).toHaveLength(3);
    const planIds = plans.map((p) => p.id);
    expect(planIds).toEqual(['starter', 'pro', 'enterprise']);

    const pro = plans.find((p) => p.id === 'pro')!;
    expect(pro.priceMonthlyUsd).toBe(397);
    expect(pro.priceAnnualMonthlyUsd).toBe(317);
    expect(pro.voiceMinutesMonthly).toBe(2500);
    expect(pro.recommended).toBe(true);
  });

  it('tracks client usage and initializes unknown clients with pro defaults', () => {
    const usage = service.getClientUsage('test_client_42', 'NovaTech');
    expect(usage.clientId).toBe('test_client_42');
    expect(usage.companyName).toBe('NovaTech');
    expect(usage.planId).toBe('pro');
    expect(usage.minutesUsed).toBe(0);
    expect(usage.minutesLimit).toBe(2500);
  });

  it('records call usage, after-hours leads, and recalculates ROI multiple', () => {
    const initial = service.getClientUsage('lead_jm_901');
    const initialMinutes = initial.minutesUsed;
    const initialLeads = initial.afterHoursLeadsCaptured;
    const initialPipeline = initial.pipelineGeneratedUsd;

    const updated = service.recordCallUsage('lead_jm_901', 180, true, true, 3000);
    expect(updated.minutesUsed).toBe(initialMinutes + 3);
    expect(updated.afterHoursLeadsCaptured).toBe(initialLeads + 1);
    expect(updated.pipelineGeneratedUsd).toBe(initialPipeline + 3000);
    expect(updated.estimatedRoiMultiplier).toBeGreaterThan(0);
  });

  it('accurately computes interactive ROI metrics and after-hours pipeline gain', () => {
    const roi = service.calculateRoi({
      monthlyTraffic: 10000,
      averageContractValueUsd: 5000,
      currentConversionPct: 0.8,
      afterHoursTrafficSharePct: 32
    });

    expect(roi.monthlyTraffic).toBe(10000);
    expect(roi.averageContractValueUsd).toBe(5000);
    // 32% of 10000 = 3200 after-hours visitors
    expect(roi.afterHoursVisitors).toBe(3200);
    // 4.5% conversion of 3200 = 144 spoken leads
    expect(roi.expectedSpokenLeadsMonthly).toBe(144);
    // Baseline 0.8% of 3200 = 26 static form leads
    expect(roi.staticFormBaselineLeadsMonthly).toBe(26);
    expect(roi.incrementalLeadsMonthly).toBe(118);
    expect(roi.grossPipelineGeneratedUsd).toBe(144 * 5000);
    expect(roi.estimatedRoiMultiple).toBeGreaterThan(50);
  });

  describe('subscription activation', () => {
    // The previous test here asserted that simulateCheckout returned a
    // `cs_`-prefixed id and a checkout.growthvoice.os URL with status 'active' —
    // it locked in a fabricated payment. Activation now requires a
    // signature-verified Stripe webhook, which is the only thing that knows
    // whether money actually moved.

    const webhookState = (overrides: Record<string, unknown> = {}) => ({
      tenantId: 'test_client_checkout',
      planId: 'enterprise',
      billingCycle: 'annual',
      status: 'active',
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: 'sub_test123',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      ...overrides
    });

    it('activates the plan when Stripe confirms payment', async () => {
      await service.applySubscriptionState(webhookState() as any);

      const client = service.getClientUsage('test_client_checkout');
      expect(client.planId).toBe('enterprise');
      expect(client.billingCycle).toBe('annual');
      expect(client.minutesLimit).toBe(10000);
      expect(client.subscriptionStatus).toBe('active');
      expect(client.stripeSubscriptionId).toBe('sub_test123');
    });

    it('grants no minutes when the subscription is not in a paying state', async () => {
      // past_due and canceled customers must lose their allowance, or a failed
      // payment would still buy a month of voice minutes.
      for (const status of ['past_due', 'canceled', 'incomplete', 'unpaid']) {
        await service.applySubscriptionState(webhookState({ tenantId: `t_${status}`, status }) as any);
        expect(service.getClientUsage(`t_${status}`).minutesLimit).toBe(0);
      }
    });

    it('grants minutes while trialing', async () => {
      await service.applySubscriptionState(webhookState({ tenantId: 't_trial', status: 'trialing' }) as any);
      expect(service.getClientUsage('t_trial').minutesLimit).toBe(10000);
    });

    it('ignores a webhook naming an unknown plan rather than defaulting one', async () => {
      await service.applySubscriptionState(
        webhookState({ tenantId: 't_unknown', planId: 'free-forever' }) as any
      );
      // Must not silently provision a paid tier for a plan that does not exist.
      expect(service.getClientUsage('t_unknown').planId).not.toBe('free-forever');
      expect(service.getClientUsage('t_unknown').subscriptionStatus).toBeUndefined();
    });
  });
});
