# Use Each User's Own Keys — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Rate-limit constraint:** Sonnet subagents are rate-limited until 2026-09-16 3pm ET. If executing subagent-driven before then, dispatch to haiku/opus subagents only — do not queue Sonnet subagents. Inline execution (superpowers:executing-plans) is unaffected either way.

**Goal:** When a signed-in user has saved their own AssemblyAI and/or DeepSeek key, voice sessions and the console's text chat use *their* key instead of the server's. Everyone else (signed out, or signed in without a saved key) sees zero change.

**Architecture:** A new `optionalUser` middleware — a fail-open sibling to the existing `requireUser` — resolves the caller's workspace from a valid session JWT when present, and simply proceeds unauthenticated on any failure (no header, bad token, JWKS hiccup, workspace lookup failure). `POST /api/voice/token` and `POST /api/voice/chat` run it first, then look up a saved key for the resolved workspace and use it if present, otherwise fall through to the server key exactly as today.

**Tech Stack:** Express (orchestrator), React (web), Drizzle ORM over Postgres, `jose` for JWT verification, Jest (orchestrator tests), Vitest (web tests).

**Spec:** [docs/superpowers/specs/2026-09-14-byok-usage-design.md](../specs/2026-09-14-byok-usage-design.md)

## Global Constraints

- The workspace used for a key lookup comes only from the verified JWT's resolved workspace (via `optionalUser`) — never from request body, query string, or any other client-supplied value.
- Signed-out and no-saved-key behavior must be byte-for-byte unchanged from today.
- `deepseekService`'s singleton `this.apiKey` (the server key) is never mutated per-request — a per-caller key is threaded through the call, not written onto the instance, since the singleton is shared across concurrent requests.
- Every new or changed file stays under 500 lines.
- No new file touches `apps/orchestrator/src/routes/crm.ts` or `/api/billing/subscribe` in a way that adds `requireOwnerKey` or any auth gate — both must stay open exactly as today.
- Secrets are never logged or returned in full.
- Existing imports of `apps/orchestrator/src/db/repository.ts` (e.g. `import { X } from '../db/repository'` or `from '../../db/repository'`) must keep working unchanged after the split — the split adds an `index.ts` re-export, it does not move the module's public path.

---

### Task 1: `optionalUser` middleware

**Files:**
- Create: `apps/orchestrator/src/middleware/optionalUser.ts`
- Test: `apps/orchestrator/src/__tests__/optionalUser.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `createOptionalUser(deps: OptionalUserDeps): RequestHandler` and `OptionalAuthedRequest` (extends `Request` with `user?: AuthedUser; workspace?: Workspace`), both exported. `OptionalUserDeps` shape: `{ authBaseUrl: string | undefined; workspaces: { ensureForUser(authUserId: string): Promise<Workspace> }; getKey?: JWTVerifyGetKey; storageReady?: () => boolean }` — identical shape to `RequireUserDeps` in `requireUser.ts`, reused by Task 3.

This mirrors `apps/orchestrator/src/middleware/requireUser.ts` almost exactly, with one behavioral difference: every failure path calls `next()` instead of responding with an error status. Read that file first — the JWT verification, issuer/audience checks, and error classification (`isTokenError`) are copied verbatim; only the "what happens on failure" branches change.

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/orchestrator/src/__tests__/optionalUser.test.ts
import { Request, Response } from 'express';
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet, JWTVerifyGetKey, KeyLike } from 'jose';
import { createOptionalUser, OptionalAuthedRequest } from '../middleware/optionalUser';

const AUTH_BASE = 'https://ep-test.neonauth.example.neon.tech/neondb/auth';
const ISS = new URL(AUTH_BASE).origin;

let privateKey: KeyLike;
let getKey: JWTVerifyGetKey;
let otherPrivateKey: KeyLike;

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
  privateKey = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  getKey = createLocalJWKSet({ keys: [{ ...jwk, alg: 'EdDSA', kid: 'k1' }] });
  otherPrivateKey = (await generateKeyPair('EdDSA', { crv: 'Ed25519' })).privateKey;
});

async function token(opts: { key?: KeyLike; iss?: string; exp?: number | string } = {}) {
  return new SignJWT({ email: 'a@example.com', name: 'User A', image: null })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'k1' })
    .setSubject('user-a')
    .setIssuer(opts.iss ?? ISS)
    .setAudience(ISS)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '15m')
    .sign(opts.key ?? privateKey);
}

function mockReqRes(authHeader?: string) {
  const req = { header: (n: string) => (n.toLowerCase() === 'authorization' ? authHeader : undefined) } as unknown as Request;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  const next = jest.fn();
  return { req, res, next, status, json };
}

const workspaces = { ensureForUser: jest.fn(async (id: string) => ({ tenantId: `tenant-${id}`, role: 'owner' })) };

describe('optionalUser', () => {
  it('attaches user and workspace for a valid token', async () => {
    const mw = createOptionalUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const { req, res, next, status } = mockReqRes(`Bearer ${await token()}`);
    await mw(req, res, next);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    const authed = req as OptionalAuthedRequest;
    expect(authed.user).toEqual({ userId: 'user-a', email: 'a@example.com', name: 'User A', image: null });
    expect(authed.workspace).toEqual({ tenantId: 'tenant-user-a', role: 'owner' });
  });

  it('proceeds with no user when there is no bearer token', async () => {
    const mw = createOptionalUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const { req, res, next, status } = mockReqRes();
    await mw(req, res, next);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect((req as OptionalAuthedRequest).user).toBeUndefined();
  });

  it('proceeds with no user for a token signed by another key', async () => {
    const mw = createOptionalUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const { req, res, next, status } = mockReqRes(`Bearer ${await token({ key: otherPrivateKey })}`);
    await mw(req, res, next);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect((req as OptionalAuthedRequest).user).toBeUndefined();
  });

  it('proceeds with no user for an expired token', async () => {
    const mw = createOptionalUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const { req, res, next } = mockReqRes(`Bearer ${await token({ exp: Math.floor(Date.now() / 1000) - 60 })}`);
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as OptionalAuthedRequest).user).toBeUndefined();
  });

  it('proceeds with no user when auth is unconfigured', async () => {
    const mw = createOptionalUser({ authBaseUrl: undefined, workspaces, getKey });
    const { req, res, next } = mockReqRes(`Bearer ${await token()}`);
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as OptionalAuthedRequest).user).toBeUndefined();
  });

  it('proceeds with no user when the key set cannot be fetched', async () => {
    const failingGetKey = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as JWTVerifyGetKey;
    const mw = createOptionalUser({ authBaseUrl: AUTH_BASE, workspaces, getKey: failingGetKey });
    const { req, res, next } = mockReqRes(`Bearer ${await token()}`);
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as OptionalAuthedRequest).user).toBeUndefined();
  });

  it('proceeds with no user when workspace resolution fails', async () => {
    const broken = { ensureForUser: jest.fn().mockRejectedValue(new Error('db down')) };
    const mw = createOptionalUser({ authBaseUrl: AUTH_BASE, workspaces: broken, getKey });
    const { req, res, next } = mockReqRes(`Bearer ${await token()}`);
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as OptionalAuthedRequest).user).toBeUndefined();
  });

  it('proceeds with no user when storageReady() returns false', async () => {
    const mw = createOptionalUser({ authBaseUrl: AUTH_BASE, workspaces, getKey, storageReady: () => false });
    const { req, res, next } = mockReqRes(`Bearer ${await token()}`);
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as OptionalAuthedRequest).user).toBeUndefined();
  });

  it('never calls res.status, regardless of outcome', async () => {
    const mw = createOptionalUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const { req, res, next, status } = mockReqRes('Bearer not-a-jwt');
    await mw(req, res, next);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/orchestrator && npx jest optionalUser -v`
