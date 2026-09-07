import { Router, Request, Response } from 'express';
import { crmStore } from '../services/crmStore';
import { brandVoiceService } from '../services/brandVoiceService';
import { deepseekService } from '../services/deepseekService';

export const tokenRouter = Router();

tokenRouter.post('/token', async (req: Request, res: Response) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    // In local demo mode without an active key, return a mock token for local testing
    return res.json({
      token: 'demo_token_' + Math.random().toString(36).substring(2),
      isDemo: true,
      message: 'Demo mode active. Provide ASSEMBLYAI_API_KEY for live AssemblyAI WebSocket connection.'
    });
  }

  try {
    // AssemblyAI Voice Agent Token Minting endpoint
    // Voice Agent API requires Bearer header!
    const response = await fetch(
      'https://agents.assemblyai.com/v1/token?expires_in_seconds=300&max_session_duration_seconds=3600',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Token Minting Error]', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to mint AssemblyAI voice agent token',
        details: errorText
      });
    }

    const data = (await response.json()) as any;
    const company = (req.body && req.body.company) || 'DesignAcademy Studio';
    const bv = brandVoiceService.getProfileByCompany(company);

    if (req.body && Array.isArray(req.body.history) && req.body.history.length > 0) {
      const lead = crmStore.getLeads().find(
        (l) => l.companyName === company || l.fullName.includes(company)
      );
      if (lead) {
        lead.notes.push(
          `[Voice Stream Handoff ${new Date().toLocaleTimeString()}]: Transitioned from text chat to live voice stream with ${req.body.history.length} turns in context.`
        );
        crmStore.syncLeadToVault(lead);
      }
    }

    return res.json({ token: data.token, isDemo: false, brandVoice: bv });
  } catch (err: any) {
    console.error('[Token Route Exception]', err);
    return res.status(500).json({ error: 'Internal server error during token generation', message: err.message });
  }
});

