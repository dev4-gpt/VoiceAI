import { Router, Request, Response } from 'express';
import { crmStore } from '../services/crmStore';
import { brandVoiceService } from '../services/brandVoiceService';

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
    return res.json({ token: data.token, isDemo: false, brandVoice: bv });
  } catch (err: any) {
    console.error('[Token Route Exception]', err);
    return res.status(500).json({ error: 'Internal server error during token generation', message: err.message });
  }
});

// Interactive Text & Keyboard Conversation Route
tokenRouter.post('/chat', async (req: Request, res: Response) => {
  const { text, persona, prospect } = req.body;
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

  // 2. Generate Anna's contextual spoken reply using Brand Voice DNA
  const safeName = (updatedLead?.companyName || updatedLead?.fullName || prospect?.company || 'Founder')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const companyName = updatedLead?.companyName || prospect?.company || 'your brand';
  const bv = updatedLead?.brandVoice || brandVoiceService.getProfileByCompany(companyName);
  const toneLabel = bv?.toneLabel || 'Tactical Operator';
  const vaultPath = updatedLead ? `vault/Clients/${safeName}/Dossier.md` : null;
  const brandVoiceVaultPath = updatedLead ? `vault/Clients/${safeName}/BrandVoice.md` : null;

  // Helper to extract a short, punchy 1-sentence value prop for voice dialogue (never dump raw URLs or paragraphs)
  const getShortValueProp = (raw: string | undefined): string => {
    if (!raw) return 'high-leverage autonomous AI operations';
    const firstLine = raw.split('\n')[0].replace(/^[#-*\s]+/, '').replace(/^What This Is:\s*/i, '');
    const sentence = firstLine.split('.')[0];
    return sentence.length > 80 ? sentence.slice(0, 80) : sentence;
  };

  const lowerText = text.toLowerCase();
  let reply = '';

  if (emailMatch || phoneMatch) {
    reply = `Awesome! I've securely recorded your details (${prospectEmail || ''}) and synced your ${toneLabel} brand voice into the vault. What is your target timeline and budget range for this launch?`;
  } else if (
    lowerText.includes('retainer') ||
    lowerText.includes('offer') ||
    lowerText.includes('package') ||
    lowerText.includes('pricing') ||
    lowerText.includes('price') ||
    lowerText.includes('cost') ||
    lowerText.includes('budget') ||
    lowerText.includes('fee') ||
    lowerText.includes('tier')
  ) {
    if (companyName.toLowerCase().includes('veloce')) {
      reply = `For Veloce AgenticOS, our base operating retainer starts at $2,500 setup plus $1,250 a month for up to 5 seats, with custom quotes for full-service growth and agent execution. What's the biggest operational bottleneck you'd like to automate first?`;
    } else {
      reply = `For ${companyName}, our flagship high-ticket retainer starts at $2,997 (or $497/mo) tailored to high-intent founders. What budget range are you targeting for this sprint?`;
    }
  } else if (lowerText.includes('guarantee') || lowerText.includes('refund')) {
    reply = `Great question! For ${companyName}, we install our 14-day action-based guarantee: complete the core sprints and if you don't see results, 100% is refunded. It removes risk while protecting your margins.`;
  } else if (lowerText.includes('audience') || lowerText.includes('follower') || lowerText.includes('zero')) {
    reply = `With our high-ticket model, you don't need millions of followers. A focused community of 500 to 1,000 members can reliably generate $10k to $30k a month. Tell me about your current audience size and niche!`;
  } else if (lowerText.includes('what do you do') || lowerText.includes('how does it work') || lowerText.includes('capabilities')) {
    reply = `We build autonomous AI growth operators for ${companyName}—qualifying leads around the clock, plugging pipeline leakage, and generating multi-channel content on autopilot. What's your current inbound flow like?`;
  } else {
    reply = `Got it! As admissions director for ${companyName}, my goal is to help you scale through ${getShortValueProp(bv?.coreValueProposition)}. What is the biggest operational bottleneck you want to solve first?`;
  }

  res.json({
    reply,
    lead: updatedLead,
    brandVoice: bv,
    vaultPath,
    brandVoiceVaultPath
  });
});

