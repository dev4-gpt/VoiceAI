import { crmStore } from '../services/crmStore';
import { ragEngine } from '../services/ragEngine';
import { cacheEngine } from '../services/cacheEngine';
import { contentFactoryEngine } from '../services/contentFactoryEngine';

export class ToolDispatcher {
  public async dispatch(name: string, args: Record<string, any>): Promise<Record<string, any>> {
    switch (name) {
      case 'create_or_update_lead': {
        const lead = crmStore.createOrUpdateLead({
          fullName: args.fullName,
          email: args.email,
          phone: args.phone,
          source: args.source || 'after_hours_inbound'
        });
        return {
          status: 'success',
          message: `Lead ${lead.fullName} registered in CRM. Initial score: ${lead.qualificationScore}/100.`,
          leadId: lead.id
        };
      }

      case 'enrich_prospect_dossier': {
        const lead = crmStore.createOrUpdateLead({
          fullName: args.fullName || 'Prospective Founder',
          email: args.email,
          website: args.website,
          linkedIn: args.linkedIn,
          socialLinks: args.socialLinks,
          socialBioText: args.socialBioText,
          companyName: args.companyName,
          businessSummary: args.businessSummary,
          toneArchetype: args.toneArchetype,
          source: 'after_hours_inbound'
        });
        const platformsList = args.socialLinks
          ? Object.keys(args.socialLinks).filter((k) => (args.socialLinks as any)[k]).join(', ')
          : 'None specified';
        const toneLabel = lead.brandVoice?.toneLabel || 'Tactical Operator';
        return {
          status: 'success',
          message: `Dossier & Brand Voice (${toneLabel}) calibrated for ${lead.fullName}: Website (${args.website || 'N/A'}), Socials (${platformsList}), Business (${args.companyName || 'Verified'}). Profile active in RAG memory.`,
          leadId: lead.id,
          lead,
          brandVoice: lead.brandVoice
        };
      }

      case 'qualify_lead': {
        const { lead, calculatedScore } = crmStore.qualifyLead({
          email: args.email,
          budgetRange: args.budgetRange,
          coreNeed: args.coreNeed,
          authority: args.authority,
          timelineWeeks: args.timelineWeeks ? Number(args.timelineWeeks) : undefined
        });

        if (!lead) {
          return {
            status: 'error',
            message: `Could not find lead with email ${args.email}. Please create contact first.`
          };
        }

        const isQualified = calculatedScore >= 60;
        return {
          status: 'success',
          qualified: isQualified,
          qualificationScore: calculatedScore,
          recommendedTier: calculatedScore >= 75 ? 'Elite Mastermind' : 'Pro Mentorship',
          message: isQualified
            ? `Lead is highly qualified (Score: ${calculatedScore}/100). Proceed to schedule onboarding call.`
            : `Lead scored ${calculatedScore}/100. Recommend Self-Paced Growth Sprint.`
        };
      }

      case 'get_product_knowledge': {
        const query = args.query;
        // Check semantic/exact cache first
        const cached = cacheEngine.getSemantic(query);
        if (cached) {
          return {
            status: 'success',
            source: 'semantic_cache',
            knowledge: cached
          };
        }

        const docs = ragEngine.search(query, args.category);
        if (docs.length === 0) {
          return {
            status: 'not_found',
            message: 'No specific document matched this query. Refer prospect to standard 14-day guarantee.'
          };
        }

        return {
          status: 'success',
          source: 'hybrid_rag',
          topResult: docs[0].content,
          reference: docs[0].title
        };
      }

      case 'schedule_growth_consultation': {
        const booking = crmStore.scheduleMeeting({
          email: args.email,
          preferredDatetime: args.preferredDatetime,
          topic: args.topic
        });

        if (!booking.success) {
          return {
            status: 'error',
            message: `Unable to book meeting: email ${args.email} not registered in CRM.`
          };
        }

        return {
          status: 'success',
          scheduledTime: args.preferredDatetime,
          confirmationCode: booking.confirmationCode,
          message: `Consultation confirmed for ${args.preferredDatetime}. Confirmation code ${booking.confirmationCode} generated.`
        };
      }

      case 'process_retention_offer': {
        // ====================================================================
        // Deterministic Guardrail Policy ("Model Proposes, Application Enforces")
        // ====================================================================
        const proposedDiscount = Number(args.proposedDiscountPct || 0);
        let approvedDiscount = proposedDiscount;
        let requiresReview = false;
        let bonusOffer: string | undefined;

        // Strict Policy Rules:
        // Autonomous limit is 15%. Anything up to 20% requires VIP status.
        // Anything > 20% is strictly clamped and paired with non-cash value.
        if (proposedDiscount > 20) {
          approvedDiscount = 15;
          requiresReview = true;
          bonusOffer = 'Complimentary 1-on-1 Growth Audit Call with Alex (Value: $500)';
        } else if (proposedDiscount > 15) {
          approvedDiscount = 15;
          bonusOffer = 'Access to Private Mastermind Vault recordings';
        }

        const member = crmStore.processRetention({
          memberId: args.memberId,
          churnReason: args.churnReason,
          requestedAction: args.requestedAction,
          approvedDiscountPct: approvedDiscount,
          requiresManagerReview: requiresReview,
          bonusOffer
        });

        if (!member) {
          return {
            status: 'error',
            message: `Member ID ${args.memberId} not found in billing directory.`
          };
        }

        if (args.requestedAction === 'confirm_cancellation') {
          return {
            status: 'cancelled',
            message: 'Membership cancellation processed gracefully. Retain access until end of current billing period.'
          };
        }

        return {
          status: 'retention_applied',
          approvedDiscountPct: approvedDiscount,
          bonusOffer: bonusOffer || 'Standard membership retention package',
          requiresManagerReview: requiresReview,
          message: `Retention offer applied: ${approvedDiscount}% discount${
            bonusOffer ? ` plus ${bonusOffer}` : ''
          }. Account status: ${member.status}.`
        };
      }

      case 'run_content_factory': {
        const topic = args.topic;
        // Asynchronously launch the background factory
        const jobPromise = contentFactoryEngine.startJob(topic, 'voice_agent_inbound');

        // Return immediate spoken response for AssemblyAI Voice Agent to speak without waiting for research!
        return {
          status: 'queued',
          message: `I've queued the Hermes Content Factory on "${topic}". 3 parallel research lanes have been initiated, and verified drafts will appear in your Content Studio console in real-time for your review and one-click approval.`,
          topic
        };
      }

      default:
        return {
          status: 'error',
          message: `Unknown tool function: ${name}`
        };
    }
  }
}

export const toolDispatcher = new ToolDispatcher();
