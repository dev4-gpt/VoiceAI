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

  it('simulates instantaneous checkout activation with valid URL', () => {
    const res = service.simulateCheckout('test_client_checkout', 'enterprise', 'annual');
    expect(res.status).toBe('active');
    expect(res.checkoutUrl).toContain('checkout.growthvoice.os');
    expect(res.sessionId).toMatch(/^cs_/);

    const client = service.getClientUsage('test_client_checkout');
    expect(client.planId).toBe('enterprise');
    expect(client.billingCycle).toBe('annual');
    expect(client.minutesLimit).toBe(10000);
  });
});