Expected: FAIL with "Cannot find module '../middleware/optionalUser'"

- [ ] **Step 3: Write the implementation**

```typescript
// apps/orchestrator/src/middleware/optionalUser.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTVerifyGetKey } from 'jose';
import type { Workspace } from '../services/workspaceService';
import type { AuthedUser } from './requireUser';

export interface OptionalAuthedRequest extends Request {
  user?: AuthedUser;
  workspace?: Workspace;
}

export interface OptionalUserDeps {
  authBaseUrl: string | undefined;
  workspaces: { ensureForUser(authUserId: string): Promise<Workspace> };
  /** Injected in tests; defaults to Neon Auth's remote JWKS. */
  getKey?: JWTVerifyGetKey;
  /** When provided and it returns false, this middleware proceeds unauthenticated rather than resolving a workspace against unavailable storage. */
  storageReady?: () => boolean;
}

/**
 * Best-effort sibling to requireUser: resolves req.user/req.workspace from a
 * valid session JWT when one is present, and proceeds unauthenticated on any
 * failure — missing header, invalid/expired token, unreachable JWKS, or a
 * workspace lookup that throws. Used on routes that must keep working for
 * anonymous callers (voice token minting, console chat) but personalize
 * behavior when the caller happens to be signed in. Never rejects a request;
 * callers that need a hard auth gate should use requireUser instead.
 */
export function createOptionalUser(deps: OptionalUserDeps): RequestHandler {
  let remoteKeySet: JWTVerifyGetKey | null = null;

  let base: string | null = null;
  let origin: string | null = null;
  if (deps.authBaseUrl) {
    try {
      const trimmed = deps.authBaseUrl.replace(/\/+$/, '');
      origin = new URL(trimmed).origin;
      base = trimmed;
    } catch {
      base = null;
      origin = null;
    }
  }

  return async function optionalUser(req: Request, res: Response, next: NextFunction) {
    if (!base || !origin) return next();
    if (deps.storageReady && !deps.storageReady()) return next();

    const header = req.header('authorization') || '';
    const token = header.replace(/^Bearer\s+/i, '').trim();
    if (!token) return next();

    const getKey = deps.getKey ?? (remoteKeySet ??= createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`)));

    let payload: Record<string, unknown>;
    try {
      ({ payload } = await jwtVerify(token, getKey, { issuer: origin, audience: origin }));
    } catch {
      return next();
    }

    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (!userId || !email) return next();

    try {
      const workspace = await deps.workspaces.ensureForUser(userId);
      const authed = req as OptionalAuthedRequest;
      authed.user = {
        userId,
        email,
        name: typeof payload.name === 'string' ? payload.name : null,
        image: typeof payload.image === 'string' ? payload.image : null
      };
      authed.workspace = workspace;
    } catch (err: any) {
      console.error('[optionalUser] Workspace resolution failed:', err?.name, err?.cause?.code ?? '');
    }
    next();
  };
}
```

Note: `AuthedUser` must be exported from `requireUser.ts` for this import to work — check the existing file; it already is (`export interface AuthedUser`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/orchestrator && npx jest optionalUser -v`
Expected: PASS, all 8 tests

- [ ] **Step 5: Commit**

```bash
git add apps/orchestrator/src/middleware/optionalUser.ts apps/orchestrator/src/__tests__/optionalUser.test.ts
git commit -m "feat(auth): add optionalUser, a fail-open sibling to requireUser"
```

---

### Task 2: `deepseekService` per-call key override + model default

**Files:**
- Modify: `apps/orchestrator/src/services/deepseekService.ts`
- Modify: `apps/orchestrator/src/__tests__/deepseekService.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `DeepSeekCompletionOptions.apiKey?: string` — when provided, `createCompletion` uses it instead of the server's `DEEPSEEK_API_KEY`. Default model changes from `'deepseek-chat'` to `'deepseek-flash'`. Used by Task 4.

- [ ] **Step 1: Write the failing tests**

Add to `apps/orchestrator/src/__tests__/deepseekService.test.ts` (append inside the existing `describe` block, after the current last test):

```typescript
  it('uses the server key when no apiKey override is given', async () => {
    process.env.DEEPSEEK_API_KEY = 'server-key';
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }], model: 'deepseek-flash', usage: {} })
    });
    global.fetch = fetchSpy as any;

    await new DeepSeekService().createCompletion({ messages: [{ role: 'user', content: 'hi' }] });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer server-key');
  });

  it('uses the override apiKey when one is given, even if the server key is unset', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }], model: 'deepseek-flash', usage: {} })
    });
    global.fetch = fetchSpy as any;

    const result = await new DeepSeekService().createCompletion({
      messages: [{ role: 'user', content: 'hi' }],
      apiKey: 'user-own-key'
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer user-own-key');
    expect(result.isFallback).toBe(false);
  });

  it('never mutates the instance server key when an override is used', async () => {
    process.env.DEEPSEEK_API_KEY = 'server-key';
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }], model: 'deepseek-flash', usage: {} })
    });
    global.fetch = fetchSpy as any;

    const service = new DeepSeekService();
    await service.createCompletion({ messages: [{ role: 'user', content: 'hi' }], apiKey: 'user-own-key' });
    await service.createCompletion({ messages: [{ role: 'user', content: 'hi' }] });

    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer user-own-key');
    expect(fetchSpy.mock.calls[1][1].headers.Authorization).toBe('Bearer server-key');
  });

  it('defaults to the deepseek-flash model', async () => {
    process.env.DEEPSEEK_API_KEY = 'server-key';
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }], model: 'deepseek-flash', usage: {} })
    });
    global.fetch = fetchSpy as any;

    await new DeepSeekService().createCompletion({ messages: [{ role: 'user', content: 'hi' }] });

    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init.body).model).toBe('deepseek-flash');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/orchestrator && npx jest deepseekService -v`
Expected: FAIL — `apiKey` override ignored (Authorization header uses server key or is missing), and model defaults to `deepseek-chat` not `deepseek-flash`.

- [ ] **Step 3: Write the implementation**

In `apps/orchestrator/src/services/deepseekService.ts`:

```typescript
export interface DeepSeekCompletionOptions {
  model?: 'deepseek-chat' | 'deepseek-reasoner' | 'deepseek-flash' | string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
  /** Per-call key override — a signed-in caller's own saved key, when they have one. Never written onto the instance; the server key remains this.apiKey for every other call. */
  apiKey?: string;
}
```

Replace the top of `createCompletion` (the `model` line and the `isConfigured()` check) with:

```typescript
    const model = options.model || (process.env.DEEPSEEK_MODEL || 'deepseek-flash');
    const apiKey = options.apiKey || this.apiKey;
    const configured = !!apiKey && apiKey !== 'your_deepseek_api_key_here';

    if (!configured) {
      console.log(`[DeepSeek Service] No active API key found, generating high-fidelity fallback response using ${model}.`);
      return this.generateFallback(options);
    }