// Interactive Text & Keyboard Conversation Route
tokenRouter.post('/chat', async (req: Request, res: Response) => {
  const { text, persona, prospect, history } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text input is required' });
  }

  // 1. Detect Email and Phone
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const phoneRegex = /((?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
  const emailMatch = text.match(emailRegex);
  const phoneMatch = text.match(phoneRegex);

  const fallbackEmail = prospect?.company 
    ? `${prospect.company.toLowerCase().replace(/[^a-z0-9]/g, '')}@inbound.lead`
    : `inbound_${Date.now().toString(36)}@growth.ai`;
  const prospectEmail = emailMatch ? emailMatch[0] : (prospect?.email || fallbackEmail);
  const prospectPhone = phoneMatch ? phoneMatch[0] : prospect?.phone;
  
  const updatedLead = crmStore.createOrUpdateLead({
    fullName: prospect?.name || (prospect?.company ? `${prospect.company} Founder` : 'Prospective Founder'),
    email: prospectEmail,
    phone: prospectPhone,
    website: prospect?.website,
    linkedIn: prospect?.linkedIn,
    companyName: prospect?.company || 'Founder Studio',
    businessSummary: prospect?.bio || text,
    source: 'after_hours_inbound'
  });

  updatedLead.notes.push(`[Typed Interaction ${new Date().toLocaleTimeString()}]: "${text}"`);
  crmStore.syncLeadToVault(updatedLead);

  // 2. Generate Anna's contextual spoken reply using Live LLM (DeepSeek) & Brand Voice DNA
  const safeName = (updatedLead?.companyName || updatedLead?.fullName || prospect?.company || 'Founder')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const companyName = updatedLead?.companyName || prospect?.company || 'your brand';
  const bv = updatedLead?.brandVoice || brandVoiceService.getProfileByCompany(companyName);
  const toneLabel = bv?.toneLabel || 'Tactical Operator';
  const vaultPath = updatedLead ? `vault/Clients/${safeName}/Dossier.md` : null;
  const brandVoiceVaultPath = updatedLead ? `vault/Clients/${safeName}/BrandVoice.md` : null;

  // Build rich conversational context
  const systemPrompt = `You are Anna, the Autonomous AI Growth Operator and Admissions Director for "${companyName}".
Client & Brand Context:
- Active Client: ${updatedLead?.fullName || prospect?.name || companyName}
- Company: ${companyName}
- Commercial Retainers & Offerings: ${companyName.toLowerCase().includes('veloce') ? 'Base platform is $2,500 setup + $1,250/month for up to 5 seats. Strategy, content production, and full-service growth operations are quoted as custom add-ons.' : 'Flagship high-ticket sprint is $2,997 (or $497/mo) with a 14-day action-based refund guarantee.'}
- Core Positioning & Dossier: ${bv?.coreValueProposition || prospect?.bio || 'Local-first operating layer with automated agent loops, persistent Obsidian memory, and 24/7 inbound voice qualification'}
- Tone Archetype: ${toneLabel} (${bv?.toneDescription || 'Direct, metrics-driven, practitioner confidence'})
- Signature Lexicon to weave in when relevant: ${bv?.signatureLexicon?.join(', ') || 'growth sprint, high-ticket, pipeline velocity'}
- Strictly Banned Terms (NEVER use): ${bv?.bannedTerms?.join(', ') || 'cheap, guru, magic bullet, hard sell'}

Rules for Voice Conversation:
1. Speak in exactly 2 to 3 concise, punchy sentences (under 45 words total).
2. Directly answer the user's specific statement or question with deep comprehension. Never repeat the same generic introduction.
3. Write for natural spoken voice: do NOT output raw URLs, markdown bullets, hashtags, or bracketed text.
4. Always end your reply with a sharp, natural qualifying question to move the conversation forward.`;

  // Build multi-turn context from client history or lead interaction history
  const recentTurns: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (Array.isArray(history) && history.length > 0) {
    for (const turn of history.slice(-8)) {
      if (turn.role && turn.content) {
        recentTurns.push({
          role: turn.role === 'assistant' ? 'assistant' : 'user',
          content: turn.content
        });
      }
    }
  } else {
    const interactionNotes = (updatedLead.notes || []).filter(
      (n) => n.startsWith('[Typed Interaction') || n.startsWith('[Agent Reply')
    );
    const recentHistory = interactionNotes.slice(-6);
    for (const n of recentHistory) {
      const match = n.match(/\]: "(.*)"$/);
      if (match && match[1]) {
        const role = n.startsWith('[Agent Reply') ? 'assistant' : 'user';
        recentTurns.push({ role, content: match[1] });
      }
    }
  }

  // Ensure current user message is at the end of the history
  if (recentTurns.length === 0 || recentTurns[recentTurns.length - 1].content !== text) {
    recentTurns.push({ role: 'user', content: text });
  }

  let reply = '';

  try {
    const completion = await deepseekService.createCompletion({
      model: 'deepseek-chat',
      temperature: 0.4,
      max_tokens: 120,
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentTurns
      ]
    });

    if (completion && completion.content) {
      reply = completion.content
        .replace(/^["']|["']$/g, '')
        .replace(/\n+/g, ' ')
        .trim();
    }
  } catch (llmErr) {
    console.warn('[DeepSeek Chat Completion Error, using fallback]', llmErr);
  }

  // High-fidelity fallback if LLM is unavailable
  if (!reply) {
    if (emailMatch || phoneMatch) {
      reply = `Awesome! I've recorded your details (${prospectEmail || ''}) and calibrated your ${toneLabel} brand voice directly into your vault. What is your target timeline and budget range for this launch?`;
    } else {
      reply = `Understood! For ${companyName}, our system automates inbound qualification and retention so you can scale hands-off. What is the biggest bottleneck you'd like us to tackle first?`;
    }
  }

  updatedLead.notes.push(`[Agent Reply ${new Date().toLocaleTimeString()}]: "${reply}"`);
  crmStore.syncLeadToVault(updatedLead);

  res.json({
    reply,
    lead: updatedLead,
    brandVoice: bv,
    vaultPath,
    brandVoiceVaultPath
  });
});

