import { Router, Request, Response, RequestHandler } from 'express';
import type { AuthedRequest } from '../middleware/requireUser';
import {
  WorkspaceKeysService,
  BYOK_PLATFORMS,
  isByokPlatform,
  KeyValidationError,
  KeyStorageUnconfiguredError,
  ByokPlatform
} from '../services/workspaceKeysService';
import { testKey as defaultTestKey, PerUserRateLimiter } from '../services/keyTesters';

interface MeRouterDeps {
  requireUser: RequestHandler;
  keys: WorkspaceKeysService;
  testKey: typeof defaultTestKey;
  limiter: PerUserRateLimiter;
}

const ALLOWED_PLATFORMS = Object.keys(BYOK_PLATFORMS);

/** Every route acts only on the workspace requireUser resolved from the token. */
export function createMeRouter(deps: MeRouterDeps): Router {
  const router = Router();
  router.use(deps.requireUser);

  const handleError = (res: Response, err: unknown) => {
    if (err instanceof KeyValidationError) {
      return res.status(400).json({ error: err.message, allowedFields: err.allowedFields });
    }
    if (err instanceof KeyStorageUnconfiguredError) {
      return res.status(503).json({ error: err.message, code: 'KEY_STORAGE_UNCONFIGURED' });
    }
    // Log only a safe summary — never err.message. Drizzle's DrizzleQueryError
    // message includes query params (the Google user id; ciphertext/wrappedDek
    // on writes), which must never reach logs.
    const e = err as { name?: string; cause?: { code?: string } };
    console.error('[/api/me] Unexpected error:', e?.name, e?.cause?.code ?? '');
    return res.status(500).json({ error: 'Something went wrong.' });
  };

  const platformOr400 = (req: Request, res: Response): ByokPlatform | null => {
    const { platform } = req.params;
    if (!isByokPlatform(platform)) {
      res.status(400).json({ error: 'Unsupported platform.', allowedPlatforms: ALLOWED_PLATFORMS });
      return null;
    }
    return platform;
  };

  router.get('/', (req: Request, res: Response) => {
    const { user, workspace } = req as AuthedRequest;
    res.json({ user: { email: user.email, name: user.name, image: user.image }, workspace: { role: workspace.role } });
  });

  router.get('/credentials', async (req: Request, res: Response) => {
    try {
      res.json({ credentials: await deps.keys.list((req as AuthedRequest).workspace.tenantId) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.put('/credentials/:platform', async (req: Request, res: Response) => {
    const platform = platformOr400(req, res);
    if (!platform) return;
    try {
      res.json(await deps.keys.save((req as AuthedRequest).workspace.tenantId, platform, req.body));
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/credentials/:platform/test', async (req: Request, res: Response) => {
    const platform = platformOr400(req, res);
    if (!platform) return;
    const { user, workspace } = req as AuthedRequest;
    if (!deps.limiter.allow(user.userId)) {
      return res.status(429).json({ error: 'Too many key tests. Wait a minute and try again.' });
    }
    try {
      const secrets = await deps.keys.getSecrets(workspace.tenantId, platform);
      if (!secrets) return res.status(404).json({ error: 'No key saved for this platform.' });
      const result = await deps.testKey(platform, secrets);
      if (platform === 'twitter') {
        return res.json({ ...result, testedAt: new Date().toISOString() });
      }
      const recorded = await deps.keys.recordTest(workspace.tenantId, platform, result.ok);
      res.json({ ok: result.ok, message: result.message, testedAt: recorded.testedAt });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.delete('/credentials/:platform', async (req: Request, res: Response) => {
    const platform = platformOr400(req, res);
    if (!platform) return;
    try {
      const removed = await deps.keys.remove((req as AuthedRequest).workspace.tenantId, platform);
      if (!removed) return res.status(404).json({ error: 'No key saved for this platform.' });
      res.json({ status: 'deleted' });
    } catch (err) {
      handleError(res, err);
    }
  });

  return router;
}
