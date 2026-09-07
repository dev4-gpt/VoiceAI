import type { CRMLead, ChurnRiskMember, TurnTelemetry } from '@voice-os/shared';
import * as fs from 'fs';
import * as path from 'path';
import { graphDatabaseService } from './graphDatabaseService';

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

    // Seed realistic archetype lead with social links and bio
    const now = new Date().toISOString();
    const demoLead: CRMLead = {
      id: 'lead_jm_901',
      fullName: 'Jason Miller',
      email: 'jason.m@designacademy.io',
      phone: '+1 (555) 438-9201',
      website: 'https://designacademy.io',
      linkedIn: 'https://linkedin.com/in/jasonmiller-design',
      socialLinks: {
        twitter: 'https://x.com/jasonmiller_ui',
        linkedin: 'https://linkedin.com/in/jasonmiller-design',
        youtube: 'https://youtube.com/@designacademy_io',
        instagram: 'https://instagram.com/designacademy.studio',
        substack: 'https://jasonmiller.substack.com'
      },
      socialBioText:
        'Founder of DesignAcademy.io (15k UI/UX designer community, 120k newsletter readers). Transitioning from $47 ebook sales into high-ticket $2,997 Pro Career Sprints and $10k/mo agency retainers. Needs 24/7 after-hours voice qualification to handle European and Asian inbound leads.',
      companyName: 'DesignAcademy Studio',
      businessSummary: '15k community members, $47-$2,997 product suite, expanding into enterprise design sprints',
      source: 'after_hours_inbound',
      budgetRange: '5k_to_15k',
      coreNeed: 'Automate 24/7 after-hours inbound qualification & reduce lead dropoff',
      authority: 'decision_maker',
      timelineWeeks: 3,
      qualificationScore: 85,
      status: 'inbound_qualified',
      scheduledCallTime: 'Tomorrow at 2:00 PM EST',
      notes: [
        'Voice Agent (Anna) qualified lead via 24/7 inbound channel.',
        'Budget confirmed: $5,000 - $15,000. Core need: after-hours qualification for international timezones.',
        'Social Footprint Analyzed: 120k Substack + 15k Community. High-intent founder archetype.'
      ],
      createdAt: now,
      updatedAt: now
    };
    this.leads.set(demoLead.id, demoLead);
    this.syncLeadToVault(demoLead);
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
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      youtube?: string;
      instagram?: string;
      substack?: string;
      tiktok?: string;
      podcast?: string;
      other?: string;
    };
    socialBioText?: string;
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
      if (data.socialLinks) existing.socialLinks = { ...existing.socialLinks, ...data.socialLinks };
      if (data.socialBioText) existing.socialBioText = data.socialBioText;
      existing.companyName = data.companyName || existing.companyName;
      existing.businessSummary = data.businessSummary || existing.businessSummary;
      existing.source = data.source || existing.source;
      existing.updatedAt = now;
      existing.notes.push(`Updated via voice inbound on ${now}`);
      this.leads.set(existing.id, existing);
      this.syncLeadToVault(existing);
      return existing;
    }

    const newLead: CRMLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      website: data.website,
      linkedIn: data.linkedIn,
      socialLinks: data.socialLinks,
      socialBioText: data.socialBioText,
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
    this.syncLeadToVault(newLead);
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
    this.syncLeadToVault(lead);
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
    this.syncLeadToVault(lead);
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

  public syncLeadToVault(lead: CRMLead) {
    try {
      const vaultBase = path.resolve(process.cwd(), 'vault');
      const safeFolder = (lead.companyName || lead.fullName || 'Client')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');
      const clientDir = path.join(vaultBase, 'Clients', safeFolder);
      const dossiersDir = path.join(vaultBase, 'Dossiers');
      const leadsDir = path.join(vaultBase, 'Leads');

      if (!fs.existsSync(clientDir)) fs.mkdirSync(clientDir, { recursive: true });
      if (!fs.existsSync(dossiersDir)) fs.mkdirSync(dossiersDir, { recursive: true });
      if (!fs.existsSync(leadsDir)) fs.mkdirSync(leadsDir, { recursive: true });

      const nowStr = new Date().toISOString();
      const socialLinksList = lead.socialLinks
        ? Object.entries(lead.socialLinks)
            .filter(([_, url]) => Boolean(url))
            .map(([platform, url]) => `* **${platform.toUpperCase()}:** [${url}](${url})`)
            .join('\n')
        : '* *No direct social links configured.*';

      const notesList = lead.notes && lead.notes.length > 0
        ? lead.notes.map((n) => `* ${n}`).join('\n')
        : '* *Initial dossier created via Voice AI Operator.*';

      const dossierContent = `---
id: "${lead.id}"
title: "${lead.fullName} — ${lead.companyName || 'Client Dossier'}"
type: "ClientDossier"
clientName: "${lead.fullName}"
companyName: "${lead.companyName || 'Independent'}"
email: "${lead.email}"
phone: "${lead.phone || 'N/A'}"
website: "${lead.website || 'N/A'}"
linkedIn: "${lead.linkedIn || 'N/A'}"
budgetRange: "${lead.budgetRange || 'unspecified'}"
qualificationScore: ${lead.qualificationScore}
status: "${lead.status}"
updatedAt: "${nowStr}"
tags:
  - client-dossier
  - revenue-os
  - voice-ai
  - assemblyai
---

# 👤 Client & Business Dossier: ${lead.fullName}
**Organization / Community:** ${lead.companyName || 'Independent Creator'}  
**Primary Contact:** [${lead.email}](mailto:${lead.email}) • ${lead.phone || 'Phone Pending'}  
**Official Website:** [${lead.website || 'N/A'}](${lead.website || '#'})  
**LinkedIn:** [${lead.linkedIn || 'N/A'}](${lead.linkedIn || '#'})  

> [!info] Autonomous Dossier Synchronization
> This file is automatically maintained by **GrowthVoice OS** and synced into active RAG memory for the **AssemblyAI Voice Agent (Anna)**.

---

## 🌐 Multi-Platform Social Footprint
${socialLinksList}

---

## 📝 Audience Context & Strategic Bio Analysis
${lead.socialBioText || lead.businessSummary || '*No bio context provided yet.*'}

---

## 🎯 High-Ticket Growth Objectives & Core Needs
* **Core Problem / Objective:** ${lead.coreNeed || 'Scale high-ticket inbound funnel and automate 24/7 after-hours qualification.'}
* **Business Summary:** ${lead.businessSummary || 'Scaling educational or coaching community into high-ticket cohorts.'}
* **Purchasing Authority:** \`${lead.authority || 'Decision Maker'}\`
* **Target Budget Range:** \`${lead.budgetRange || '$5,000 - $15,000'}\`
* **Implementation Timeline:** \`${lead.timelineWeeks || 2} Weeks\`
* **Scheduled Strategy Consultation:** \`${lead.scheduledCallTime || 'Pending Call Booking'}\`

---

## 📊 BANT Qualification Status
* **Qualification Fit Score:** **${lead.qualificationScore} / 100**
* **Pipeline Stage:** \`${lead.status.toUpperCase()}\`
* **Recommendation:** ${
        lead.qualificationScore >= 75
          ? 'Fast-track to Elite Mastermind / Dedicated Growth Operator.'
          : lead.qualificationScore >= 60
          ? 'Qualifies for Pro Mentorship Sprint ($2,997).'
          : 'Recommend Self-Paced Growth Sprint ($997).'
      }

---

## 💬 Real-Time Activity Log & Voice Transcripts
${notesList}

---

## 🔗 Bidirectional Vault Links
- [[../../Index|← Return to Vault Map of Content]]
- [[../../Content-Packs/pack_cf_101|Associated Content Marketing Pack]]
`;

      const dossierPath = path.join(clientDir, 'Dossier.md');
      fs.writeFileSync(dossierPath, dossierContent, 'utf-8');

      // Also write convenience link in vault/Dossiers/
      const topLevelDossierPath = path.join(dossiersDir, `${safeFolder}.md`);
      fs.writeFileSync(topLevelDossierPath, dossierContent, 'utf-8');

      // Also write in vault/Leads/ for backwards compatibility
      const leadPath = path.join(leadsDir, `${lead.id}.md`);
      fs.writeFileSync(leadPath, dossierContent, 'utf-8');

      // Update Node in Graph Database
      graphDatabaseService.addNode({
        id: lead.id,
        type: 'Lead',
        label: `${lead.fullName} (${lead.companyName || 'Independent'})`,
        properties: {
          email: lead.email,
          phone: lead.phone || 'N/A',
          website: lead.website || 'N/A',
          companyName: lead.companyName || 'N/A',
          budgetRange: lead.budgetRange || 'unspecified',
          qualificationScore: lead.qualificationScore,
          status: lead.status,
          vaultPath: `vault/Clients/${safeFolder}/Dossier.md`
        }
      });

      // Update vault/Index.md to list new client
      this.updateVaultIndex(safeFolder, lead);

      console.log(`[CRM Store] Successfully synced ${lead.fullName} to vault/Clients/${safeFolder}/Dossier.md`);
    } catch (err: any) {
      console.error('[CRM Store Vault Sync Error]', err.message);
    }
  }

  private updateVaultIndex(safeFolder: string, lead: CRMLead) {
    try {
      const indexPath = path.resolve(process.cwd(), 'vault', 'Index.md');
      if (fs.existsSync(indexPath)) {
        let content = fs.readFileSync(indexPath, 'utf-8');
        const linkEntry = `- [[Clients/${safeFolder}/Dossier|Client Dossier: ${lead.fullName} (${lead.companyName || 'Independent'})]] — Score ${lead.qualificationScore}/100.`;
        if (!content.includes(linkEntry)) {
          content = content.replace(
            '## 🗂️ Knowledge Vault Sections',
            `## 🗂️ Knowledge Vault Sections\n\n${linkEntry}`
          );
          fs.writeFileSync(indexPath, content, 'utf-8');
        }
      }
    } catch (e: any) {
      console.error('[Update Vault Index]', e.message);
    }
  }

}

export const crmStore = new CRMStore();
