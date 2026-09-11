import type {
  SubscriptionPlan,
  SubscriptionTierId,
  ClientUsageTelemetry,
  ROIParameters,
  ROICalculationResult
} from '@voice-os/shared';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter Operator',
    tagline: 'Autonomous 24/7 Inbound SDR qualification & instant booking',
    priceMonthlyUsd: 149,
    priceAnnualMonthlyUsd: 119,
    voiceMinutesMonthly: 500,
    overageRatePerMinUsd: 0.18,
    maxAutonomousAgents: 1,
    features: [
      '1 Autonomous Inbound SDR Voice Agent',
      '500 High-Fidelity Voice Minutes / mo',
      'Real-Time BANT Qualification & CRM Kanban Sync',
      'Automated Strategy Consultation Calendar Booking',
      'Deterministic Policy Margin Clamps & Guardrails',
      'Standard Web Audio Floating Pill',
      'Community & Discord Support'
    ]
  },
  {
    id: 'pro',
    name: 'Growth Engine Pro',
    tagline: 'The full autonomous growth stack: SDR, Churn Save & Content Factory',
    priceMonthlyUsd: 397,
    priceAnnualMonthlyUsd: 317,
    voiceMinutesMonthly: 2500,
    overageRatePerMinUsd: 0.14,
    maxAutonomousAgents: 3,
    recommended: true,
    features: [
      '3 Autonomous Voice Agents (Inbound SDR, Outbound Reactivator, Churn Rescue)',
      '2,500 Spoken Voice Minutes / mo',
      'Sub-350ms Barge-In Interruption Latency',
      'Autonomous Hermes Content Factory (Auto-Publish to X, LinkedIn, Substack)',
      'Local Obsidian Vault Bi-Directional Graph Sync',
      'Custom Brand Voice DNA & Anti-Slop Guardrail',
      '6-Mode 3D Glassy Voice Reactor Suite (Cymatic Plane default)',
      '1-Click Embeddable Web Widget (embed.js)',
      'Priority Email & Telegram Architect Support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Sovereign Enterprise',
    tagline: 'Custom voice clones, multi-client credential isolation & SLA guarantees',
    priceMonthlyUsd: 1497,
    priceAnnualMonthlyUsd: 1197,
    voiceMinutesMonthly: 10000,
    overageRatePerMinUsd: 0.1,
    maxAutonomousAgents: 999,
    features: [
      'Unlimited Autonomous Voice Agents & Custom Voice Clone Tuning',
      '10,000 Spoken Voice Minutes / mo + Volume Discounts',
      'Multi-Client Isolated Encrypted Credential Vaults',
      'Custom Legal Compliance & Financial Margin Clamps',
      'Dedicated Cloud Workers / Docker Pods',
      'Native CRM Webhooks (Salesforce, HubSpot, Zapier, Slack)',
      'Deterministic Zero-Data Retention Guarantee',
      '24/7 Dedicated Solutions Architect & 99.9% Uptime SLA'
    ]
  }
];

export class BillingService {
  private clientUsageMap: Map<string, ClientUsageTelemetry> = new Map();

  constructor() {
    this.seedDefaultUsage();
  }

