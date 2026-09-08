import { Request, Response, NextFunction } from 'express';

/**
 * Shared-secret bearer auth, matching the fallback philosophy used elsewhere
 * in this codebase (AssemblyAI/DeepSeek): if ORCHESTRATOR_API_KEY is unset,
 * the route stays open (documented local-demo mode). Once set, every
 * request must present it via `Authorization: Bearer <key>`.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ORCHESTRATOR_API_KEY;
  if (!expected) return next();

  const header = req.header('authorization') || '';
  const provided = header.replace(/^Bearer\s+/i, '').trim();

  if (provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