```

And change the fetch call's `Authorization` header from `` `Bearer ${this.apiKey}` `` to `` `Bearer ${apiKey}` ``.

Leave the public `isConfigured()` method itself unchanged (it still checks `this.apiKey` only — the server-key-configured check used elsewhere and by the existing `isConfigured()` tests).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/orchestrator && npx jest deepseekService -v`
Expected: PASS, all 8 tests (4 existing + 4 new)

- [ ] **Step 5: Commit**

```bash
git add apps/orchestrator/src/services/deepseekService.ts apps/orchestrator/src/__tests__/deepseekService.test.ts
git commit -m "feat(deepseek): support a per-call key override; default model to deepseek-flash"
```

---

### Task 3: Wire BYOK into `POST /api/voice/token` and `POST /api/voice/chat`

**Files:**
- Modify: `apps/orchestrator/src/routes/token.ts`
- Test: `apps/orchestrator/src/__tests__/tokenRouter.test.ts`

**Interfaces:**
- Consumes: `createOptionalUser`, `OptionalAuthedRequest` from Task 1; `DeepSeekCompletionOptions.apiKey` from Task 2; `workspaceKeysService.getSecrets(tenantId, platform): Promise<Record<string,string> | null>` (existing, `apps/orchestrator/src/services/workspaceKeysService.ts`); `workspaceService.ensureForUser` (existing, `apps/orchestrator/src/services/workspaceService.ts`); `isDatabaseConfigured` (existing, `apps/orchestrator/src/db/client.ts`).
- Produces: nothing new consumed by later tasks — this is the integration point.

`workspaceKeysService.getSecrets(tenantId, 'assemblyai')` and `getSecrets(tenantId, 'deepseek')` both return `Record<string, string> | null`; for both platforms the only field is `apiKey` (see `BYOK_PLATFORMS` in `workspaceKeysService.ts`), so the key string is `secrets.apiKey`.

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/orchestrator/src/__tests__/tokenRouter.test.ts
import express from 'express';
import request from 'supertest';

jest.mock('../services/crmStore', () => ({
  crmStore: { ready: Promise.resolve(), getLeads: () => [], commitLead: jest.fn(), flush: jest.fn() }
}));
jest.mock('../services/brandVoiceService', () => ({
  brandVoiceService: { getProfileByCompany: () => null }
}));
jest.mock('../services/complianceService', () => ({
  complianceService: { getPolicy: () => ({ region: 'unknown' }) }
}));

const getSecrets = jest.fn();
jest.mock('../services/workspaceKeysService', () => ({
  workspaceKeysService: { getSecrets: (...args: any[]) => getSecrets(...args) }
}));

const ensureForUser = jest.fn();
jest.mock('../services/workspaceService', () => ({
  workspaceService: { ensureForUser: (...args: any[]) => ensureForUser(...args) }
}));

jest.mock('../db/client', () => ({ isDatabaseConfigured: () => true }));

const verifyMock = jest.fn();
jest.mock('jose', () => ({
  ...jest.requireActual('jose'),
  jwtVerify: (...args: any[]) => verifyMock(...args),
  createRemoteJWKSet: () => (() => {}) as any
}));

