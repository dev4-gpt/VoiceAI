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
 * the route stays open outside production (local-demo mode) and fails closed
 * with 503 in production. Once set, every request must present it via
 * `Authorization: Bearer <key>`.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ORCHESTRATOR_API_KEY;
  if (!expected) {
    // Open only for local demos. In production an unset key used to leave every
    // owner route readable and writable by anyone who found the URL.
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        error: 'Owner access is not configured on this server.',
        code: 'ADMIN_UNCONFIGURED'
      });
    }
    return next();
  }

  const header = req.header('authorization') || '';
  const provided = header.replace(/^Bearer\s+/i, '').trim();

  if (!provided || !safeMatch(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
