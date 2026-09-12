import { resolveTenantId, upsertSubscription } from '../db/repository';
import type {
  SubscriptionPlan,
  SubscriptionTierId,
  ClientUsageTelemetry,
  ROIParameters,
  ROICalculationResult
} from '@voice-os/shared';

/**
 * Plan catalog — the single source of truth. The pricing page fetches this from
 * GET /api/billing/plans rather than hardcoding prices, so the two cannot drift.
 *
 * Priced from real cost. AssemblyAI's Voice Agent API is $4.50/hour all-in
 * ($0.075/min: speech recognition, LLM, voice, turn detection, tool calling), plus
 * Stripe's 2.9% + $0.30. Each tier holds ~72% gross margin monthly (~66% annual)
 * even if a customer uses every included minute; typical usage is lower, so real
 * margins run higher. Overage never sells below cost: 72% / 67% / 60%.
 *
 * An earlier catalog costed minutes at the $0.0025/min streaming-STT rate, which is
 * not what the product runs on, and claimed 87-93% margins. Those were wrong.
 *
 * Features list only what the code does today. Anything not yet built is left out
 * rather than promised.
 */
export const COST_PER_VOICE_MINUTE_USD = 0.075;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'One voice agent answering your website around the clock',
    priceMonthlyUsd: 149,
    priceAnnualMonthlyUsd: 119,
    voiceMinutesMonthly: 500,
    overageRatePerMinUsd: 0.3,
    maxAutonomousAgents: 1,
    features: [
      '1 voice agent persona',
      '500 voice minutes / month, then $0.30/min',
      'Live lead capture and BANT qualification into your CRM',
      'Consultation requests recorded on each lead',
      'US AI-disclosure and recording-consent layer',
      'Embeddable website voice widget'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Voice qualification plus the content pipeline and CRM tooling',
    priceMonthlyUsd: 449,
    priceAnnualMonthlyUsd: 359,
    voiceMinutesMonthly: 1500,
    overageRatePerMinUsd: 0.25,
    maxAutonomousAgents: 3,
    recommended: true,
    features: [
      'Everything in Starter',
      '3 configurable agent personas (e.g. inbound SDR, churn rescue)',
      '1,500 voice minutes / month, then $0.25/min',
      'Content pipeline: conversations into X, LinkedIn and Substack drafts',
      'Publishes live once you connect your accounts',
      'Encrypted storage for your platform credentials',
      'Obsidian vault export of leads and dossiers'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For agencies running voice for several brands',
    priceMonthlyUsd: 1497,
    priceAnnualMonthlyUsd: 1197,
    voiceMinutesMonthly: 5000,
    overageRatePerMinUsd: 0.2,
    maxAutonomousAgents: 999,
    features: [
      'Everything in Pro',
      'Unlimited agent personas',
      '5,000 voice minutes / month, then $0.20/min',
      'Separate credentials and vault exports per client brand',
      'Enforced discount ceilings on retention offers',
      'Priority onboarding'
    ]
  }
];

export class BillingService {
  private clientUsageMap: Map<string, ClientUsageTelemetry> = new Map();

  constructor() {
    this.seedDefaultUsage();
  }

  /**
   * Demo clients so the dashboard renders. Usage starts at zero: live calls do not
   * meter yet, and the previous seed invented activity ($56,943 pipeline, 18.8x ROI,
   * 412 minutes) that the header displayed as if it were real.
   */
  private seedDefaultUsage() {
    const now = new Date();
    const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const seed = (clientId: string, companyName: string, planId: SubscriptionTierId, cycle: 'monthly' | 'annual') => {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)!;
      this.clientUsageMap.set(clientId, {
        clientId,
        companyName,
        planId,
        billingCycle: cycle,
        billingCycleStart: cycleStart,
        billingCycleEnd: cycleEnd,
        minutesUsed: 0,
        minutesLimit: plan.voiceMinutesMonthly,
        callsCount: 0,
        afterHoursLeadsCaptured: 0,
        pipelineGeneratedUsd: 0,
        cacSavedUsd: 0,
        estimatedRoiMultiplier: 0
      });
    };