describe('POST /api/voice/token BYOK', () => {
  const originalAssemblyKey = process.env.ASSEMBLYAI_API_KEY;
  const originalAuthBase = process.env.NEON_AUTH_BASE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.ASSEMBLYAI_API_KEY = 'server-assemblyai-key';
    process.env.NEON_AUTH_BASE_URL = 'https://ep-test.neonauth.example.neon.tech/neondb/auth';
    getSecrets.mockReset();
    ensureForUser.mockReset();
    verifyMock.mockReset();
  });

  afterEach(() => {
    process.env.ASSEMBLYAI_API_KEY = originalAssemblyKey;
    process.env.NEON_AUTH_BASE_URL = originalAuthBase;
    global.fetch = originalFetch;
  });

  it('uses the server key with no Authorization header', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 't1' }) });
    global.fetch = fetchSpy as any;

    const { tokenRouter } = require('../routes/token');
    const app = express();
    app.use(express.json());
    app.use('/api/voice', tokenRouter);

    await request(app).post('/api/voice/token').send({}).expect(200);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('agents.assemblyai.com');
    expect(init.headers.Authorization).toBe('Bearer server-assemblyai-key');
    expect(getSecrets).not.toHaveBeenCalled();
  });

  it('uses the signed-in caller\'s saved AssemblyAI key when present', async () => {
    verifyMock.mockResolvedValue({ payload: { sub: 'user-a', email: 'a@example.com' } });
    ensureForUser.mockResolvedValue({ tenantId: 'tenant-a', role: 'owner' });
    getSecrets.mockImplementation(async (_tenantId: string, platform: string) =>
      platform === 'assemblyai' ? { apiKey: 'users-own-assemblyai-key' } : null
    );
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 't1' }) });
    global.fetch = fetchSpy as any;

    const { tokenRouter } = require('../routes/token');
    const app = express();
    app.use(express.json());
    app.use('/api/voice', tokenRouter);

    await request(app).post('/api/voice/token').set('Authorization', 'Bearer fake').send({}).expect(200);

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer users-own-assemblyai-key');
  });

  it('falls back to the server key when the caller has no saved AssemblyAI key', async () => {
    verifyMock.mockResolvedValue({ payload: { sub: 'user-a', email: 'a@example.com' } });
    ensureForUser.mockResolvedValue({ tenantId: 'tenant-a', role: 'owner' });
    getSecrets.mockResolvedValue(null);
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 't1' }) });
    global.fetch = fetchSpy as any;

    const { tokenRouter } = require('../routes/token');
    const app = express();
    app.use(express.json());
    app.use('/api/voice', tokenRouter);

    await request(app).post('/api/voice/token').set('Authorization', 'Bearer fake').send({}).expect(200);

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer server-assemblyai-key');
  });

  it('falls back to the server key on an invalid token, without erroring', async () => {
    verifyMock.mockRejectedValue(new Error('bad signature'));
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 't1' }) });
    global.fetch = fetchSpy as any;

    const { tokenRouter } = require('../routes/token');
    const app = express();
    app.use(express.json());
    app.use('/api/voice', tokenRouter);

    const res = await request(app).post('/api/voice/token').set('Authorization', 'Bearer fake').send({});
    expect(res.status).toBe(200);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer server-assemblyai-key');
  });
});
```

Check whether `supertest` is already a devDependency of `apps/orchestrator` (`grep supertest apps/orchestrator/package.json`); if not, add it: `cd apps/orchestrator && npm install --save-dev supertest @types/supertest`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/orchestrator && npx jest tokenRouter -v`
Expected: FAIL — the route has no auth awareness yet, so the BYOK-specific tests fail (server key used regardless of a saved caller key).

- [ ] **Step 3: Write the implementation**

In `apps/orchestrator/src/routes/token.ts`, add imports and construct `optionalUser` once at module scope:

```typescript
import { createOptionalUser, OptionalAuthedRequest } from '../middleware/optionalUser';
import { workspaceService } from '../services/workspaceService';
import { workspaceKeysService } from '../services/workspaceKeysService';
import { isDatabaseConfigured } from '../db/client';

const optionalUser = createOptionalUser({
  authBaseUrl: process.env.NEON_AUTH_BASE_URL,
  workspaces: workspaceService,
  storageReady: isDatabaseConfigured
});
```

Change the route registration and the key resolution at the top of the handler:

```typescript
tokenRouter.post('/token', optionalUser, async (req: Request, res: Response) => {
  const authed = req as OptionalAuthedRequest;
  let apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (authed.workspace) {
    const secrets = await workspaceKeysService.getSecrets(authed.workspace.tenantId, 'assemblyai');
    if (secrets?.apiKey) apiKey = secrets.apiKey;
  }

  if (!apiKey) {
    return res.status(503).json({
      error: 'Voice is not configured on this server.',
      code: 'VOICE_UNCONFIGURED',
      isDemo: true,
      message: 'Set ASSEMBLYAI_API_KEY to enable live voice sessions.'
    });
  }

  try {
    const response = await fetch(
      'https://agents.assemblyai.com/v1/token?expires_in_seconds=300&max_session_duration_seconds=3600',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    );
    // ... rest of the handler body is unchanged from here on
```

(The rest of the `/token` handler body — response handling, brand voice lookup, CRM note, compliance policy, the final `res.json` — stays exactly as it is today; only the `apiKey` resolution above the `fetch` call changes.)

For `/chat`, add `optionalUser` to the route registration and resolve a DeepSeek key the same way, then pass it into `createCompletion`:

```typescript
tokenRouter.post('/chat', optionalUser, async (req: Request, res: Response) => {
```

```typescript
  const authed = req as OptionalAuthedRequest;
  let deepseekApiKey: string | undefined;
  if (authed.workspace) {
    const secrets = await workspaceKeysService.getSecrets(authed.workspace.tenantId, 'deepseek');
    if (secrets?.apiKey) deepseekApiKey = secrets.apiKey;
  }
```

Place that block right before the existing `try { const completion = await deepseekService.createCompletion(...) }`, and change the call to:

```typescript
    const completion = await deepseekService.createCompletion({
      temperature: 0.4,
      max_tokens: 120,
      apiKey: deepseekApiKey,
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentTurns
      ]
    });
```

(Note `model: 'deepseek-chat'` is removed from this call entirely — Task 2 made the service default to `deepseek-flash` when no `model` is given, so this route no longer needs to specify one.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/orchestrator && npx jest tokenRouter -v`
Expected: PASS, all 4 tests

Also re-run the full orchestrator suite to confirm nothing else broke:

Run: `cd apps/orchestrator && npx jest -v`
Expected: PASS, all suites

- [ ] **Step 5: Commit**

```bash
git add apps/orchestrator/src/routes/token.ts apps/orchestrator/src/__tests__/tokenRouter.test.ts apps/orchestrator/package.json apps/orchestrator/package-lock.json
git commit -m "feat(voice): use a signed-in caller's own AssemblyAI/DeepSeek key when saved"
```

---

### Task 4: Frontend — attach a bearer token when signed in

**Files:**
- Modify: `apps/web/src/auth/authorizedFetch.ts`
- Modify: `apps/web/src/App.tsx` (the two call sites: line ~858 `apiUrl('/api/voice/token')`, line ~1353 `apiUrl('/api/voice/chat')`)
- Test: `apps/web/src/auth/authorizedFetch.test.ts`

**Interfaces:**
- Consumes: `authClient` (existing, `apps/web/src/auth/authClient.ts`, already fixed this session to call Better Auth endpoints directly).
- Produces: `bestEffortAuthFetch(path: string, init?: RequestInit, client?: AuthLike | null): Promise<Response>`, exported from `authorizedFetch.ts`.

- [ ] **Step 1: Write the failing test**

Add to `apps/web/src/auth/authorizedFetch.test.ts` (new `describe` block, same file, after the existing `authorizedFetch` block):

```typescript
import { bestEffortAuthFetch } from './authorizedFetch';

describe('bestEffortAuthFetch', () => {
  it('attaches the bearer token when signed in', async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    await bestEffortAuthFetch('/api/voice/token', { method: 'POST' }, client(['t1']));
    expect(new Headers(f.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer t1');
  });

  it('omits the header when signed out (no client)', async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    await bestEffortAuthFetch('/api/voice/token', { method: 'POST' }, null);
    expect(new Headers(f.mock.calls[0][1]?.headers).get('Authorization')).toBeNull();
  });

  it('omits the header when token() yields nothing', async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    await bestEffortAuthFetch('/api/voice/token', { method: 'POST' }, client([undefined]));
    expect(new Headers(f.mock.calls[0][1]?.headers).get('Authorization')).toBeNull();
  });

  it('omits the header and still calls fetch when token() throws', async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    const throwing = { ...client([]), token: vi.fn(async () => { throw new Error('network'); }) } as unknown as AuthLike;
    const res = await bestEffortAuthFetch('/api/voice/token', { method: 'POST' }, throwing);
    expect(res.status).toBe(200);
    expect(new Headers(f.mock.calls[0][1]?.headers).get('Authorization')).toBeNull();
  });
});
```

The `client(tokens: Array<string | undefined>)` helper and `import type { AuthLike }` already exist at the top of this test file from the existing `authorizedFetch` tests — reuse them, don't redefine.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/auth/authorizedFetch.test.ts`
Expected: FAIL with "bestEffortAuthFetch is not exported"