  private seedDefaultUsage() {
    const now = new Date();
    const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Seed DesignAcademy Studio (Pro Plan)
    this.clientUsageMap.set('lead_jm_901', {
      clientId: 'lead_jm_901',
      companyName: 'DesignAcademy Studio',
      planId: 'pro',
      billingCycle: 'annual',
      billingCycleStart: cycleStart,
      billingCycleEnd: cycleEnd,
      minutesUsed: 412,
      minutesLimit: 2500,
      callsCount: 68,
      afterHoursLeadsCaptured: 19,
      pipelineGeneratedUsd: 56943,
      cacSavedUsd: 4750,
      estimatedRoiMultiplier: 18.8
    });

    // Seed Acme Growth (Starter Plan)
    this.clientUsageMap.set('acme_growth', {
      clientId: 'acme_growth',
      companyName: 'Acme SaaS',
      planId: 'starter',
      billingCycle: 'monthly',
      billingCycleStart: cycleStart,
      billingCycleEnd: cycleEnd,
      minutesUsed: 148,
      minutesLimit: 500,
      callsCount: 22,
      afterHoursLeadsCaptured: 7,
      pipelineGeneratedUsd: 18500,
      cacSavedUsd: 1750,
      estimatedRoiMultiplier: 12.4
    });
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
        planId: 'pro',
        billingCycle: 'monthly',
        billingCycleStart: cycleStart,
        billingCycleEnd: cycleEnd,
        minutesUsed: 0,
        minutesLimit: 2500,
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

    // Recalculate ROI multiplier
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === usage.planId) || SUBSCRIPTION_PLANS[1];
    const planCost = usage.billingCycle === 'annual' ? plan.priceAnnualMonthlyUsd : plan.priceMonthlyUsd;
    if (planCost > 0 && usage.pipelineGeneratedUsd > 0) {
      usage.estimatedRoiMultiplier = Number((usage.pipelineGeneratedUsd / planCost).toFixed(1));
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

    const planCost = billingCycle === 'annual' ? plan.priceAnnualMonthlyUsd : plan.priceMonthlyUsd;
    if (planCost > 0 && usage.pipelineGeneratedUsd > 0) {
      usage.estimatedRoiMultiplier = Number((usage.pipelineGeneratedUsd / planCost).toFixed(1));
    }

    this.clientUsageMap.set(clientId, usage);
    return usage;
  }

  public calculateRoi(params: ROIParameters): ROICalculationResult {
    const traffic = Math.max(100, params.monthlyTraffic || 5000);
    const acv = Math.max(100, params.averageContractValueUsd || 3500);
    const baselineConversionPct = params.currentConversionPct ?? 0.8; // 0.8% typical form completion
    const afterHoursPct = params.afterHoursTrafficSharePct ?? 32; // 32% after-hours web traffic

    const afterHoursVisitors = Math.round(traffic * (afterHoursPct / 100));

    // Static form baseline: only converts ~0.8% of after-hours traffic because users drop off
    const staticFormBaselineLeads = Math.round(afterHoursVisitors * (baselineConversionPct / 100));

    // Spoken conversational Voice AI conversion rate: ~4.5% of after-hours visitors speak & qualify
    const expectedSpokenLeads = Math.round(afterHoursVisitors * 0.045);

    const incrementalLeads = Math.max(0, expectedSpokenLeads - staticFormBaselineLeads);
    const grossPipelineGeneratedUsd = expectedSpokenLeads * acv;
    
    // Pro Plan monthly price
    const growthOsCostMonthlyUsd = 397;
    const netRevenueGainUsd = grossPipelineGeneratedUsd - growthOsCostMonthlyUsd;
    const estimatedRoiMultiple = Number((grossPipelineGeneratedUsd / growthOsCostMonthlyUsd).toFixed(1));
    
    // CAC savings ($250 per qualified lead that doesn't need paid retargeting or human SDR dialer)
    const cacSavedUsd = expectedSpokenLeads * 250;

    return {
      monthlyTraffic: traffic,
      averageContractValueUsd: acv,
      afterHoursVisitors,
      expectedSpokenLeadsMonthly: expectedSpokenLeads,
      staticFormBaselineLeadsMonthly: staticFormBaselineLeads,
      incrementalLeadsMonthly: incrementalLeads,
      grossPipelineGeneratedUsd,
      netRevenueGainUsd,
      growthOsCostMonthlyUsd,
      estimatedRoiMultiple,
      cacSavedUsd
    };
  }

  public simulateCheckout(
    clientId: string,
    planId: SubscriptionTierId,
    billingCycle: 'monthly' | 'annual'
  ): { checkoutUrl: string; sessionId: string; status: string } {
    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1];
    const amountUsd = billingCycle === 'annual' ? plan.priceAnnualMonthlyUsd * 12 : plan.priceMonthlyUsd;

    // In a live production environment, this delegates to Stripe Checkout Session API.
    // For the hackathon sandbox, it returns a deterministic session token and self-activates.
    this.updateSubscription(clientId, planId, billingCycle);

    return {
      checkoutUrl: `https://checkout.growthvoice.os/pay/${sessionId}?plan=${planId}&cycle=${billingCycle}&amount=${amountUsd}`,
      sessionId,
      status: 'active'
    };
  }
}

export const billingService = new BillingService();
