import { Router, Request, Response } from 'express';
import { crmStore } from '../services/crmStore';

export const tokenRouter = Router();

tokenRouter.post('/token', async (_req: Request, res: Response) => {
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
    return res.json({ token: data.token, isDemo: false });
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

  // 2. Generate Anna's contextual spoken reply
  const safeName = (updatedLead?.companyName || updatedLead?.fullName || prospect?.company || 'Founder')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  let reply = '';

  if (emailMatch || phoneMatch) {
    reply = `Awesome! I've securely recorded your contact info (${prospectEmail || ''} ${prospectPhone ? '• ' + prospectPhone : ''}) and created your project dossier directly inside your Obsidian vault at vault/Clients/${safeName}/Dossier.md. What is your target launch timeline and budget range?`;
  } else if (text.toLowerCase().includes('guarantee') || text.toLowerCase().includes('refund')) {
    reply = `Great question! We offer an action-based 14-day guarantee. If you complete the core growth sprints and don't see results, we refund 100% of your investment. It eliminates the downside risk completely. How does that sound for your project?`;
  } else if (text.toLowerCase().includes('price') || text.toLowerCase().includes('cost') || text.toLowerCase().includes('budget')) {
    reply = `Our flagship Pro Mentorship Sprint is $2,997 (or $497/month for 6 months), which includes 1-on-1 sprint reviews and full funnel architecture. What budget range are you looking to allocate for this launch?`;
  } else if (text.toLowerCase().includes('audience') || text.toLowerCase().includes('zero')) {
    reply = `You don't need a massive audience to start. With our high-ticket conversion model, even a micro-community of 500 to 1,000 engaged followers can generate $10k to $30k per month. Tell me a bit more about what you're currently building!`;
  } else {
    reply = `Got it! I understand you're building ${prospect?.company || 'this project'}. Our goal is to automate your inbound discovery and scale your high-ticket offerings. What's the main bottleneck you want to solve first?`;
  }

  res.json({
    reply,
    lead: updatedLead,
    vaultPath: updatedLead ? `vault/Clients/${safeName}/Dossier.md` : null
  });
});