    seed('lead_jm_901', 'DesignAcademy Studio', 'pro', 'annual');
    seed('acme_growth', 'Acme SaaS', 'starter', 'monthly');
  }

  public getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  public getClientUsage(clientId: string, companyName?: string): ClientUsageTelemetry {
    if (!this.clientUsageMap.has(clientId)) {
      const now = new Date();
      const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const newUsage: ClientUsageTelemetry = {
        clientId,
        companyName: companyName || clientId,
        // Not entitled to anything until Stripe confirms a subscription. This used
        // to auto-provision any unknown id as Pro with 2,500 minutes.
        planId: 'starter',
        billingCycle: 'monthly',
        billingCycleStart: cycleStart,
        billingCycleEnd: cycleEnd,
        minutesUsed: 0,
        minutesLimit: 0,
        callsCount: 0,
        afterHoursLeadsCaptured: 0,
        pipelineGeneratedUsd: 0,
        cacSavedUsd: 0,
        estimatedRoiMultiplier: 0
      };
      this.clientUsageMap.set(clientId, newUsage);
    }
    return this.clientUsageMap.get(clientId)!;
  }

  public recordCallUsage(
    clientId: string,
    durationSeconds: number,
    isAfterHours: boolean = true,
    leadCaptured: boolean = false,
    estimatedDealValueUsd: number = 2997
  ): ClientUsageTelemetry {
    const usage = this.getClientUsage(clientId);
    const addedMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
    usage.minutesUsed += addedMinutes;
    usage.callsCount += 1;

    if (isAfterHours) {
      usage.afterHoursLeadsCaptured += leadCaptured ? 1 : 0;
    }

    if (leadCaptured) {
      usage.pipelineGeneratedUsd += estimatedDealValueUsd;
      // Approximate human SDR / agency CAC savings ($250 per qualified booked meeting)
      usage.cacSavedUsd += 250;
    }

    this.clientUsageMap.set(clientId, usage);
    return usage;
  }

  public updateSubscription(
    clientId: string,
    planId: SubscriptionTierId,
    billingCycle: 'monthly' | 'annual' = 'monthly'
  ): ClientUsageTelemetry {
    const usage = this.getClientUsage(clientId);
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1];

    usage.planId = planId;
    usage.billingCycle = billingCycle;
    usage.minutesLimit = plan.voiceMinutesMonthly;

    this.clientUsageMap.set(clientId, usage);
    return usage;
  }

  /**
   * Worked ROI model. Every output derives from assumptions the caller controls and
   * which are echoed back; nothing here is a measured outcome.
   *
   * Corrects the previous version, which valued every voice lead as pipeline
   * (including ones the contact form would have caught anyway), applied no close
   * rate, divided pipeline by software cost as if pipeline were revenue, and
   * hardcoded the plan price — together overstating ROI by roughly the inverse of
   * the close rate.
   *
   * Lead with `breakEvenDealsPerMonth` when presenting this: it depends only on
   * plan price and contract value, not on the unmeasured conversion assumptions.
   */
  public calculateRoi(params: ROIParameters): ROICalculationResult {
    const pct = (value: number | undefined, fallback: number) =>
      Math.min(100, Math.max(0, Number.isFinite(value as number) ? (value as number) : fallback));

    const traffic = Math.max(100, params.monthlyTraffic || 5000);
    const acv = Math.max(100, params.averageContractValueUsd || 3500);
    const afterHoursPct = pct(params.afterHoursTrafficSharePct, 32);
    const baselinePct = pct(params.currentConversionPct, 0.8);
    const voicePct = pct(params.voiceConversionPct, 4.5);
    const closeRatePct = pct(params.closeRatePct, 20);

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === (params.planId || 'pro')) || SUBSCRIPTION_PLANS[1];
    const planCostMonthlyUsd =
      params.billingCycle === 'annual' ? plan.priceAnnualMonthlyUsd : plan.priceMonthlyUsd;

    const afterHoursVisitors = Math.round(traffic * (afterHoursPct / 100));
    const staticFormBaselineLeads = Math.round(afterHoursVisitors * (baselinePct / 100));
    const expectedSpokenLeads = Math.round(afterHoursVisitors * (voicePct / 100));
    const incrementalLeads = Math.max(0, expectedSpokenLeads - staticFormBaselineLeads);

    const incrementalPipelineUsd = incrementalLeads * acv;
    const incrementalClosedDeals = Math.round(incrementalLeads * (closeRatePct / 100) * 10) / 10;
    const incrementalRevenueUsd = Math.round(incrementalClosedDeals * acv);
    const netRevenueGainUsd = incrementalRevenueUsd - planCostMonthlyUsd;
    const estimatedRoiMultiple =
      planCostMonthlyUsd > 0 ? Math.round((incrementalRevenueUsd / planCostMonthlyUsd) * 10) / 10 : 0;

    const breakEvenDealsPerMonth = Math.round((planCostMonthlyUsd / acv) * 100) / 100;
    const monthsPerDealToBreakEven =
      planCostMonthlyUsd > 0 ? Math.round((acv / planCostMonthlyUsd) * 10) / 10 : 0;

    return {
      monthlyTraffic: traffic,
      averageContractValueUsd: acv,
      afterHoursVisitors,
      expectedSpokenLeadsMonthly: expectedSpokenLeads,
      staticFormBaselineLeadsMonthly: staticFormBaselineLeads,
      incrementalLeadsMonthly: incrementalLeads,
      incrementalPipelineUsd,
      incrementalClosedDealsMonthly: incrementalClosedDeals,
      incrementalRevenueUsd,
      netRevenueGainUsd,
      planCostMonthlyUsd,
      estimatedRoiMultiple,
      breakEvenDealsPerMonth,
      monthsPerDealToBreakEven,
      assumptions: {
        afterHoursTrafficSharePct: afterHoursPct,
        currentConversionPct: baselinePct,
        voiceConversionPct: voicePct,
        closeRatePct
      }
    };
  }

  /**
   * Applies subscription state from a signature-verified Stripe webhook.
   *
   * This is the only path that may activate a paid plan. The previous
   * `simulateCheckout` activated it locally and returned a fabricated Stripe-
   * shaped session, so a plan could go "active" with no payment anywhere.
   * Activation now requires Stripe to confirm the money moved.
   */
  public async applySubscriptionState(state: {
    tenantId: string;
    planId: string | null;
    billingCycle: string | null;
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
  }): Promise<void> {
    const planId = (state.planId as SubscriptionTierId) || 'starter';
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      console.warn(`[Billing] Webhook referenced unknown plan '${state.planId}'; ignoring.`);
      return;
    }

    const cycle = state.billingCycle === 'annual' ? 'annual' : 'monthly';
    // Only a paying status grants the plan's minutes. A past_due or canceled
    // subscription must not keep its allowance.
    const isEntitled = state.status === 'active' || state.status === 'trialing';
    const minutesLimit = isEntitled ? plan.voiceMinutesMonthly : 0;

    this.updateSubscription(state.tenantId, planId, cycle);

    const usage = this.getClientUsage(state.tenantId);
    usage.planId = planId;
    usage.subscriptionStatus = state.status;
    usage.minutesLimit = minutesLimit;
    usage.stripeCustomerId = state.stripeCustomerId || usage.stripeCustomerId;
    usage.stripeSubscriptionId = state.stripeSubscriptionId || usage.stripeSubscriptionId;

    // Persist. A payment confirmation that only reaches memory is worse than
    // useless: the customer is charged and the entitlement disappears on the
    // next restart. Failing to write must therefore be loud, not swallowed.
    const tenantId = await resolveTenantId(state.tenantId);
    if (tenantId) {
      await upsertSubscription(tenantId, {
        planId,
        billingCycle: cycle,
        status: state.status,
        stripeCustomerId: state.stripeCustomerId,
        stripeSubscriptionId: state.stripeSubscriptionId,
        minutesLimit,
        currentPeriodStart: state.currentPeriodStart,
        currentPeriodEnd: state.currentPeriodEnd
      });
    } else {
      console.warn(
        `[Billing] No database configured — subscription for ${state.tenantId} is in memory only and will be lost on restart.`
      );
    }
  }
}

export const billingService = new BillingService();
