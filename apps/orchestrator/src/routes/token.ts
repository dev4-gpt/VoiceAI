import { Router, Request, Response } from 'express';
import { crmStore } from '../services/crmStore';
import { brandVoiceService } from '../services/brandVoiceService';
import { deepseekService } from '../services/deepseekService';

export const tokenRouter = Router();

tokenRouter.post('/token', async (req: Request, res: Response) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    // Fail loudly. This used to return 200 with a fake `demo_token_...`, and the
    // client would then point its "voice" WebSocket at our own /ws/telemetry
    // endpoint while the UI printed "Voice session authenticated". The visitor
    // spoke, nothing listened, and nobody could tell. A voice product that
    // cannot do voice must say so.
    return res.status(503).json({
      error: 'Voice is not configured on this server.',
      code: 'VOICE_UNCONFIGURED',
      isDemo: true,
      message: 'Set ASSEMBLYAI_API_KEY to enable live voice sessions.'
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
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text input is required' });
  }
  if (text.length > 4000) {
    return res.status(400).json({ error: 'Text input exceeds 4000 character limit' });
  }
  if (history !== undefined && (!Array.isArray(history) || history.length > 50)) {
    return res.status(400).json({ error: 'history must be an array of at most 50 turns' });
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

  // Build rich conversational context with universal GrowthOS Strategic Consultancy positioning
  const systemPrompt = `You are Anna, Senior Growth Operating Architect at GrowthOS (the universal autonomous growth operating layer for high-leverage enterprises).
You are conducting an executive growth advisory session and qualification for "${companyName}".

Your Role & Strategic Positioning:
- You represent GrowthOS, the sovereign operating system partnering with ${companyName}.
- You are an elite growth consultant and revenue systems architect advising ${companyName}.
- NEVER say "we built ${companyName}" or "we have done this" regarding their internal product, and never say "at ${companyName} we...".
- Do NOT use generic startup hype, cheerleader enthusiasm ("I love that mindset!", "That is a bold vision!"), or empty platitudes.
- Instead, speak with the analytical rigor, directness, and diagnostic authority of a Tier-1 Growth Consultancy (McKinsey/Bain meets autonomous agent ops). Focus on unit economics, CAC, pipeline leakage, model routing costs, and deterministic agent loops.
- Explain how the GrowthOS operating layer (autonomous inbound voice, persistent Obsidian memory, model routing, and agent loops) automates their acquisition and retention workflows.

Client & Strategic Context:
- Active Client Account: ${updatedLead?.fullName || prospect?.name || companyName}
- Target Enterprise: ${companyName}
- Core Offering & Architecture: ${bv?.coreValueProposition || prospect?.bio || 'Autonomous operating layer with automated agent loops and persistent Obsidian memory'}
- Commercial Retainer Scope: ${companyName.toLowerCase().includes('veloce') ? 'Base deployment is $2,500 setup + $1,250/month for up to 5 seats, with custom quotes for full-service growth operations.' : 'Flagship high-ticket sprint is $2,997 (or $497/mo) with a 14-day action-based refund guarantee.'}
- Tone Archetype: ${toneLabel} (${bv?.toneDescription || 'Direct, metrics-driven, practitioner confidence'})
- Signature Lexicon: ${bv?.signatureLexicon?.join(', ') || 'growth sprint, high-ticket, pipeline velocity, unit economics, model routing'}
- Strictly Banned Terms (NEVER use): ${bv?.bannedTerms?.join(', ') || 'cheap, guru, magic bullet, hard sell, synergy, hustle'}

Rules for Spoken Voice Dialogue:
1. Speak in exactly 2 to 3 concise, high-leverage sentences (under 45 words total).
2. Maintain an executive consultancy tone: direct, analytical, diagnosis-oriented.
3. Directly answer the user's specific statement or question with acute business comprehension.
4. Write for natural spoken voice: do NOT output raw URLs, markdown bullets, hashtags, or bracketed text.
5. Always end your reply with a sharp, natural diagnostic or qualifying question to move the engagement forward.`;

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

    // Only accept genuine model output. The fallback also returns truthy content,
    // so without this check Anna would speak the service's placeholder string to
    // prospects and the contextual fallback below could never run.
    if (completion && completion.content && !completion.isFallback) {
      reply = completion.content
        .replace(/^["']|["']$/g, '')
        .replace(/\n+/g, ' ')
        .trim();
    }
  } catch (llmErr) {
    console.warn('[DeepSeek Chat Completion Error, using fallback]', llmErr);
  }

  // Contextual fallback when no live model reply is available.
  if (!reply) {
    if (emailMatch || phoneMatch) {
      reply = `I have logged your contact details (${prospectEmail || ''}) and synchronized your GrowthOS dossier into your vault. What is your target deployment timeline and capital allocation for this phase?`;
    } else {
      reply = `Understood. For ${companyName}, GrowthOS installs autonomous inbound qualification and retention infrastructure so you scale unit economics hands-off. What is the primary operational friction point you want to solve first?`;
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