- [ ] **Step 3: Write the implementation**

Append to `apps/web/src/auth/authorizedFetch.ts`:

```typescript
/**
 * Fetch a route that must always work for anonymous callers, attaching a
 * bearer token when one happens to be available. Unlike authorizedFetch,
 * never throws SignedOutError and never retries — any failure to get a
 * token (signed out, no client, or the token call itself failing) just
 * means the request goes out without an Authorization header, exactly as
 * it always has for anonymous callers.
 */
export async function bestEffortAuthFetch(
  path: string,
  init: RequestInit = {},
  client: AuthLike | null = authClient
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (client) {
    try {
      const { data } = await client.token();
      if (data?.token) headers.set('Authorization', `Bearer ${data.token}`);
    } catch {
      // No token available — proceed anonymously, same as a signed-out caller.
    }
  }
  return fetch(apiUrl(path), { ...init, headers });
}
```

Then in `apps/web/src/App.tsx`:
1. Add `bestEffortAuthFetch` to the existing import from `./auth/authorizedFetch` (or add the import if the file doesn't already import from there — check first with `grep -n "authorizedFetch" apps/web/src/App.tsx`).
2. Line ~858: change `fetch(apiUrl('/api/voice/token'), {` to `bestEffortAuthFetch('/api/voice/token', {`.
3. Line ~1353: change `fetch(apiUrl('/api/voice/chat'), {` to `bestEffortAuthFetch('/api/voice/chat', {`.

(`bestEffortAuthFetch` takes the bare path and calls `apiUrl` internally, unlike the plain `fetch(apiUrl(...))` pattern used elsewhere in this file — match `authorizedFetch`'s existing calling convention, don't double-wrap with `apiUrl`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/auth/authorizedFetch.test.ts`
Expected: PASS, all tests (existing `authorizedFetch` tests + 4 new `bestEffortAuthFetch` tests)

Also typecheck the web app:

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/auth/authorizedFetch.ts apps/web/src/auth/authorizedFetch.test.ts apps/web/src/App.tsx
git commit -m "feat(web): attach a bearer token to voice/chat requests when signed in"
```

---

### Task 5: Split `db/repository.ts`

**Files:**
- Create: `apps/orchestrator/src/db/repository/tenant.ts`
- Create: `apps/orchestrator/src/db/repository/billing.ts`
- Create: `apps/orchestrator/src/db/repository/consent.ts`
- Create: `apps/orchestrator/src/db/repository/crm.ts`
- Create: `apps/orchestrator/src/db/repository/credentials.ts`
- Create: `apps/orchestrator/src/db/repository/index.ts`
- Delete: `apps/orchestrator/src/db/repository.ts`

**Interfaces:**
- Consumes: the current, unmodified content of `apps/orchestrator/src/db/repository.ts` (read it in full before starting — 568 lines, already mapped below).
- Produces: every symbol currently exported from `repository.ts` re-exported from `repository/index.ts`, so `import { X } from '../db/repository'` (or `'../../db/repository'`, depending on caller depth) keeps resolving unchanged everywhere else in the codebase.

This task is a pure refactor — no behavior change, so it's verified by running the existing suite before and after rather than by new tests. Before starting, run `cd apps/orchestrator && npx jest -v` and confirm the full suite is green, so any break introduced by the split is attributable to this task.

Also before starting, run `grep -rn "from '.*db/repository'" apps/orchestrator/src --include="*.ts"` and note every importing file — after the split, re-run the same grep and confirm the same files still import successfully (via `tsc --noEmit`).

- [ ] **Step 1: Create `tenant.ts`**

Move `slugify`, `tenantCache`, `isNotSignedInWorkspace`, `resolveTenantId`, and `drizzleWorkspaceStore` (currently at the end of the credentials region, lines ~420-442 — it belongs here, not in `credentials.ts`, since it's about organization/workspace rows, not the `platformCredentials` table) into this file:

```typescript
// apps/orchestrator/src/db/repository/tenant.ts
import { eq, and, sql, notExists } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../client';
import { organizations, organizationMembers } from '../schema';
import type { Workspace, WorkspaceStore } from '../../services/workspaceService';

/** Stable slug so the same company name always maps to the same tenant row. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
}

const tenantCache = new Map<string, string>();

/**
 * True when the given organizations.id has no row in organization_members —
 * i.e. it is not a signed-in workspace. Signed-in workspaces are private:
 * the legacy, unauthenticated company-name path (below) must never read,
 * resolve to, or write into one, no matter what name or slug a caller sends.
 */
export function isNotSignedInWorkspace() {
  return notExists(
    getDb()
      .select({ one: sql`1` })
      .from(organizationMembers)
      .where(eq(organizationMembers.tenantId, organizations.id))
  );
}

/**
 * Resolves a company name to a tenant id, creating the organization on first
 * sight. Real multi-tenant auth is deferred; until it lands this is how a
 * caller-supplied name becomes a row. Cached because it sits on the hot path of
 * every write.
 */
export async function resolveTenantId(companyName: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;

  const slug = slugify(companyName || 'default');
  const cached = tenantCache.get(slug);
  if (cached) return cached;

  const db = getDb();
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.slug, slug), isNotSignedInWorkspace()))
    .limit(1);

  if (existing.length) {
    tenantCache.set(slug, existing[0].id);
    return existing[0].id;
  }

  const inserted = await db
    .insert(organizations)
    .values({ name: companyName || 'Default', slug })
    .onConflictDoUpdate({
      target: organizations.slug,
      set: { updatedAt: new Date() },
      setWhere: isNotSignedInWorkspace()
    })
    .returning({ id: organizations.id });

  if (!inserted.length) {
    throw new Error(`resolveTenantId: slug "${slug}" collides with a signed-in workspace; refusing to use it.`);
  }

  tenantCache.set(slug, inserted[0].id);
  return inserted[0].id;
}

/**
 * Workspace membership over Postgres. Creation writes the organization and the
 * owner membership in one atomic batch (the Neon HTTP driver has no interactive
 * transactions). The organization never stores the user's name or email.
 */
export const drizzleWorkspaceStore: WorkspaceStore = {
  async findByUser(authUserId: string): Promise<Workspace | null> {
    const rows = await getDb()
      .select({ tenantId: organizationMembers.tenantId, role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.authUserId, authUserId), eq(organizationMembers.role, 'owner')))
      .limit(1);
    return rows[0] ?? null;
  },

  async create({ tenantId, slug, authUserId }): Promise<void> {
    const db = getDb();
    await db.batch([
      db.insert(organizations).values({ id: tenantId, name: 'Workspace', slug }),
      db.insert(organizationMembers).values({ tenantId, authUserId, role: 'owner' })
    ]);
  }
};
```

Copy the preserved doc comments from the original file verbatim onto `resolveTenantId` and `drizzleWorkspaceStore` (shown above already includes them).

- [ ] **Step 2: Create `billing.ts`**

```typescript
// apps/orchestrator/src/db/repository/billing.ts
import { eq, and, gte, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../client';
import { subscriptions, usageRecords } from '../schema';

export interface SubscriptionState {
  planId: string;
  billingCycle: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  minutesLimit: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}

/**
 * Writes subscription state from a verified Stripe webhook. This is the row that
 * decides whether a customer is entitled to service, so it is the one piece of
 * state that absolutely cannot live only in memory.
 */
export async function upsertSubscription(tenantId: string, state: SubscriptionState): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();

  await db
    .insert(subscriptions)
    .values({ tenantId, ...state, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: subscriptions.tenantId,
      set: { ...state, updatedAt: new Date() }
    });
}

export async function getSubscription(tenantId: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
  return rows[0] ?? null;
}

export interface UsageEvent {
  sessionId?: string | null;
  durationSeconds: number;
  leadCaptured: boolean;
  isAfterHours: boolean;
  dealValueCents: number;
}

export async function recordUsage(tenantId: string, event: UsageEvent): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  await db.insert(usageRecords).values({
    tenantId,
    sessionId: event.sessionId ?? null,
    durationSeconds: event.durationSeconds,
    leadCaptured: event.leadCaptured,
    isAfterHours: event.isAfterHours,
    dealValueCents: event.dealValueCents
  });
}

/**
 * Aggregates usage for the current billing period.
 *
 * These numbers are SUMs over the append-only fact table, never a stored
 * counter. A counter drifts the moment a write is retried or a process restarts
 * mid-update; a SUM cannot.
 */
export async function getUsageAggregate(tenantId: string, periodStart: Date) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();

  const rows = await db
    .select({
      totalSeconds: sql<number>`COALESCE(SUM(${usageRecords.durationSeconds}), 0)::int`,
      callsCount: sql<number>`COUNT(*)::int`,
      leadsCaptured: sql<number>`COALESCE(SUM(CASE WHEN ${usageRecords.leadCaptured} THEN 1 ELSE 0 END), 0)::int`,
      afterHoursLeads: sql<number>`COALESCE(SUM(CASE WHEN ${usageRecords.leadCaptured} AND ${usageRecords.isAfterHours} THEN 1 ELSE 0 END), 0)::int`,
      pipelineCents: sql<number>`COALESCE(SUM(CASE WHEN ${usageRecords.leadCaptured} THEN ${usageRecords.dealValueCents} ELSE 0 END), 0)::bigint`
    })
    .from(usageRecords)
    .where(and(eq(usageRecords.tenantId, tenantId), gte(usageRecords.periodStart, periodStart)));

  const r = rows[0];
  return {
    minutesUsed: Math.round((Number(r.totalSeconds) / 60) * 10) / 10,
    callsCount: Number(r.callsCount),
    leadsCaptured: Number(r.leadsCaptured),
    afterHoursLeadsCaptured: Number(r.afterHoursLeads),
    pipelineGeneratedUsd: Number(r.pipelineCents) / 100
  };
}
```

- [ ] **Step 3: Create `consent.ts`**

```typescript
// apps/orchestrator/src/db/repository/consent.ts
import { eq, desc } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../client';
import { consentRecords } from '../schema';

export interface ConsentRow {
  id: string;
  sessionId: string;
  companyName: string;
  region: string;
  consentRequirement: string;
  consentMethod: string;
  disclosureText: string;
  disclosedAt: Date;
  consentGrantedAt: Date | null;
  userAgent: string;
}

/** Consent evidence is insert-only; there is no update path by design. */
export async function insertConsent(tenantId: string, row: ConsentRow): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  await db.insert(consentRecords).values({ tenantId, ...row }).onConflictDoNothing();
}

export async function listConsent(tenantId: string, limit = 200) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  return db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.tenantId, tenantId))
    .orderBy(desc(consentRecords.createdAt))
    .limit(limit);
}
```

- [ ] **Step 4: Create `crm.ts`**

```typescript
// apps/orchestrator/src/db/repository/crm.ts
import { desc } from 'drizzle-orm';
import type { CRMLead, ChurnRiskMember } from '@voice-os/shared';
import { getDb, isDatabaseConfigured } from '../client';
import { leads, churnMembers } from '../schema';
import { resolveTenantId } from './tenant';

/**
 * Tenant that owns records with no company of their own (churn members, leads
 * captured without a company name). Multi-tenant auth will replace this with the
 * authenticated organization; until then it is the operator's own org.
 */
const DEFAULT_TENANT_NAME = process.env.DEFAULT_TENANT_NAME || 'DesignAcademy Studio';

/**
 * Parses to a Date only when the value genuinely is one. The app stores
 * scheduledCallTime as free text ("Tomorrow at 2:00 PM EST"); writing that into a
 * timestamptz column throws. The original string is preserved in `payload`.
 */
function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Upserts a lead. Queryable fields get columns; the complete record goes into
 * `payload` so every field round-trips, including ones without a column.
 */
export async function upsertLead(lead: CRMLead): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const tenantId = await resolveTenantId(lead.companyName || DEFAULT_TENANT_NAME);
  if (!tenantId) return;

  const row = {
    tenantId,
    fullName: lead.fullName,
    email: lead.email || null,
    phone: lead.phone || null,
    companyName: lead.companyName || null,
    source: lead.source || null,
    status: lead.status,
    qualificationScore: lead.qualificationScore ?? 0,
    scheduledCallTime: toDateOrNull(lead.scheduledCallTime),
    notes: lead.notes || [],
    payload: lead as unknown as Record<string, unknown>,
    createdAt: toDateOrNull(lead.createdAt) || new Date(),
    updatedAt: toDateOrNull(lead.updatedAt) || new Date()
  };

  await getDb()
    .insert(leads)
    .values({ id: lead.id, ...row })
    .onConflictDoUpdate({ target: leads.id, set: row });
}

/** Every lead, newest first, reconstructed from the lossless payload. */
export async function listAllLeads(): Promise<CRMLead[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await getDb().select().from(leads).orderBy(desc(leads.updatedAt));
  return rows
    .map((r) => r.payload as unknown as CRMLead | null)
    .filter((l): l is CRMLead => Boolean(l && l.id));
}

export async function upsertMember(member: ChurnRiskMember): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const tenantId = await resolveTenantId(DEFAULT_TENANT_NAME);
  if (!tenantId) return;

  const row = {
    tenantId,
    fullName: member.fullName,
    email: member.email || null,
    tier: member.tier || null,
    monthlyValueCents: Math.round((member.monthlyFee || 0) * 100),
    riskLevel: member.requiresManagerReview ? 'high' : 'low',
    status: member.status,
    payload: member as unknown as Record<string, unknown>,
    updatedAt: new Date()
  };

  await getDb()
    .insert(churnMembers)
    .values({ id: member.memberId, ...row })
    .onConflictDoUpdate({ target: churnMembers.id, set: row });
}

export async function listAllMembers(): Promise<ChurnRiskMember[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await getDb().select().from(churnMembers);
  return rows
    .map((r) => r.payload as unknown as ChurnRiskMember | null)
    .filter((m): m is ChurnRiskMember => Boolean(m && m.memberId));
}
```

- [ ] **Step 5: Create `credentials.ts`, folding the duplicated sealing logic**

```typescript
// apps/orchestrator/src/db/repository/credentials.ts
import { eq, and } from 'drizzle-orm';
import type { PlatformCredentials } from '../../services/clientCredentialsService';
import { encryptJson, decryptJson, isEncryptionConfigured } from '../../services/cryptoService';
import { getDb, isDatabaseConfigured } from '../client';
import { organizations, platformCredentials } from '../schema';
import type { KeyStore, StoredKey } from '../../services/workspaceKeysService';
import { resolveTenantId, isNotSignedInWorkspace } from './tenant';

/**
 * Encrypts a credentials entry and builds the row shape shared by every write
 * path below (`upsertPlatformCredential`, `drizzleKeyStore.upsert`,
 * `drizzleKeyStore.replaceIfUnchanged`). Previously duplicated three times.
 */
function sealCredentials(entry: PlatformCredentials) {
  const sealed = encryptJson(entry);
  return {
    accountHandle: entry.accountHandle || null,
    autoPublishEnabled: Boolean(entry.autoPublishEnabled),
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    authTag: sealed.authTag,
    wrappedDek: sealed.wrappedDek,
    keyVersion: sealed.keyVersion,
    updatedAt: new Date()
  };
}

function assertEncryptionConfigured() {
  if (!isEncryptionConfigured()) {
    throw new Error('MASTER_KEY is not set; refusing to store credentials unencrypted.');
  }
}

// ---------------------------------------------------------------------------
// Legacy company-name-based credential storage
// ---------------------------------------------------------------------------

export async function upsertPlatformCredential(
  companyName: string,
  platform: string,
  entry: PlatformCredentials
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  assertEncryptionConfigured();

  const tenantId = await resolveTenantId(companyName);
  if (!tenantId) return;

  const row = sealCredentials(entry);
  await getDb()
    .insert(platformCredentials)
    .values({ tenantId, platform, ...row })
    .onConflictDoUpdate({
      target: [platformCredentials.tenantId, platformCredentials.platform],
      set: row
    });
}

export async function deletePlatformCredential(companyName: string, platform: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const tenantId = await resolveTenantId(companyName);
  if (!tenantId) return;
  await getDb()
    .delete(platformCredentials)
    .where(and(eq(platformCredentials.tenantId, tenantId), eq(platformCredentials.platform, platform)));
}

/**
 * Every stored credential, decrypted, with the owning company's name. A row that
 * fails to decrypt (wrong MASTER_KEY, tampered ciphertext) is skipped and logged
 * rather than crashing boot or being returned as garbage.
 *
 * Excludes signed-in workspaces (any tenant with an organization_members row).
 * The legacy in-memory store this feeds (clientCredentialsService.hydrate) keys
 * records by organizations.name, and every signed-in workspace org is named
 * literally 'Workspace' — without this filter, every workspace's BYOK keys
 * would be decrypted and merged into one shared record keyed 'workspace'.
 * Signed-in workspaces read their own keys exclusively through drizzleKeyStore
 * below, which is scoped by the tenant id resolved from a verified session.
 */
export async function listAllPlatformCredentials(): Promise<
  Array<{ tenantId: string; companyName: string; platform: string; entry: PlatformCredentials }>
> {
  if (!isDatabaseConfigured() || !isEncryptionConfigured()) return [];

  const rows = await getDb()
    .select({
      tenantId: platformCredentials.tenantId,
      platform: platformCredentials.platform,
      ciphertext: platformCredentials.ciphertext,
      iv: platformCredentials.iv,
      authTag: platformCredentials.authTag,
      wrappedDek: platformCredentials.wrappedDek,
      keyVersion: platformCredentials.keyVersion,
      companyName: organizations.name
    })
    .from(platformCredentials)
    .innerJoin(organizations, eq(platformCredentials.tenantId, organizations.id))
    .where(isNotSignedInWorkspace());

  const out: Array<{ tenantId: string; companyName: string; platform: string; entry: PlatformCredentials }> = [];
  for (const r of rows) {
    try {
      const entry = decryptJson<PlatformCredentials>(r);
      out.push({ tenantId: r.tenantId, companyName: r.companyName, platform: r.platform, entry });
    } catch (err: any) {
      console.error(`[Credentials] Could not decrypt ${r.platform} for tenant ${r.tenantId}; skipping.`, err?.message);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tenant-scoped key storage for signed-in workspaces
// ---------------------------------------------------------------------------

/**
 * Tenant-scoped key storage for signed-in workspaces. Unlike the legacy
 * company-name functions above, every call takes the tenant id resolved from
 * the verified session, and nothing is loaded for other tenants.
 */
export const drizzleKeyStore: KeyStore = {
  async list(tenantId: string): Promise<StoredKey[]> {
    const rows = await getDb()
      .select({
        platform: platformCredentials.platform,
        ciphertext: platformCredentials.ciphertext,
        iv: platformCredentials.iv,
        authTag: platformCredentials.authTag,
        wrappedDek: platformCredentials.wrappedDek,
        keyVersion: platformCredentials.keyVersion,
        updatedAt: platformCredentials.updatedAt
      })
      .from(platformCredentials)
      .where(eq(platformCredentials.tenantId, tenantId));
    const out: StoredKey[] = [];
    for (const r of rows) {
      try {
        out.push({ platform: r.platform, entry: decryptJson<PlatformCredentials>(r), updatedAt: r.updatedAt });
      } catch (err: any) {
        console.error(`[Keys] Could not decrypt ${r.platform} for a workspace; skipping.`, err?.message);
      }
    }
    return out;
  },

  async get(tenantId: string, platform: string): Promise<PlatformCredentials | null> {
    const rows = await getDb()
      .select({
        ciphertext: platformCredentials.ciphertext,
        iv: platformCredentials.iv,
        authTag: platformCredentials.authTag,
        wrappedDek: platformCredentials.wrappedDek,
        keyVersion: platformCredentials.keyVersion
      })
      .from(platformCredentials)
      .where(and(eq(platformCredentials.tenantId, tenantId), eq(platformCredentials.platform, platform)))
      .limit(1);
    if (!rows.length) return null;
    return decryptJson<PlatformCredentials>(rows[0]);
  },

  async upsert(tenantId: string, platform: string, entry: PlatformCredentials): Promise<void> {
    assertEncryptionConfigured();
    const row = sealCredentials(entry);
    await getDb()
      .insert(platformCredentials)
      .values({ tenantId, platform, ...row })
      .onConflictDoUpdate({ target: [platformCredentials.tenantId, platformCredentials.platform], set: row });
  },

  async remove(tenantId: string, platform: string): Promise<boolean> {
    const deleted = await getDb()
      .delete(platformCredentials)
      .where(and(eq(platformCredentials.tenantId, tenantId), eq(platformCredentials.platform, platform)))
      .returning({ id: platformCredentials.id });
    return deleted.length > 0;
  },

  /**
   * Compare-and-set write: only applies when the row's stored `updatedAt`
   * still equals `expectedUpdatedAt` (i.e. nothing has written to it since
   * the caller last read it). Returns false, without writing, when the row
   * changed or is gone.
   *
   * `updated_at` is `timestamptz` (schema.ts), which Postgres stores with
   * microsecond precision. The equality check below only ever holds because
   * every write to this table sets `updatedAt` explicitly from a JS `Date`
   * (millisecond precision, via `sealCredentials`) rather than letting the
   * column's `defaultNow()` fill it in. If a row's timestamp were ever set by
   * the DB default instead, it could carry sub-millisecond precision that a
   * JS `Date` can never equal, and this compare-and-set would always fail.
   */
  async replaceIfUnchanged(
    tenantId: string,
    platform: string,
    entry: PlatformCredentials,
    expectedUpdatedAt: Date
  ): Promise<boolean> {
    assertEncryptionConfigured();
    const row = sealCredentials(entry);
    const updated = await getDb()
      .update(platformCredentials)
      .set(row)
      .where(
        and(
          eq(platformCredentials.tenantId, tenantId),
          eq(platformCredentials.platform, platform),
          eq(platformCredentials.updatedAt, expectedUpdatedAt)
        )
      )
      .returning({ id: platformCredentials.id });
    return updated.length > 0;
  }
};
```

- [ ] **Step 6: Create `index.ts` and delete the original file**

```typescript
// apps/orchestrator/src/db/repository/index.ts
export * from './tenant';
export * from './billing';
export * from './consent';
export * from './crm';
export * from './credentials';
```

```bash
rm apps/orchestrator/src/db/repository.ts
```

- [ ] **Step 7: Verify nothing broke**

Run: `cd apps/orchestrator && npx tsc --noEmit`
Expected: no errors (confirms every importer of `../db/repository` / `../../db/repository` still resolves against the new `index.ts`)

Run: `cd apps/orchestrator && npx jest -v`
Expected: PASS, full suite — same pass count as the baseline run noted at the top of this task

- [ ] **Step 8: Commit**

```bash
git add apps/orchestrator/src/db/repository/ apps/orchestrator/src/db/repository.ts
git commit -m "refactor(db): split repository.ts into repository/{tenant,billing,consent,crm,credentials}.ts

Folds the encrypt-and-build-row logic duplicated across
upsertPlatformCredential/drizzleKeyStore.upsert/replaceIfUnchanged into
one sealCredentials() helper. No behavior change — same exports, now
re-exported from repository/index.ts."
```

---

### Task 6: Manual production verification

Not a code task — after Tasks 1-5 are merged and deployed:

- [ ] Sign out. Confirm voice sessions and chat still work exactly as before (server keys, no auth prompt, no behavior change).
- [ ] Sign in with an account that has **no** saved AssemblyAI/DeepSeek key. Confirm voice/chat still use the server keys (no regression from `optionalUser` being present but finding nothing saved).
- [ ] Sign in and save a deliberately-invalid AssemblyAI key (e.g. `invalid-test-key`) in the Keys panel. Start a voice session; confirm it fails with an AssemblyAI-side auth error (proving the request reached AssemblyAI with *that* key, not the server's) rather than silently succeeding on the server key.
- [ ] Same for DeepSeek: save an invalid key, send a chat message, confirm the response is the `isFallback: true` placeholder (proving the bad key was actually used and rejected, not silently bypassed).
- [ ] Save valid keys (if available) for both and confirm real voice/chat sessions work end-to-end on them.
- [ ] Remove both saved keys and confirm behavior reverts to the server keys immediately (no stale caching).

Update the progress ledger at `.claude/worktrees/signin-byok/.superpowers/sdd/2026-09-13-signin-workspaces-byok/progress.md` — or create a parallel one for this sub-project if that worktree isn't reused — noting these results, matching the pattern from sub-project 1.
