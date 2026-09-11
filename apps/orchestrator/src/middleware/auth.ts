import { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * Constant-time comparison. Both sides are SHA-256'd first so the buffers are
 * always 32 bytes — timingSafeEqual throws on length mismatch, and comparing
 * raw strings leaks both the key length and its matching prefix via timing.
 */
function safeMatch(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

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

  if (!provided || !safeMatch(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
