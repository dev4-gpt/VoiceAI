import { Router, Request, Response } from 'express';

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
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
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

    const data = await response.json();
    return res.json({ token: data.token, isDemo: false });
  } catch (err: any) {
    console.error('[Token Route Exception]', err);
    return res.status(500).json({ error: 'Internal server error during token generation', message: err.message });
  }
});
