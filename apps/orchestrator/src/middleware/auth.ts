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

function checkBearer(req: Request, res: Response, next: NextFunction, expected: string) {
  const header = req.header('authorization') || '';
  const provided = header.replace(/^Bearer\s+/i, '').trim();

  if (!provided || !safeMatch(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * Owner-only gate. Use this on routes that let the operator administer the
 * whole deployment — the content pipeline triggers/audit/dispatch/approve/
 * reject/publish, compliance log, the Instatic site editor, and billing
 * usage/record-call. These are not part of the public voice-agent demo, so
 * failing closed is safe. If ORCHESTRATOR_API_KEY is unset they stay open for
 * local demos, and in production they are disabled (503 `ADMIN_UNCONFIGURED`)
 * rather than left open to anyone who finds the URL. Once a key is set,
 * callers must present it via `Authorization: Bearer <key>`.
 */
export function requireOwnerKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ORCHESTRATOR_API_KEY;
  if (!expected) {
    if (process.env.NODE_ENV !== 'production') return next();
    return res.status(503).json({
      error: 'Owner access is not configured on this server.',
      code: 'ADMIN_UNCONFIGURED'
    });
  }
  return checkBearer(req, res, next, expected);
}

/**
 * Shared-secret bearer auth for routes the public demo depends on: the live
 * voice agent's CRM tool calls (`/api/crm/tools/execute` and the rest of
 * crmRouter), and public checkout (`/api/billing/subscribe`). These must
 * keep working even when no operator key is configured and the browser
 * sends no header, so — unlike `requireOwnerKey` — this stays open in every
 * environment, including production, when ORCHESTRATOR_API_KEY is unset.
 * Once a key is set, every request must present it via
 * `Authorization: Bearer <key>`, the same as `requireOwnerKey`.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ORCHESTRATOR_API_KEY;
  if (!expected) {
    return next();
  }
  return checkBearer(req, res, next, expected);
}
