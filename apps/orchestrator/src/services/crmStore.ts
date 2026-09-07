import type { CRMLead, ChurnRiskMember, TurnTelemetry } from '@voice-os/shared';

class CRMStore {
  private leads: Map<string, CRMLead> = new Map();
  private members: Map<string, ChurnRiskMember> = new Map();
  private telemetryLogs: TurnTelemetry[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed test churn-risk members
    const testMembers: ChurnRiskMember[] = [
      {
        memberId: 'mem_101',
        fullName: 'Sarah Jenkins',
        email: 'sarah.j@example.com',
        tier: 'vip_mastermind',
        monthlyFee: 997,
        status: 'active',
        requiresManagerReview: false
      },
      {
        memberId: 'mem_102',
        fullName: 'David Vance',
        email: 'david.v@example.com',
        tier: 'pro',
        monthlyFee: 297,
        status: 'active',
        requiresManagerReview: false
      }
    ];

    testMembers.forEach((m) => this.members.set(m.memberId, m));
  }

  public getLeads(): CRMLead[] {
    return Array.from(this.leads.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public getMembers(): ChurnRiskMember[] {
    return Array.from(this.members.values());
  }

  public getTelemetry(): TurnTelemetry[] {
    return [...this.telemetryLogs];
  }

  public logTurn(telemetry: TurnTelemetry) {
    this.telemetryLogs.push(telemetry);
  }

  public createOrUpdateLead(data: {
    fullName: string;
    email: string;
    phone?: string;
    website?: string;
    linkedIn?: string;
    companyName?: string;
    businessSummary?: string;
    source: 'after_hours_inbound' | 'outbound_campaign' | 'web_callback';
  }): CRMLead {
    const existing = Array.from(this.leads.values()).find((l) => l.email.toLowerCase() === data.email.toLowerCase());
    const now = new Date().toISOString();

    if (existing) {
      existing.fullName = data.fullName || existing.fullName;
      existing.phone = data.phone || existing.phone;
      existing.website = data.website || existing.website;
      existing.linkedIn = data.linkedIn || existing.linkedIn;
      existing.companyName = data.companyName || existing.companyName;
      existing.businessSummary = data.businessSummary || existing.businessSummary;
      existing.source = data.source || existing.source;
      existing.updatedAt = now;
      existing.notes.push(`Updated via voice inbound on ${now}`);
      this.leads.set(existing.id, existing);
      return existing;
    }

    const newLead: CRMLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      website: data.website,
      linkedIn: data.linkedIn,
      companyName: data.companyName,
      businessSummary: data.businessSummary,
      source: data.source,
      qualificationScore: 20,
      status: 'new',
      notes: [`Created via voice agent on ${now}`],
      createdAt: now,
      updatedAt: now
    };

    this.leads.set(newLead.id, newLead);
    return newLead;
  }

  public qualifyLead(data: {
    email: string;
    budgetRange: string;
    coreNeed: string;
    authority?: string;
    timelineWeeks?: number;
  }): { lead: CRMLead | null; calculatedScore: number } {
    const lead = Array.from(this.leads.values()).find((l) => l.email.toLowerCase() === data.email.toLowerCase());
    if (!lead) return { lead: null, calculatedScore: 0 };

    lead.budgetRange = data.budgetRange;
    lead.coreNeed = data.coreNeed;
    lead.authority = data.authority || 'decision_maker';
    lead.timelineWeeks = data.timelineWeeks || 2;

    // Calculate BANT Score
    let score = 20; // base contact score
    if (data.budgetRange === 'above_15k') score += 40;
    else if (data.budgetRange === '5k_to_15k') score += 30;
    else if (data.budgetRange === '1k_to_5k') score += 15;

    if (lead.authority === 'decision_maker') score += 20;
    if (lead.timelineWeeks && lead.timelineWeeks <= 4) score += 20;

    lead.qualificationScore = Math.min(100, score);
    lead.status = lead.qualificationScore >= 60 ? 'inbound_qualified' : 'new';
    lead.updatedAt = new Date().toISOString();
    lead.notes.push(`BANT Qualified: score ${lead.qualificationScore}/100. Budget: ${data.budgetRange}`);

    this.leads.set(lead.id, lead);
    return { lead, calculatedScore: lead.qualificationScore };
  }

  public scheduleMeeting(data: {
    email: string;
    preferredDatetime: string;
    topic?: string;
  }): { success: boolean; lead: CRMLead | null; confirmationCode: string } {
    const lead = Array.from(this.leads.values()).find((l) => l.email.toLowerCase() === data.email.toLowerCase());
    if (!lead) return { success: false, lead: null, confirmationCode: '' };

    const confirmationCode = `GROWTH-${Math.floor(100000 + Math.random() * 900000)}`;
    lead.scheduledCallTime = data.preferredDatetime;
    lead.status = 'call_scheduled';
    lead.updatedAt = new Date().toISOString();
    lead.notes.push(`Consultation booked: ${data.preferredDatetime}. Code: ${confirmationCode}`);

    this.leads.set(lead.id, lead);
    return { success: true, lead, confirmationCode };
  }

  public processRetention(data: {
    memberId: string;
    churnReason: string;
    requestedAction: string;
    approvedDiscountPct: number;
    requiresManagerReview: boolean;
    bonusOffer?: string;
  }): ChurnRiskMember | null {
    const member = this.members.get(data.memberId);
    if (!member) return null;

    member.churnReason = data.churnReason;
    member.appliedDiscountPct = data.approvedDiscountPct;
    member.bonusOffer = data.bonusOffer;
    member.requiresManagerReview = data.requiresManagerReview;

    if (data.requestedAction === 'confirm_cancellation') {
      member.status = 'cancelled';
    } else {
      member.status = data.approvedDiscountPct > 0 ? 'saved' : 'retention_offered';
    }

    this.members.set(member.memberId, member);
    return member;
  }
}

export const crmStore = new CRMStore();
