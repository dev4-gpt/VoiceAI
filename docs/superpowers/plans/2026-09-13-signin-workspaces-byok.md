# Sign-in, Private Workspaces and BYOK Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anyone signs in with Google, gets a private workspace, and stores their own DeepSeek, AssemblyAI, LinkedIn, X and dev.to keys encrypted — isolated from every other user — while the public demo keeps working.

**Architecture:** The web app signs in through Neon Auth (`@neondatabase/neon-js`) and sends a 15-minute token as `Authorization: Bearer`. The Express orchestrator verifies it with `jose` against Neon Auth's JWKS, resolves the caller's workspace from a new `organization_members` table (created on first sign-in), and serves `/api/me/*` routes that read and write only that workspace's encrypted keys. Owner-only routes over shared demo data stay on `requireApiKey`, which now fails closed in production.

**Tech Stack:** Express 4 + TypeScript + Jest 30/ts-jest (orchestrator); Drizzle ORM 0.45 on `drizzle-orm/neon-http`; `jose@5.10.0`; React 18 + Vite 5 + Vitest (web); `@neondatabase/neon-js@0.7.0-beta`.

**Spec:** `docs/superpowers/specs/2026-09-13-signin-workspaces-byok-design.md`

## Global Constraints

- Privacy rules are binding: a user sees only their own name/email/avatar; no endpoint lists users or reveals workspaces; workspace always comes from the verified token — never from URL, query or body; secrets are never logged or returned in full (last 4 characters only).
- Pin `jose@5.10.0` (v6 is ESM-only and breaks ts-jest's CommonJS test run). Pin `@neondatabase/neon-js@0.7.0-beta`.
- No other new dependencies. No `supertest`: route tests use `app.listen(0)` + global `fetch`.
- Neon HTTP driver has no interactive transactions; atomic multi-statement writes use `getDb().batch([...])`.
- JWT verification: issuer and audience are both `new URL(NEON_AUTH_BASE_URL).origin`; JWKS at `${NEON_AUTH_BASE_URL without trailing slash}/.well-known/jwks.json`.
- Error codes exactly: `SIGNED_OUT` (401), `INVALID_TOKEN` (401), `TOKEN_EXPIRED` (401), `AUTH_UNCONFIGURED` (503), `AUTH_UNAVAILABLE` (503), `WORKSPACE_UNAVAILABLE` (503), `KEY_STORAGE_UNCONFIGURED` (503), `ADMIN_UNCONFIGURED` (503), rate limit 429.
- BYOK platforms and secret fields exactly: `deepseek: [apiKey]`, `assemblyai: [apiKey]`, `devto: [apiKey]`, `linkedin: [accessToken]`, `twitter: [apiKey, apiSecret, accessToken, accessTokenSecret]`. Each value a trimmed non-empty string ≤ 4096 chars; unknown fields rejected.
- Key tests use free read-only endpoints only; X is never called. 10 tests per user per minute.
- The public demo (voice token/chat, CRM demo, pricing, checkout, consent, widget, graph, health) is unchanged. `/api/credentials/*` is removed.
- Deviations from the spec, deliberate: (1) per-workspace keys live in a new `workspaceKeysService` instead of new methods on the legacy `clientCredentialsService`, because the legacy service decrypts every tenant's credentials into memory at boot; (2) `organization_members` adds a partial unique index allowing one owned workspace per user, so parallel first sign-ins cannot create two workspaces.
- Commit messages conventional, no `Co-Authored-By` trailer. Stage files explicitly; never `git add -A`. Files under 500 lines.
- Work in the worktree/branch the executor sets up; commands below are relative to the repo root unless they `cd`.

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/orchestrator/src/middleware/auth.ts` | Modify | `requireApiKey` fails closed in production |
| `apps/orchestrator/src/routes/content.ts` | Modify | Guard `trigger`, `audit`, `approve`, `reject` |
| `apps/orchestrator/src/db/schema.ts` | Modify | `organization_members` table |
| `apps/orchestrator/src/services/workspaceService.ts` | Create | `WorkspaceService`, `WorkspaceStore`, slug helper |
| `apps/orchestrator/src/db/repository.ts` | Modify | `drizzleWorkspaceStore`; tenant-scoped `drizzleKeyStore` |
| `apps/orchestrator/src/middleware/requireUser.ts` | Create | `createRequireUser`, `AuthedRequest` |
| `apps/orchestrator/src/services/workspaceKeysService.ts` | Create | BYOK validation, masking, `KeyStore` interface |
| `apps/orchestrator/src/services/keyTesters.ts` | Create | `testKey`, `PerUserRateLimiter` |
| `apps/orchestrator/src/routes/me.ts` | Create | `createMeRouter` |
| `apps/orchestrator/src/index.ts` | Modify | Mount `/api/me`; remove `/api/credentials` |
| `apps/orchestrator/src/routes/credentials.ts` | Delete | Replaced by `/api/me/credentials` |
| `apps/web/src/auth/authClient.ts` | Create | Neon Auth client |
| `apps/web/src/auth/useSession.ts` | Create | Session hook |
| `apps/web/src/auth/authorizedFetch.ts` | Create | Bearer fetch with one retry |
| `apps/web/src/components/AccountMenu.tsx` | Create | Sign-in / account header control |
| `apps/web/src/components/KeysPanel.tsx` | Create | BYOK keys UI |
| `apps/web/src/App.tsx` | Modify | Wire session, AccountMenu, KeysPanel |
| `apps/web/src/components/ClientCredentialsModal.tsx` | Delete | Replaced by KeysPanel |
| `apps/web/src/vite-env.d.ts`, `.env.example`, `CLAUDE.md`, `README.md` | Modify | Config + docs |

---

### Task 1: Owner-only routes fail closed in production

**Files:**
- Modify: `apps/orchestrator/src/middleware/auth.ts:21-32`
- Modify: `apps/orchestrator/src/routes/content.ts` (`/trigger`, `/audit`, `/jobs/:id/approve`, `/jobs/:id/reject`)
- Test: `apps/orchestrator/src/__tests__/auth.test.ts`

**Interfaces:**
- Produces: `requireApiKey(req, res, next)` — same signature; in production with no `ORCHESTRATOR_API_KEY` responds `503 { error: 'Owner access is not configured on this server.', code: 'ADMIN_UNCONFIGURED' }`.

- [ ] **Step 1: Write the failing tests**

In `apps/orchestrator/src/__tests__/auth.test.ts`, replace:

```ts
describe('requireApiKey', () => {
  const original = process.env.ORCHESTRATOR_API_KEY;
  afterEach(() => {
    process.env.ORCHESTRATOR_API_KEY = original;
  });
```

with:

```ts
describe('requireApiKey', () => {
  const original = process.env.ORCHESTRATOR_API_KEY;
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.ORCHESTRATOR_API_KEY = original;
    process.env.NODE_ENV = originalEnv;
  });

  it('fails closed with 503 in production when no key is configured', () => {
    delete process.env.ORCHESTRATOR_API_KEY;
    process.env.NODE_ENV = 'production';
    const { req, res, next, status, json } = mockReqRes();
    requireApiKey(req, res, next);
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({
      error: 'Owner access is not configured on this server.',
      code: 'ADMIN_UNCONFIGURED'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('still requires the key in production when one is configured', () => {
    process.env.ORCHESTRATOR_API_KEY = 'secret123';
    process.env.NODE_ENV = 'production';
    const { req, res, next } = mockReqRes('Bearer secret123');
    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
  });
```

In the existing test `'passes through when no key is configured (local demo mode)'`, add `process.env.NODE_ENV = 'test';` as its first line.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace apps/orchestrator -- auth`
Expected: FAIL — the production test expects 503 but `next` was called.

- [ ] **Step 3: Implement fail-closed**

In `apps/orchestrator/src/middleware/auth.ts` replace:

```ts
  const expected = process.env.ORCHESTRATOR_API_KEY;
  if (!expected) return next();
```

with:

```ts
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
```

In the doc comment above the function, replace the sentence `if ORCHESTRATOR_API_KEY is unset, the route stays open (documented local-demo mode).` (it spans two comment lines) with `if ORCHESTRATOR_API_KEY is unset, the route stays open outside production (local-demo mode) and fails closed with 503 in production.`

- [ ] **Step 4: Guard the token-spending and approval routes**

In `apps/orchestrator/src/routes/content.ts` insert `requireApiKey, ` directly after the path string of these four routes, keeping each handler body unchanged:

- `contentRouter.post('/trigger', async (req: Request, res: Response) => {` → `contentRouter.post('/trigger', requireApiKey, async (req: Request, res: Response) => {`
- `contentRouter.post('/audit', async (req: Request, res: Response) => {` → `contentRouter.post('/audit', requireApiKey, async (req: Request, res: Response) => {`
- `contentRouter.post('/jobs/:id/approve', ` → `contentRouter.post('/jobs/:id/approve', requireApiKey, `
- `contentRouter.post('/jobs/:id/reject', ` → `contentRouter.post('/jobs/:id/reject', requireApiKey, `

- [ ] **Step 5: Verify**

Run: `npm test --workspace apps/orchestrator -- auth`
Expected: PASS — 5 tests.

Run: `grep -nE "post\('/(trigger|audit|jobs/:id/approve|jobs/:id/reject)', requireApiKey" apps/orchestrator/src/routes/content.ts | wc -l`
Expected: `4`

Run: `cd apps/orchestrator && npx tsc --noEmit; echo "exit $?"; cd ../..`
Expected: `exit 0`

- [ ] **Step 6: Commit**

```bash
git add apps/orchestrator/src/middleware/auth.ts apps/orchestrator/src/__tests__/auth.test.ts apps/orchestrator/src/routes/content.ts
git commit -m "fix(auth): owner-only routes fail closed in production"
```

---

### Task 2: Workspaces — schema, service and Drizzle store

**Files:**
- Modify: `apps/orchestrator/src/db/schema.ts` (add table + type)
- Create: `apps/orchestrator/src/services/workspaceService.ts`
- Modify: `apps/orchestrator/src/db/repository.ts` (append `drizzleWorkspaceStore`)
- Test: `apps/orchestrator/src/__tests__/workspaceService.test.ts`

**Interfaces:**
- Produces:
  - `interface Workspace { tenantId: string; role: string }`
  - `interface WorkspaceStore { findByUser(authUserId: string): Promise<Workspace | null>; create(input: { tenantId: string; slug: string; authUserId: string }): Promise<void> }`
  - `function newWorkspaceSlug(): string` — `'ws-'` + 10 lowercase base36 chars
  - `function isUniqueViolation(err: unknown): boolean`
  - `class WorkspaceService { constructor(store: WorkspaceStore); ensureForUser(authUserId: string): Promise<Workspace> }`
  - `const workspaceService: WorkspaceService` (default instance over `drizzleWorkspaceStore`)
  - `schema.organizationMembers` table; `drizzleWorkspaceStore: WorkspaceStore` exported from repository

- [ ] **Step 1: Write the failing test**

Create `apps/orchestrator/src/__tests__/workspaceService.test.ts`:

```ts
import { WorkspaceService, WorkspaceStore, Workspace, newWorkspaceSlug, isUniqueViolation } from '../services/workspaceService';

class MemoryStore implements WorkspaceStore {
  orgs: Array<{ tenantId: string; slug: string; name: string }> = [];
  members: Array<{ tenantId: string; authUserId: string; role: string }> = [];
  failNextCreateWith: unknown = null;

  async findByUser(authUserId: string): Promise<Workspace | null> {
    const m = this.members.find((x) => x.authUserId === authUserId && x.role === 'owner');
    return m ? { tenantId: m.tenantId, role: m.role } : null;
  }

  async create(input: { tenantId: string; slug: string; authUserId: string }): Promise<void> {
    if (this.failNextCreateWith) {
      const err = this.failNextCreateWith;
      this.failNextCreateWith = null;
      throw err;
    }
    if (this.members.some((x) => x.authUserId === input.authUserId && x.role === 'owner')) {
      throw Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
    }
    this.orgs.push({ tenantId: input.tenantId, slug: input.slug, name: 'Workspace' });
    this.members.push({ tenantId: input.tenantId, authUserId: input.authUserId, role: 'owner' });
  }
}

describe('WorkspaceService', () => {
  it('creates exactly one workspace and owner membership on first sign-in', async () => {
    const store = new MemoryStore();
    const ws = await new WorkspaceService(store).ensureForUser('user-a');
    expect(ws.role).toBe('owner');
    expect(store.orgs).toHaveLength(1);
    expect(store.members).toEqual([{ tenantId: ws.tenantId, authUserId: 'user-a', role: 'owner' }]);
  });

  it('returns the same workspace on later calls without creating another', async () => {
    const store = new MemoryStore();
    const first = await new WorkspaceService(store).ensureForUser('user-a');
    const second = await new WorkspaceService(store).ensureForUser('user-a');
    expect(second.tenantId).toBe(first.tenantId);
    expect(store.orgs).toHaveLength(1);
  });

  it('gives different users different workspaces', async () => {
    const store = new MemoryStore();
    const service = new WorkspaceService(store);
    const a = await service.ensureForUser('user-a');
    const b = await service.ensureForUser('user-b');
    expect(a.tenantId).not.toBe(b.tenantId);
  });

  it('concurrent first calls for one user create one workspace', async () => {
    const store = new MemoryStore();
    const service = new WorkspaceService(store);
    const [x, y] = await Promise.all([service.ensureForUser('user-a'), service.ensureForUser('user-a')]);
    expect(x.tenantId).toBe(y.tenantId);
    expect(store.orgs).toHaveLength(1);
  });

  it('recovers when another instance created the workspace first', async () => {
    const store = new MemoryStore();
    store.members.push({ tenantId: 'existing-tenant', authUserId: 'user-a', role: 'owner' });
    store.findByUser = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ tenantId: 'existing-tenant', role: 'owner' });
    const ws = await new WorkspaceService(store).ensureForUser('user-a');
    expect(ws.tenantId).toBe('existing-tenant');
  });

  it('retries on a slug collision', async () => {
    const store = new MemoryStore();
    store.failNextCreateWith = Object.assign(new Error('duplicate key organizations_slug_idx'), { code: '23505' });
    const ws = await new WorkspaceService(store).ensureForUser('user-a');
    expect(ws.role).toBe('owner');
    expect(store.orgs).toHaveLength(1);
  });

  it('never stores the user name or email on the organization', async () => {
    const store = new MemoryStore();
    await new WorkspaceService(store).ensureForUser('user-a');
    expect(store.orgs[0].name).toBe('Workspace');
  });
});

describe('helpers', () => {
  it('newWorkspaceSlug is ws- plus 10 base36 chars', () => {
    for (let i = 0; i < 20; i++) expect(newWorkspaceSlug()).toMatch(/^ws-[0-9a-z]{10}$/);
  });

  it('isUniqueViolation detects Postgres 23505 directly, via cause, or by message', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ cause: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation(new Error('duplicate key value violates unique constraint'))).toBe(true);
    expect(isUniqueViolation(new Error('connection refused'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace apps/orchestrator -- workspaceService`
Expected: FAIL — `Cannot find module '../services/workspaceService'`.

- [ ] **Step 3: Add the table**

In `apps/orchestrator/src/db/schema.ts`, add at the top with the imports:

```ts
import { sql } from 'drizzle-orm';
```

Directly after the `organizations` table definition (after its closing `);`), add:

```ts
/**
 * Who belongs to which workspace. A user's first sign-in creates one owned
 * workspace. The partial unique index allows exactly one owned workspace per
 * user, so two parallel first requests cannot create two.
 */
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    authUserId: text('auth_user_id').notNull(),
    role: text('role').notNull().default('owner'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    userTenantIdx: uniqueIndex('organization_members_user_tenant_idx').on(t.authUserId, t.tenantId),
    oneOwnedWorkspaceIdx: uniqueIndex('organization_members_one_owned_idx')
      .on(t.authUserId)
      .where(sql`role = 'owner'`),
    userIdx: index('organization_members_user_idx').on(t.authUserId)
  })
);
```

After `export type Organization = typeof organizations.$inferSelect;` add:

```ts
export type OrganizationMember = typeof organizationMembers.$inferSelect;
```

- [ ] **Step 4: Create the service**

Create `apps/orchestrator/src/services/workspaceService.ts`:

```ts
import { randomBytes, randomUUID } from 'crypto';
import { drizzleWorkspaceStore } from '../db/repository';

export interface Workspace {
  tenantId: string;
  role: string;
}

export interface WorkspaceStore {
  findByUser(authUserId: string): Promise<Workspace | null>;
  create(input: { tenantId: string; slug: string; authUserId: string }): Promise<void>;
}

const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Opaque slug: never derived from the user's name or email. */
export function newWorkspaceSlug(): string {
  return 'ws-' + Array.from(randomBytes(10), (b) => BASE36[b % 36]).join('');
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string } | null;
  if (!e) return false;
  return e.code === '23505' || e.cause?.code === '23505' || /duplicate key/i.test(e.message || '');
}

const MAX_CREATE_ATTEMPTS = 3;

/**
 * Resolves the caller's private workspace, creating it on first sign-in.
 * Cached per process; concurrent first calls for the same user share one promise.
 */
export class WorkspaceService {
  private cache = new Map<string, Workspace>();
  private inflight = new Map<string, Promise<Workspace>>();

  constructor(private readonly store: WorkspaceStore) {}

  public async ensureForUser(authUserId: string): Promise<Workspace> {
    const cached = this.cache.get(authUserId);
    if (cached) return cached;
    const pending = this.inflight.get(authUserId);
    if (pending) return pending;

    const work = this.resolve(authUserId).finally(() => this.inflight.delete(authUserId));
    this.inflight.set(authUserId, work);
    return work;
  }

  private async resolve(authUserId: string): Promise<Workspace> {
    const existing = await this.store.findByUser(authUserId);
    if (existing) return this.remember(authUserId, existing);

    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
      const tenantId = randomUUID();
      try {
        await this.store.create({ tenantId, slug: newWorkspaceSlug(), authUserId });
        return this.remember(authUserId, { tenantId, role: 'owner' });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Either another instance created this user's workspace first, or the
        // random slug collided. Prefer the existing workspace; otherwise retry.
        const raced = await this.store.findByUser(authUserId);
        if (raced) return this.remember(authUserId, raced);
      }
    }
    throw new Error('Could not create a workspace after several attempts.');
  }

  private remember(authUserId: string, ws: Workspace): Workspace {
    this.cache.set(authUserId, ws);
    return ws;
  }
}

export const workspaceService = new WorkspaceService(drizzleWorkspaceStore);
```

- [ ] **Step 5: Add the Drizzle store**

In `apps/orchestrator/src/db/repository.ts`, change the `./schema` import to include `organizationMembers`:

```ts
import {
  organizations,
  organizationMembers,
  subscriptions,
  usageRecords,
  consentRecords,
  leads,
  churnMembers,
  platformCredentials
} from './schema';
```

Add after the other imports:

```ts
import type { Workspace, WorkspaceStore } from '../services/workspaceService';
```

Append at the end of the file:

```ts
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

- [ ] **Step 6: Verify**

Run: `npm test --workspace apps/orchestrator -- workspaceService`
Expected: PASS — 9 tests.

Run: `cd apps/orchestrator && npx tsc --noEmit; echo "exit $?"; cd ../..`
Expected: `exit 0`. If `db.batch` has a type error, report it as BLOCKED with the error (do not replace it with sequential inserts).

- [ ] **Step 7: Commit**

```bash
git add apps/orchestrator/src/db/schema.ts apps/orchestrator/src/services/workspaceService.ts apps/orchestrator/src/db/repository.ts apps/orchestrator/src/__tests__/workspaceService.test.ts
git commit -m "feat(auth): private workspace per user with one owned workspace guarantee"
```

---

### Task 3: `requireUser` middleware

**Files:**
- Modify: `apps/orchestrator/package.json` (add `jose@5.10.0`)
- Create: `apps/orchestrator/src/middleware/requireUser.ts`
- Test: `apps/orchestrator/src/__tests__/requireUser.test.ts`

**Interfaces:**
- Consumes: `Workspace` from `../services/workspaceService`.
- Produces:
  - `interface AuthedUser { userId: string; email: string; name: string | null; image: string | null }`
  - `interface AuthedRequest extends Request { user: AuthedUser; workspace: Workspace }`
  - `interface RequireUserDeps { authBaseUrl: string | undefined; workspaces: { ensureForUser(authUserId: string): Promise<Workspace> }; getKey?: JWTVerifyGetKey }`
  - `function createRequireUser(deps: RequireUserDeps): RequestHandler`

- [ ] **Step 1: Install jose**

Run: `npm install jose@5.10.0 --workspace apps/orchestrator`
Expected: `apps/orchestrator/package.json` dependencies include `jose` at `5.10.0` (caret or exact).

- [ ] **Step 2: Write the failing test**

Create `apps/orchestrator/src/__tests__/requireUser.test.ts`:

```ts
import { Request, Response } from 'express';
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet, JWTVerifyGetKey, KeyLike } from 'jose';
import { createRequireUser, AuthedRequest } from '../middleware/requireUser';

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

describe('requireUser', () => {
  it('attaches user and workspace for a valid token', async () => {
    const mw = createRequireUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const { req, res, next, status } = mockReqRes(`Bearer ${await token()}`);
    await mw(req, res, next);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    const authed = req as AuthedRequest;
    expect(authed.user).toEqual({ userId: 'user-a', email: 'a@example.com', name: 'User A', image: null });
    expect(authed.workspace).toEqual({ tenantId: 'tenant-user-a', role: 'owner' });
  });

  it('401 SIGNED_OUT without a bearer token', async () => {
    const mw = createRequireUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const { req, res, next, status, json } = mockReqRes();
    await mw(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SIGNED_OUT' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('401 INVALID_TOKEN for a token signed by another key', async () => {
    const mw = createRequireUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const { req, res, next, status, json } = mockReqRes(`Bearer ${await token({ key: otherPrivateKey })}`);
    await mw(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
  });

  it('401 INVALID_TOKEN for the wrong issuer', async () => {
    const mw = createRequireUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const { req, res, next, status, json } = mockReqRes(`Bearer ${await token({ iss: 'https://evil.example' })}`);
    await mw(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
  });

  it('401 TOKEN_EXPIRED for an expired token', async () => {
    const mw = createRequireUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const { req, res, next, status, json } = mockReqRes(`Bearer ${await token({ exp: Math.floor(Date.now() / 1000) - 60 })}`);
    await mw(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
  });

  it('401 INVALID_TOKEN when email is missing', async () => {
    const mw = createRequireUser({ authBaseUrl: AUTH_BASE, workspaces, getKey });
    const noEmail = await new SignJWT({})
      .setProtectedHeader({ alg: 'EdDSA', kid: 'k1' })
      .setSubject('user-a')
      .setIssuer(ISS)
      .setAudience(ISS)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(privateKey);
    const { req, res, next, status, json } = mockReqRes(`Bearer ${noEmail}`);
    await mw(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
  });

  it('503 AUTH_UNCONFIGURED when NEON_AUTH_BASE_URL is unset', async () => {
    const mw = createRequireUser({ authBaseUrl: undefined, workspaces, getKey });
    const { req, res, next, status, json } = mockReqRes(`Bearer ${await token()}`);
    await mw(req, res, next);
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_UNCONFIGURED' }));
  });

  it('503 AUTH_UNAVAILABLE when the key set cannot be fetched', async () => {
    const failingGetKey = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as JWTVerifyGetKey;
    const mw = createRequireUser({ authBaseUrl: AUTH_BASE, workspaces, getKey: failingGetKey });
    const { req, res, next, status, json } = mockReqRes(`Bearer ${await token()}`);
    await mw(req, res, next);
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_UNAVAILABLE' }));
  });

  it('503 WORKSPACE_UNAVAILABLE when the workspace cannot be resolved', async () => {
    const broken = { ensureForUser: jest.fn().mockRejectedValue(new Error('db down')) };
    const mw = createRequireUser({ authBaseUrl: AUTH_BASE, workspaces: broken, getKey });
    const { req, res, next, status, json } = mockReqRes(`Bearer ${await token()}`);
    await mw(req, res, next);
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'WORKSPACE_UNAVAILABLE' }));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test --workspace apps/orchestrator -- requireUser`
Expected: FAIL — `Cannot find module '../middleware/requireUser'`.

- [ ] **Step 4: Implement**

Create `apps/orchestrator/src/middleware/requireUser.ts`:

```ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createRemoteJWKSet, jwtVerify, errors, JWTVerifyGetKey } from 'jose';
import type { Workspace } from '../services/workspaceService';

export interface AuthedUser {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface AuthedRequest extends Request {
  user: AuthedUser;
  workspace: Workspace;
}

export interface RequireUserDeps {
  authBaseUrl: string | undefined;
  workspaces: { ensureForUser(authUserId: string): Promise<Workspace> };
  /** Injected in tests; defaults to Neon Auth's remote JWKS. */
  getKey?: JWTVerifyGetKey;
}

function fail(res: Response, status: number, code: string, error: string) {
  return res.status(status).json({ error, code });
}

/**
 * Verifies a Neon Auth (managed Better Auth) JWT and resolves the caller's private
 * workspace. The workspace comes only from the verified `sub` — never from the
 * request — so one user can never address another user's data.
 */
export function createRequireUser(deps: RequireUserDeps): RequestHandler {
  let remoteKeySet: JWTVerifyGetKey | null = null;

  return async function requireUser(req: Request, res: Response, next: NextFunction) {
    if (!deps.authBaseUrl) {
      return fail(res, 503, 'AUTH_UNCONFIGURED', 'Sign-in is not configured on this server.');
    }

    const header = req.header('authorization') || '';
    const token = header.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return fail(res, 401, 'SIGNED_OUT', 'Sign in required.');
    }

    const base = deps.authBaseUrl.replace(/\/+$/, '');
    const origin = new URL(base).origin;
    const getKey = deps.getKey ?? (remoteKeySet ??= createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`)));

    let payload: Record<string, unknown>;
    try {
      ({ payload } = await jwtVerify(token, getKey, { issuer: origin, audience: origin }));
    } catch (err) {
      if (err instanceof errors.JWTExpired) {
        return fail(res, 401, 'TOKEN_EXPIRED', 'Your session expired. Sign in again.');
      }
      if (err instanceof errors.JOSEError && !(err instanceof errors.JWKSTimeout)) {
        return fail(res, 401, 'INVALID_TOKEN', 'Invalid session token.');
      }
      // Network or key-set failures are our outage, not the user's signed-out state.
      return fail(res, 503, 'AUTH_UNAVAILABLE', 'Sign-in is temporarily unavailable.');
    }

    const userId = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (!userId || !email) {
      return fail(res, 401, 'INVALID_TOKEN', 'Invalid session token.');
    }

    let workspace: Workspace;
    try {
      workspace = await deps.workspaces.ensureForUser(userId);
    } catch (err: any) {
      console.error('[requireUser] Workspace resolution failed:', err?.message || err);
      return fail(res, 503, 'WORKSPACE_UNAVAILABLE', 'Your workspace is temporarily unavailable.');
    }

    const authed = req as AuthedRequest;
    authed.user = {
      userId,
      email,
      name: typeof payload.name === 'string' ? payload.name : null,
      image: typeof payload.image === 'string' ? payload.image : null
    };
    authed.workspace = workspace;
    next();
  };
}
```

- [ ] **Step 5: Verify**

Run: `npm test --workspace apps/orchestrator -- requireUser`
Expected: PASS — 9 tests.

Run: `cd apps/orchestrator && npx tsc --noEmit; echo "exit $?"; cd ../..`
Expected: `exit 0`

- [ ] **Step 6: Commit**

```bash
git add apps/orchestrator/package.json package-lock.json apps/orchestrator/src/middleware/requireUser.ts apps/orchestrator/src/__tests__/requireUser.test.ts
git commit -m "feat(auth): verify Neon Auth tokens and resolve the caller's workspace"
```

(If `npm install` also changed `apps/orchestrator/package-lock.json`, stage it too.)

---

### Task 4: Workspace keys — tenant-scoped storage and service

**Files:**
- Modify: `apps/orchestrator/src/db/repository.ts` (append `drizzleKeyStore`)
- Create: `apps/orchestrator/src/services/workspaceKeysService.ts`
- Test: `apps/orchestrator/src/__tests__/workspaceKeysService.test.ts`

**Interfaces:**
- Consumes: `PlatformCredentials` type from `./clientCredentialsService`; `encryptJson`, `decryptJson`, `isEncryptionConfigured` from `./cryptoService`; `isDatabaseConfigured` from `../db/client`.
- Produces:
  - `const BYOK_PLATFORMS` with keys `deepseek`, `assemblyai`, `devto`, `linkedin`, `twitter` mapping to the readonly field arrays in Global Constraints
  - `type ByokPlatform = keyof typeof BYOK_PLATFORMS`; `function isByokPlatform(p: unknown): p is ByokPlatform`
  - `interface StoredKey { platform: string; entry: PlatformCredentials; updatedAt: Date }`
  - `interface KeyStore { list(tenantId: string): Promise<StoredKey[]>; get(tenantId: string, platform: string): Promise<PlatformCredentials | null>; upsert(tenantId: string, platform: string, entry: PlatformCredentials): Promise<void>; remove(tenantId: string, platform: string): Promise<boolean> }`
  - `interface MaskedKey { platform: ByokPlatform; accountHandle: string | null; last4: string; updatedAt: string; lastTest: { ok: boolean; testedAt: string } | null }`
  - `class KeyValidationError extends Error { readonly allowedFields?: readonly string[] }`; `class KeyStorageUnconfiguredError extends Error`
  - `class WorkspaceKeysService { constructor(store: KeyStore, storageReady: () => boolean); list(tenantId: string): Promise<MaskedKey[]>; save(tenantId: string, platform: ByokPlatform, body: unknown): Promise<MaskedKey>; remove(tenantId: string, platform: ByokPlatform): Promise<boolean>; getSecrets(tenantId: string, platform: ByokPlatform): Promise<Record<string, string> | null>; recordTest(tenantId: string, platform: ByokPlatform, ok: boolean): Promise<{ ok: boolean; testedAt: string }> }`
  - `const workspaceKeysService: WorkspaceKeysService`; `drizzleKeyStore: KeyStore` exported from repository

- [ ] **Step 1: Write the failing test**

Create `apps/orchestrator/src/__tests__/workspaceKeysService.test.ts`:

```ts
import {
  WorkspaceKeysService,
  KeyStore,
  StoredKey,
  KeyValidationError,
  KeyStorageUnconfiguredError,
  isByokPlatform
} from '../services/workspaceKeysService';
import type { PlatformCredentials } from '../services/clientCredentialsService';

class MemoryKeyStore implements KeyStore {
  rows = new Map<string, StoredKey>();
  async list(tenantId: string) {
    return [...this.rows.entries()].filter(([key]) => key.startsWith(`${tenantId}::`)).map(([, v]) => v);
  }
  async get(tenantId: string, platform: string) {
    return this.rows.get(`${tenantId}::${platform}`)?.entry ?? null;
  }
  async upsert(tenantId: string, platform: string, entry: PlatformCredentials) {
    this.rows.set(`${tenantId}::${platform}`, { platform, entry, updatedAt: new Date('2026-09-13T12:00:00Z') });
  }
  async remove(tenantId: string, platform: string) {
    return this.rows.delete(`${tenantId}::${platform}`);
  }
}

const SECRET = 'sk-live-abcdefghijklmnop1234';

describe('WorkspaceKeysService', () => {
  let store: MemoryKeyStore;
  let service: WorkspaceKeysService;
  beforeEach(() => {
    store = new MemoryKeyStore();
    service = new WorkspaceKeysService(store, () => true);
  });

  it('saves a key and returns only the last 4 characters', async () => {
    const masked = await service.save('tenant-a', 'deepseek', { apiKey: `  ${SECRET}  ` });
    expect(masked).toEqual({
      platform: 'deepseek',
      accountHandle: null,
      last4: '••••1234',
      updatedAt: '2026-09-13T12:00:00.000Z',
      lastTest: null
    });
    expect(JSON.stringify(masked)).not.toContain('abcdefgh');
    expect((await store.get('tenant-a', 'deepseek'))?.secrets).toEqual({ apiKey: SECRET });
  });

  it("isolates workspaces: one tenant never sees another tenant's keys", async () => {
    await service.save('tenant-a', 'deepseek', { apiKey: SECRET });
    expect(await service.list('tenant-b')).toEqual([]);
    expect(await service.getSecrets('tenant-b', 'deepseek')).toBeNull();
    expect(await service.remove('tenant-b', 'deepseek')).toBe(false);
    expect(await service.list('tenant-a')).toHaveLength(1);
  });

  it('requires every field for multi-field platforms and rejects bad input', async () => {
    await expect(service.save('t', 'twitter', { apiKey: 'a', apiSecret: 'b', accessToken: 'c' })).rejects.toThrow(KeyValidationError);
    await expect(service.save('t', 'deepseek', { apiKey: SECRET, extra: 'x' })).rejects.toThrow(KeyValidationError);
    await expect(service.save('t', 'deepseek', { apiKey: '   ' })).rejects.toThrow(KeyValidationError);
    await expect(service.save('t', 'deepseek', { apiKey: 'x'.repeat(4097) })).rejects.toThrow(KeyValidationError);
    await expect(service.save('t', 'deepseek', 'nope')).rejects.toThrow(KeyValidationError);
  });

  it('reports the allowed fields on a validation error', async () => {
    try {
      await service.save('t', 'linkedin', { apiKey: SECRET });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(KeyValidationError);
      expect((err as KeyValidationError).allowedFields).toEqual(['accessToken']);
    }
  });

  it('masks short secrets completely', async () => {
    expect((await service.save('t', 'devto', { apiKey: 'short' })).last4).toBe('••••');
  });

  it('keeps an optional account handle', async () => {
    expect((await service.save('t', 'devto', { apiKey: SECRET, accountHandle: '@aryaman' })).accountHandle).toBe('@aryaman');
  });

  it('records a key test result without exposing secrets', async () => {
    await service.save('t', 'deepseek', { apiKey: SECRET });
    const result = await service.recordTest('t', 'deepseek', true);
    expect(result.ok).toBe(true);
    const [listed] = await service.list('t');
    expect(listed.lastTest).toEqual({ ok: true, testedAt: result.testedAt });
    expect(listed.last4).toBe('••••1234');
  });

  it('refuses to work when storage is not configured', async () => {
    const unready = new WorkspaceKeysService(store, () => false);
    await expect(unready.save('t', 'deepseek', { apiKey: SECRET })).rejects.toThrow(KeyStorageUnconfiguredError);
    await expect(unready.list('t')).rejects.toThrow(KeyStorageUnconfiguredError);
  });

  it('isByokPlatform accepts only the five BYOK platforms', () => {
    for (const p of ['deepseek', 'assemblyai', 'devto', 'linkedin', 'twitter']) expect(isByokPlatform(p)).toBe(true);
    for (const p of ['substack', 'youtube', 'meta', '', null, 42]) expect(isByokPlatform(p)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace apps/orchestrator -- workspaceKeysService`
Expected: FAIL — `Cannot find module '../services/workspaceKeysService'`.

- [ ] **Step 3: Implement the service**

Create `apps/orchestrator/src/services/workspaceKeysService.ts`:

```ts
import type { PlatformCredentials } from './clientCredentialsService';
import { isDatabaseConfigured } from '../db/client';
import { isEncryptionConfigured } from './cryptoService';
import { drizzleKeyStore } from '../db/repository';

export const BYOK_PLATFORMS = {
  deepseek: ['apiKey'],
  assemblyai: ['apiKey'],
  devto: ['apiKey'],
  linkedin: ['accessToken'],
  twitter: ['apiKey', 'apiSecret', 'accessToken', 'accessTokenSecret']
} as const;

export type ByokPlatform = keyof typeof BYOK_PLATFORMS;

export function isByokPlatform(p: unknown): p is ByokPlatform {
  return typeof p === 'string' && Object.prototype.hasOwnProperty.call(BYOK_PLATFORMS, p);
}

export interface StoredKey {
  platform: string;
  entry: PlatformCredentials;
  updatedAt: Date;
}

export interface KeyStore {
  list(tenantId: string): Promise<StoredKey[]>;
  get(tenantId: string, platform: string): Promise<PlatformCredentials | null>;
  upsert(tenantId: string, platform: string, entry: PlatformCredentials): Promise<void>;
  remove(tenantId: string, platform: string): Promise<boolean>;
}

export interface MaskedKey {
  platform: ByokPlatform;
  accountHandle: string | null;
  last4: string;
  updatedAt: string;
  lastTest: { ok: boolean; testedAt: string } | null;
}

export class KeyValidationError extends Error {
  constructor(message: string, public readonly allowedFields?: readonly string[]) {
    super(message);
    this.name = 'KeyValidationError';
  }
}

export class KeyStorageUnconfiguredError extends Error {
  constructor() {
    super('Key storage is not configured on this server.');
    this.name = 'KeyStorageUnconfiguredError';
  }
}

const MAX_SECRET_LENGTH = 4096;

function mask(secrets: Record<string, string>, platform: ByokPlatform): string {
  const primary = secrets[BYOK_PLATFORMS[platform][0]] || '';
  return primary.length < 8 ? '••••' : `••••${primary.slice(-4)}`;
}

/**
 * A signed-in user's own API keys. Every method takes the tenant id that
 * requireUser resolved from the verified token; nothing here accepts a name or
 * id from the request. Secrets leave this service only via getSecrets, for
 * server-side use (key tests now, voice and drafts in later sub-projects).
 */
export class WorkspaceKeysService {
  constructor(private readonly store: KeyStore, private readonly storageReady: () => boolean) {}

  private assertReady() {
    if (!this.storageReady()) throw new KeyStorageUnconfiguredError();
  }

  private toMasked(platform: ByokPlatform, entry: PlatformCredentials, updatedAt: Date): MaskedKey {
    return {
      platform,
      accountHandle: entry.accountHandle || null,
      last4: mask(entry.secrets || {}, platform),
      updatedAt: updatedAt.toISOString(),
      lastTest: entry.lastVerifiedAt ? { ok: entry.status === 'connected', testedAt: entry.lastVerifiedAt } : null
    };
  }

  public async list(tenantId: string): Promise<MaskedKey[]> {
    this.assertReady();
    const rows = await this.store.list(tenantId);
    return rows
      .filter((r) => isByokPlatform(r.platform))
      .map((r) => this.toMasked(r.platform as ByokPlatform, r.entry, r.updatedAt));
  }

  public async save(tenantId: string, platform: ByokPlatform, body: unknown): Promise<MaskedKey> {
    this.assertReady();
    const allowed = BYOK_PLATFORMS[platform];
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new KeyValidationError('Send the key fields as a JSON object.', allowed);
    }
    const { accountHandle, ...fields } = body as Record<string, unknown>;

    const unknownFields = Object.keys(fields).filter((f) => !(allowed as readonly string[]).includes(f));
    if (unknownFields.length) {
      throw new KeyValidationError(`Unknown field(s): ${unknownFields.join(', ')}.`, allowed);
    }

    const secrets: Record<string, string> = {};
    for (const field of allowed) {
      const raw = fields[field];
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (!value) throw new KeyValidationError(`"${field}" is required.`, allowed);
      if (value.length > MAX_SECRET_LENGTH) throw new KeyValidationError(`"${field}" is too long.`, allowed);
      secrets[field] = value;
    }

    const handle = typeof accountHandle === 'string' && accountHandle.trim() ? accountHandle.trim().slice(0, 200) : undefined;
    const entry: PlatformCredentials = {
      secrets,
      accountHandle: handle,
      environment: 'cloud_production',
      autoPublishEnabled: false,
      status: 'connected'
    };
    await this.store.upsert(tenantId, platform, entry);

    const saved = (await this.store.list(tenantId)).find((r) => r.platform === platform);
    return this.toMasked(platform, entry, saved?.updatedAt ?? new Date());
  }

  public async remove(tenantId: string, platform: ByokPlatform): Promise<boolean> {
    this.assertReady();
    return this.store.remove(tenantId, platform);
  }

  public async getSecrets(tenantId: string, platform: ByokPlatform): Promise<Record<string, string> | null> {
    this.assertReady();
    const entry = await this.store.get(tenantId, platform);
    return entry && entry.secrets && Object.keys(entry.secrets).length ? entry.secrets : null;
  }

  public async recordTest(tenantId: string, platform: ByokPlatform, ok: boolean): Promise<{ ok: boolean; testedAt: string }> {
    this.assertReady();
    const testedAt = new Date().toISOString();
    const entry = await this.store.get(tenantId, platform);
    if (entry) {
      await this.store.upsert(tenantId, platform, { ...entry, status: ok ? 'connected' : 'error', lastVerifiedAt: testedAt });
    }
    return { ok, testedAt };
  }
}

export const workspaceKeysService = new WorkspaceKeysService(
  drizzleKeyStore,
  () => isDatabaseConfigured() && isEncryptionConfigured()
);
```

- [ ] **Step 4: Add the tenant-scoped Drizzle key store**

In `apps/orchestrator/src/db/repository.ts`, add after the existing imports:

```ts
import type { KeyStore, StoredKey } from '../services/workspaceKeysService';
```

Append at the end of the file:

```ts
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
    if (!isEncryptionConfigured()) {
      throw new Error('MASTER_KEY is not set; refusing to store credentials unencrypted.');
    }
    const sealed = encryptJson(entry);
    const row = {
      accountHandle: entry.accountHandle || null,
      autoPublishEnabled: Boolean(entry.autoPublishEnabled),
      ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      authTag: sealed.authTag,
      wrappedDek: sealed.wrappedDek,
      keyVersion: sealed.keyVersion,
      updatedAt: new Date()
    };
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
  }
};
```

- [ ] **Step 5: Verify**

Run: `npm test --workspace apps/orchestrator -- workspaceKeysService`
Expected: PASS — 9 tests.

Run: `npm test --workspace apps/orchestrator`
Expected: all suites PASS.

Run: `cd apps/orchestrator && npx tsc --noEmit; echo "exit $?"; cd ../..`
Expected: `exit 0`

- [ ] **Step 6: Commit**

```bash
git add apps/orchestrator/src/services/workspaceKeysService.ts apps/orchestrator/src/db/repository.ts apps/orchestrator/src/__tests__/workspaceKeysService.test.ts
git commit -m "feat(keys): encrypted per-workspace key storage with validation and masking"
```

---

### Task 5: Key testers and per-user rate limit

**Files:**
- Create: `apps/orchestrator/src/services/keyTesters.ts`
- Test: `apps/orchestrator/src/__tests__/keyTesters.test.ts`

**Interfaces:**
- Consumes: `ByokPlatform` from `./workspaceKeysService`.
- Produces:
  - `interface KeyTestResult { ok: boolean; message: string }`
  - `function testKey(platform: ByokPlatform, secrets: Record<string, string>, fetcher?: typeof fetch): Promise<KeyTestResult>`
  - `class PerUserRateLimiter { constructor(limit?: number, windowMs?: number, now?: () => number); allow(userId: string): boolean }`

- [ ] **Step 1: Write the failing test**

Create `apps/orchestrator/src/__tests__/keyTesters.test.ts`:

```ts
import { testKey, PerUserRateLimiter } from '../services/keyTesters';

function fakeFetch(status: number) {
  return jest.fn(async (_url: string, _init?: RequestInit) => ({ ok: status >= 200 && status < 300, status }) as Response);
}

describe('testKey', () => {
  it('deepseek calls the free models endpoint with the bearer key', async () => {
    const f = fakeFetch(200);
    const result = await testKey('deepseek', { apiKey: 'sk-1' }, f as unknown as typeof fetch);
    expect(result.ok).toBe(true);
    expect(f).toHaveBeenCalledWith('https://api.deepseek.com/models', expect.objectContaining({ headers: { Authorization: 'Bearer sk-1' } }));
  });

  it('assemblyai mints a 60-second token', async () => {
    const f = fakeFetch(200);
    await testKey('assemblyai', { apiKey: 'aai-1' }, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledWith(
      'https://agents.assemblyai.com/v1/token?expires_in_seconds=60',
      expect.objectContaining({ headers: { Authorization: 'Bearer aai-1' } })
    );
  });

  it('devto uses the api-key header', async () => {
    const f = fakeFetch(200);
    await testKey('devto', { apiKey: 'dev-1' }, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledWith('https://dev.to/api/users/me', expect.objectContaining({ headers: { 'api-key': 'dev-1' } }));
  });

  it('linkedin calls userinfo with the access token', async () => {
    const f = fakeFetch(200);
    await testKey('linkedin', { accessToken: 'li-1' }, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledWith('https://api.linkedin.com/v2/userinfo', expect.objectContaining({ headers: { Authorization: 'Bearer li-1' } }));
  });

  it('reports a rejected key without echoing provider details', async () => {
    const result = await testKey('deepseek', { apiKey: 'bad' }, fakeFetch(401) as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, message: 'DeepSeek rejected this key (HTTP 401).' });
  });

  it('reports a network failure', async () => {
    const f = jest.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const result = await testKey('devto', { apiKey: 'x' }, f as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, message: 'Could not reach dev.to. Try again.' });
  });

  it('never calls X', async () => {
    const f = fakeFetch(200);
    const result = await testKey(
      'twitter',
      { apiKey: 'a', apiSecret: 'b', accessToken: 'c', accessTokenSecret: 'd' },
      f as unknown as typeof fetch
    );
    expect(f).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, message: 'X keys are stored but not tested — X charges for API reads.' });
  });
});

describe('PerUserRateLimiter', () => {
  it('allows 10 per user per minute, then blocks, then resets', () => {
    let now = 0;
    const limiter = new PerUserRateLimiter(10, 60_000, () => now);
    for (let i = 0; i < 10; i++) expect(limiter.allow('u1')).toBe(true);
    expect(limiter.allow('u1')).toBe(false);
    expect(limiter.allow('u2')).toBe(true);
    now = 60_001;
    expect(limiter.allow('u1')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace apps/orchestrator -- keyTesters`
Expected: FAIL — `Cannot find module '../services/keyTesters'`.

- [ ] **Step 3: Implement**

Create `apps/orchestrator/src/services/keyTesters.ts`:

```ts
import type { ByokPlatform } from './workspaceKeysService';

export interface KeyTestResult {
  ok: boolean;
  message: string;
}

const TIMEOUT_MS = 8000;

const CHECKS: Record<
  Exclude<ByokPlatform, 'twitter'>,
  { label: string; request: (s: Record<string, string>) => [string, RequestInit] }
> = {
  deepseek: {
    label: 'DeepSeek',
    request: (s) => ['https://api.deepseek.com/models', { headers: { Authorization: `Bearer ${s.apiKey}` } }]
  },
  assemblyai: {
    label: 'AssemblyAI',
    request: (s) => [
      'https://agents.assemblyai.com/v1/token?expires_in_seconds=60',
      { headers: { Authorization: `Bearer ${s.apiKey}` } }
    ]
  },
  devto: {
    label: 'dev.to',
    request: (s) => ['https://dev.to/api/users/me', { headers: { 'api-key': s.apiKey } }]
  },
  linkedin: {
    label: 'LinkedIn',
    request: (s) => ['https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${s.accessToken}` } }]
  }
};

/**
 * One free, read-only call per platform to confirm a key works. Provider
 * response bodies are never returned or stored.
 */
export async function testKey(
  platform: ByokPlatform,
  secrets: Record<string, string>,
  fetcher: typeof fetch = fetch
): Promise<KeyTestResult> {
  if (platform === 'twitter') {
    return { ok: false, message: 'X keys are stored but not tested — X charges for API reads.' };
  }
  const check = CHECKS[platform];
  const [url, init] = check.request(secrets);
  try {
    const res = await fetcher(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.ok) return { ok: true, message: `${check.label} accepted this key.` };
    return { ok: false, message: `${check.label} rejected this key (HTTP ${res.status}).` };
  } catch {
    return { ok: false, message: `Could not reach ${check.label}. Try again.` };
  }
}

/** Fixed-window limiter, per process. */
export class PerUserRateLimiter {
  private windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly limit = 10,
    private readonly windowMs = 60_000,
    private readonly now: () => number = () => Date.now()
  ) {}

  public allow(userId: string): boolean {
    const t = this.now();
    const w = this.windows.get(userId);
    if (!w || t - w.start > this.windowMs) {
      this.windows.set(userId, { start: t, count: 1 });
      return true;
    }
    if (w.count >= this.limit) return false;
    w.count += 1;
    return true;
  }
}
```

- [ ] **Step 4: Verify**

Run: `npm test --workspace apps/orchestrator -- keyTesters`
Expected: PASS — 8 tests.

Run: `cd apps/orchestrator && npx tsc --noEmit; echo "exit $?"; cd ../..`
Expected: `exit 0`

- [ ] **Step 5: Commit**

```bash
git add apps/orchestrator/src/services/keyTesters.ts apps/orchestrator/src/__tests__/keyTesters.test.ts
git commit -m "feat(keys): free read-only key tests and a per-user rate limit"
```

---

### Task 6: `/api/me` routes; remove `/api/credentials`

**Files:**
- Create: `apps/orchestrator/src/routes/me.ts`
- Modify: `apps/orchestrator/src/index.ts` (line `app.use('/api/credentials', credentialsRouter);` and its import)
- Delete: `apps/orchestrator/src/routes/credentials.ts`
- Test: `apps/orchestrator/src/__tests__/meRouter.test.ts`

**Interfaces:**
- Consumes: `createRequireUser`, `AuthedRequest` (Task 3); `workspaceService` (Task 2); `WorkspaceKeysService`, `workspaceKeysService`, `isByokPlatform`, `BYOK_PLATFORMS`, `KeyValidationError`, `KeyStorageUnconfiguredError` (Task 4); `testKey`, `PerUserRateLimiter` (Task 5).
- Produces: `function createMeRouter(deps: { requireUser: RequestHandler; keys: WorkspaceKeysService; testKey: typeof testKey; limiter: PerUserRateLimiter }): Router`

- [ ] **Step 1: Write the failing test**

Create `apps/orchestrator/src/__tests__/meRouter.test.ts`:

```ts
import express, { Request, Response, NextFunction } from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { createMeRouter } from '../routes/me';
import { WorkspaceKeysService, KeyStore, StoredKey } from '../services/workspaceKeysService';
import { PerUserRateLimiter } from '../services/keyTesters';
import type { PlatformCredentials } from '../services/clientCredentialsService';

class MemoryKeyStore implements KeyStore {
  rows = new Map<string, StoredKey>();
  async list(t: string) {
    return [...this.rows.entries()].filter(([k]) => k.startsWith(`${t}::`)).map(([, v]) => v);
  }
  async get(t: string, p: string) {
    return this.rows.get(`${t}::${p}`)?.entry ?? null;
  }
  async upsert(t: string, p: string, entry: PlatformCredentials) {
    this.rows.set(`${t}::${p}`, { platform: p, entry, updatedAt: new Date() });
  }
  async remove(t: string, p: string) {
    return this.rows.delete(`${t}::${p}`);
  }
}

// Stand-in for requireUser: the header names which test user is calling.
function fakeRequireUser(req: Request, res: Response, next: NextFunction) {
  const who = req.header('x-test-user');
  if (!who) return res.status(401).json({ code: 'SIGNED_OUT' });
  Object.assign(req, {
    user: { userId: `user-${who}`, email: `${who}@example.com`, name: `User ${who}`, image: null },
    workspace: { tenantId: `tenant-${who}`, role: 'owner' }
  });
  next();
}

let server: Server;
let base: string;
let store: MemoryKeyStore;
const testKey = jest.fn(async (_platform: string, _secrets: Record<string, string>) => ({
  ok: true,
  message: 'DeepSeek accepted this key.'
}));

function start(storageReady: boolean, limiter: PerUserRateLimiter) {
  const app = express();
  app.use(express.json());
  app.use('/api/me', createMeRouter({ requireUser: fakeRequireUser, keys: new WorkspaceKeysService(store, () => storageReady), testKey, limiter }));
  const s = app.listen(0);
  return { s, url: `http://127.0.0.1:${(s.address() as AddressInfo).port}` };
}

beforeEach(() => {
  store = new MemoryKeyStore();
  testKey.mockClear();
  const started = start(true, new PerUserRateLimiter(2, 60_000));
  server = started.s;
  base = started.url;
});

afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

const call = (user: string | null, method: string, path: string, body?: unknown, root = base) =>
  fetch(`${root}/api/me${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { 'x-test-user': user } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

describe('/api/me', () => {
  it("returns only the caller's own profile and role, no tenant id", async () => {
    const res = await call('a', 'GET', '');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { email: 'a@example.com', name: 'User a', image: null }, workspace: { role: 'owner' } });
  });

  it('rejects signed-out callers', async () => {
    expect((await call(null, 'GET', '/credentials')).status).toBe(401);
  });

  it('saves, lists masked, and deletes a key', async () => {
    const put = await call('a', 'PUT', '/credentials/deepseek', { apiKey: 'sk-abcdefghijkl9876' });
    expect(put.status).toBe(200);
    expect((await put.json()).last4).toBe('••••9876');

    const list = await (await call('a', 'GET', '/credentials')).json();
    expect(list.credentials).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain('abcdefghijkl');

    expect((await call('a', 'DELETE', '/credentials/deepseek')).status).toBe(200);
    expect((await (await call('a', 'GET', '/credentials')).json()).credentials).toEqual([]);
  });

  it("isolates users: B cannot see, test or delete A's key", async () => {
    await call('a', 'PUT', '/credentials/deepseek', { apiKey: 'sk-abcdefghijkl9876' });
    expect((await (await call('b', 'GET', '/credentials')).json()).credentials).toEqual([]);
    expect((await call('b', 'POST', '/credentials/deepseek/test')).status).toBe(404);
    expect((await call('b', 'DELETE', '/credentials/deepseek')).status).toBe(404);
    expect((await (await call('a', 'GET', '/credentials')).json()).credentials).toHaveLength(1);
  });

  it('400 for unknown platforms and bad shapes', async () => {
    const unknown = await call('a', 'PUT', '/credentials/substack', { apiKey: 'x' });
    expect(unknown.status).toBe(400);
    expect((await unknown.json()).allowedPlatforms).toEqual(['deepseek', 'assemblyai', 'devto', 'linkedin', 'twitter']);

    const bad = await call('a', 'PUT', '/credentials/linkedin', { apiKey: 'x' });
    expect(bad.status).toBe(400);
    expect((await bad.json()).allowedFields).toEqual(['accessToken']);
  });

  it('tests a saved key and rate limits per user', async () => {
    await call('a', 'PUT', '/credentials/deepseek', { apiKey: 'sk-abcdefghijkl9876' });
    const first = await call('a', 'POST', '/credentials/deepseek/test');
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual(expect.objectContaining({ ok: true, message: 'DeepSeek accepted this key.' }));
    expect(testKey).toHaveBeenCalledWith('deepseek', { apiKey: 'sk-abcdefghijkl9876' });

    await call('a', 'POST', '/credentials/deepseek/test');
    expect((await call('a', 'POST', '/credentials/deepseek/test')).status).toBe(429);
  });

  it('503 KEY_STORAGE_UNCONFIGURED when storage is not configured', async () => {
    const { s, url } = start(false, new PerUserRateLimiter());
    const res = await call('a', 'GET', '/credentials', undefined, url);
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('KEY_STORAGE_UNCONFIGURED');
    await new Promise<void>((r) => s.close(() => r()));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace apps/orchestrator -- meRouter`
Expected: FAIL — `Cannot find module '../routes/me'`.

- [ ] **Step 3: Implement the router**

Create `apps/orchestrator/src/routes/me.ts`:

```ts
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
    console.error('[/api/me] Unexpected error:', (err as Error)?.message || err);
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
```

- [ ] **Step 4: Mount it and remove the legacy credentials route**

In `apps/orchestrator/src/index.ts`:
1. Delete the import line that imports `credentialsRouter` from `'./routes/credentials'`.
2. Add these imports next to the other route/service imports:

```ts
import { createMeRouter } from './routes/me';
import { createRequireUser } from './middleware/requireUser';
import { workspaceService } from './services/workspaceService';
import { workspaceKeysService } from './services/workspaceKeysService';
import { testKey, PerUserRateLimiter } from './services/keyTesters';
```

3. Replace the line `app.use('/api/credentials', credentialsRouter);` with:

```ts
app.use(
  '/api/me',
  createMeRouter({
    requireUser: createRequireUser({ authBaseUrl: process.env.NEON_AUTH_BASE_URL, workspaces: workspaceService }),
    keys: workspaceKeysService,
    testKey,
    limiter: new PerUserRateLimiter()
  })
);
```

4. Delete the legacy route file: `git rm apps/orchestrator/src/routes/credentials.ts`

Run: `grep -rn "routes/credentials\|credentialsRouter" apps/orchestrator/src`
Expected: no output. If another file imported it, remove that usage and report it.

- [ ] **Step 5: Verify**

Run: `npm test --workspace apps/orchestrator -- meRouter`
Expected: PASS — 7 tests.

Run: `npm test --workspace apps/orchestrator`
Expected: all suites PASS.

Run: `cd apps/orchestrator && npx tsc --noEmit; echo "exit $?"; cd ../..`
Expected: `exit 0`

- [ ] **Step 6: Commit**

```bash
git add apps/orchestrator/src/routes/me.ts apps/orchestrator/src/index.ts apps/orchestrator/src/__tests__/meRouter.test.ts
git commit -m "feat(api): /api/me profile and BYOK key routes; remove company-name credential routes"
```

(`git rm` already staged the deletion.)

---

### Task 7: Web auth foundation

**Files:**
- Modify: `apps/web/package.json` (add `@neondatabase/neon-js@0.7.0-beta`)
- Modify: `apps/web/src/vite-env.d.ts`
- Create: `apps/web/src/auth/authClient.ts`, `apps/web/src/auth/useSession.ts`, `apps/web/src/auth/authorizedFetch.ts`
- Test: `apps/web/src/auth/useSession.test.tsx`, `apps/web/src/auth/authorizedFetch.test.ts`

**Interfaces:**
- Produces:
  - `interface AuthLike { getSession(): Promise<{ data: { user?: { id: string; email: string; name?: string | null; image?: string | null } | null; session?: unknown } | null; error: unknown }>; signIn: { social(o: { provider: 'google'; callbackURL: string }): Promise<unknown> }; signOut(): Promise<unknown>; token(): Promise<{ data: { token?: string } | null; error: unknown }> }`
  - `const authClient: AuthLike | null` (null when `VITE_NEON_AUTH_URL` is unset)
  - `interface SessionUser { id: string; email: string; name: string | null; image: string | null }`
  - `type SessionState = { status: 'unconfigured' } | { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; user: SessionUser }`
  - `function useSession(client?: AuthLike | null): { state: SessionState; signInWithGoogle(): Promise<void>; signOut(): Promise<void>; refresh(): Promise<void> }`
  - `class SignedOutError extends Error`
  - `function authorizedFetch(path: string, init?: RequestInit, client?: AuthLike | null): Promise<Response>`

- [ ] **Step 1: Install the SDK and add the env type**

Run: `npm install @neondatabase/neon-js@0.7.0-beta --workspace apps/web`

In `apps/web/src/vite-env.d.ts`, inside the `ImportMetaEnv` interface, add:

```ts
  /** Neon Auth (managed Better Auth) base URL; sign-in is hidden when unset. */
  readonly VITE_NEON_AUTH_URL?: string;
```

- [ ] **Step 2: Write the failing tests**

Create `apps/web/src/auth/authorizedFetch.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { authorizedFetch, SignedOutError } from './authorizedFetch';
import type { AuthLike } from './authClient';

function client(tokens: Array<string | undefined>): AuthLike {
  const queue = [...tokens];
  return {
    getSession: vi.fn(),
    signIn: { social: vi.fn() },
    signOut: vi.fn(),
    token: vi.fn(async () => ({ data: { token: queue.shift() }, error: null }))
  } as unknown as AuthLike;
}

afterEach(() => vi.unstubAllGlobals());

describe('authorizedFetch', () => {
  it('sends the bearer token', async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    await authorizedFetch('/api/me', { method: 'GET' }, client(['t1']));
    expect(new Headers(f.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer t1');
  });

  it('retries once with a fresh token on 401', async () => {
    const f = vi
      .fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', f);
    const res = await authorizedFetch('/api/me', {}, client(['old', 'new']));
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
    expect(new Headers(f.mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer new');
  });

  it('throws SignedOutError without a token or without a client', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(authorizedFetch('/api/me', {}, client([undefined]))).rejects.toBeInstanceOf(SignedOutError);
    await expect(authorizedFetch('/api/me', {}, null)).rejects.toBeInstanceOf(SignedOutError);
  });
});
```

Create `apps/web/src/auth/useSession.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSession } from './useSession';
import type { AuthLike } from './authClient';

function client(user: { id: string; email: string; name?: string | null; image?: string | null } | null) {
  return {
    getSession: vi.fn(async () => ({ data: user ? { user, session: {} } : null, error: null })),
    signIn: { social: vi.fn(async () => undefined) },
    signOut: vi.fn(async () => undefined),
    token: vi.fn()
  };
}

describe('useSession', () => {
  it('reports unconfigured without a client', () => {
    const { result } = renderHook(() => useSession(null));
    expect(result.current.state).toEqual({ status: 'unconfigured' });
  });

  it('resolves a signed-in user from the session', async () => {
    const c = client({ id: 'u1', email: 'a@example.com', name: 'A', image: null });
    const { result } = renderHook(() => useSession(c as unknown as AuthLike));
    await waitFor(() => expect(result.current.state.status).toBe('signed-in'));
    expect(result.current.state).toEqual({ status: 'signed-in', user: { id: 'u1', email: 'a@example.com', name: 'A', image: null } });
  });

  it('resolves signed-out when there is no session', async () => {
    const c = client(null);
    const { result } = renderHook(() => useSession(c as unknown as AuthLike));
    await waitFor(() => expect(result.current.state.status).toBe('signed-out'));
  });

  it('starts Google sign-in back to the current page', async () => {
    const c = client(null);
    const { result } = renderHook(() => useSession(c as unknown as AuthLike));
    await act(() => result.current.signInWithGoogle());
    expect(c.signIn.social).toHaveBeenCalledWith({ provider: 'google', callbackURL: window.location.href });
  });

  it('signs out and returns to signed-out', async () => {
    const c = client({ id: 'u1', email: 'a@example.com' });
    const { result } = renderHook(() => useSession(c as unknown as AuthLike));
    await waitFor(() => expect(result.current.state.status).toBe('signed-in'));
    c.getSession.mockResolvedValue({ data: null, error: null });
    await act(() => result.current.signOut());
    expect(c.signOut).toHaveBeenCalled();
    expect(result.current.state.status).toBe('signed-out');
  });
});
```

Note: the hook must be called with a stable client object (created outside `renderHook`'s callback), otherwise its effect re-runs every render.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test --workspace apps/web -- authorizedFetch useSession`
Expected: FAIL — cannot resolve `./authorizedFetch` / `./useSession`.

- [ ] **Step 4: Implement**

Create `apps/web/src/auth/authClient.ts`:

```ts
import { createAuthClient } from '@neondatabase/neon-js/auth';

export interface AuthLike {
  getSession(): Promise<{
    data: { user?: { id: string; email: string; name?: string | null; image?: string | null } | null; session?: unknown } | null;
    error: unknown;
  }>;
  signIn: { social(o: { provider: 'google'; callbackURL: string }): Promise<unknown> };
  signOut(): Promise<unknown>;
  token(): Promise<{ data: { token?: string } | null; error: unknown }>;
}

const baseUrl = (import.meta.env.VITE_NEON_AUTH_URL || '').trim();

/**
 * Neon Auth client. `credentials: 'include'` lets the cross-origin auth domain's
 * session cookie ride along so `token()` can mint the JWT our API verifies.
 * Null when the URL is unset: the console then hides sign-in instead of failing.
 */
export const authClient: AuthLike | null = baseUrl
  ? (createAuthClient(baseUrl, { fetchOptions: { credentials: 'include' } }) as unknown as AuthLike)
  : null;
```

Create `apps/web/src/auth/useSession.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { authClient, AuthLike } from './authClient';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export type SessionState =
  | { status: 'unconfigured' }
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: SessionUser };

export function useSession(client: AuthLike | null = authClient) {
  const [state, setState] = useState<SessionState>(client ? { status: 'loading' } : { status: 'unconfigured' });

  const refresh = useCallback(async () => {
    if (!client) return;
    try {
      const { data } = await client.getSession();
      const u = data?.user;
      setState(
        u
          ? { status: 'signed-in', user: { id: u.id, email: u.email, name: u.name ?? null, image: u.image ?? null } }
          : { status: 'signed-out' }
      );
    } catch {
      setState({ status: 'signed-out' });
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signInWithGoogle = useCallback(async () => {
    if (!client) return;
    await client.signIn.social({ provider: 'google', callbackURL: window.location.href });
  }, [client]);

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.signOut();
    await refresh();
  }, [client, refresh]);

  return { state, signInWithGoogle, signOut, refresh };
}
```

Create `apps/web/src/auth/authorizedFetch.ts`:

```ts
import { authClient, AuthLike } from './authClient';
import { apiUrl } from '../config/api';

export class SignedOutError extends Error {
  constructor(message = 'Sign in required.') {
    super(message);
    this.name = 'SignedOutError';
  }
}

/** Fetch an `/api/me/*` route as the signed-in user; retries once on 401 with a fresh token. */
export async function authorizedFetch(
  path: string,
  init: RequestInit = {},
  client: AuthLike | null = authClient
): Promise<Response> {
  if (!client) throw new SignedOutError('Sign-in is not configured.');

  const send = async () => {
    const { data } = await client.token();
    const token = data?.token;
    if (!token) throw new SignedOutError();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(apiUrl(path), { ...init, headers });
  };

  const first = await send();
  return first.status === 401 ? send() : first;
}
```

- [ ] **Step 5: Verify**

Run: `npm test --workspace apps/web -- authorizedFetch useSession`
Expected: PASS — 8 tests.

Run: `cd apps/web && npx tsc --noEmit; echo "exit $?"; cd ../..`
Expected: `exit 0`

Run: `npm run build --workspace apps/web`
Expected: build succeeds with both `prerender:` lines. If it fails resolving Node-only dependencies pulled in by `@neondatabase/neon-js`, uninstall it, install `@neondatabase/auth@0.5.0-beta`, change the import in `authClient.ts` to `import { createAuthClient } from '@neondatabase/auth';`, re-run tests and build, and report the switch as a concern.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json package-lock.json apps/web/src/vite-env.d.ts apps/web/src/auth
git commit -m "feat(web): Neon Auth client, session hook and authorized fetch"
```

(Stage `apps/web/package-lock.json` too if npm changed it.)

---

### Task 8: Web UI — AccountMenu, KeysPanel, App wiring

**Files:**
- Create: `apps/web/src/components/AccountMenu.tsx`, `apps/web/src/components/KeysPanel.tsx`
- Modify: `apps/web/src/App.tsx` (imports, session, header, modal render)
- Delete: `apps/web/src/components/ClientCredentialsModal.tsx`
- Test: `apps/web/src/components/AccountMenu.test.tsx`, `apps/web/src/components/KeysPanel.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `SessionState` (Task 7); `authorizedFetch` (Task 7).
- Produces:
  - `AccountMenu: React.FC<{ session: ReturnType<typeof useSession>; onOpenKeys: () => void; isGlass: boolean }>`
  - `KeysPanel: React.FC<{ isOpen: boolean; onClose: () => void; signedIn: boolean; isGlass: boolean; fetcher?: (path: string, init?: RequestInit) => Promise<Response> }>`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/components/AccountMenu.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountMenu } from './AccountMenu';

const base = {
  signInWithGoogle: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  refresh: vi.fn(async () => undefined)
};

describe('AccountMenu', () => {
  it('renders nothing when sign-in is unconfigured', () => {
    const { container } = render(<AccountMenu session={{ ...base, state: { status: 'unconfigured' } }} onOpenKeys={vi.fn()} isGlass={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers Google sign-in when signed out', () => {
    const signInWithGoogle = vi.fn(async () => undefined);
    render(<AccountMenu session={{ ...base, signInWithGoogle, state: { status: 'signed-out' } }} onOpenKeys={vi.fn()} isGlass={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
    expect(signInWithGoogle).toHaveBeenCalled();
  });

  it("shows only the signed-in user's own name, Keys and Sign out", () => {
    const signOut = vi.fn(async () => undefined);
    const onOpenKeys = vi.fn();
    render(
      <AccountMenu
        session={{ ...base, signOut, state: { status: 'signed-in', user: { id: 'u1', email: 'a@example.com', name: 'Ana', image: null } } }}
        onOpenKeys={onOpenKeys}
        isGlass={false}
      />
    );
    expect(screen.getByText('Ana')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Your keys' }));
    expect(onOpenKeys).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalled();
  });
});
```

Create `apps/web/src/components/KeysPanel.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KeysPanel } from './KeysPanel';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('KeysPanel', () => {
  it('prompts to sign in when signed out', () => {
    render(<KeysPanel isOpen onClose={vi.fn()} signedIn={false} isGlass={false} fetcher={vi.fn()} />);
    expect(screen.getByText('Sign in to add your own keys.')).toBeInTheDocument();
  });

  it('lists masked keys from the API', async () => {
    const fetcher = vi.fn(async (_path: string, _init?: RequestInit) =>
      json({ credentials: [{ platform: 'deepseek', accountHandle: null, last4: '••••9876', updatedAt: '2026-09-13T12:00:00.000Z', lastTest: null }] })
    );
    render(<KeysPanel isOpen onClose={vi.fn()} signedIn isGlass={false} fetcher={fetcher} />);
    await waitFor(() => expect(screen.getByText('••••9876')).toBeInTheDocument());
    expect(fetcher).toHaveBeenCalledWith('/api/me/credentials', undefined);
  });

  it('saves the platform-specific field shape', async () => {
    const fetcher = vi.fn(async (_path: string, init?: RequestInit) =>
      init?.method === 'PUT'
        ? json({ platform: 'linkedin', accountHandle: null, last4: '••••abcd', updatedAt: '2026-09-13T12:00:00.000Z', lastTest: null })
        : json({ credentials: [] })
    );
    render(<KeysPanel isOpen onClose={vi.fn()} signedIn isGlass={false} fetcher={fetcher} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'LinkedIn' }));
    fireEvent.change(screen.getByLabelText('Access token'), { target: { value: 'li-token-abcd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        '/api/me/credentials/linkedin',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ accessToken: 'li-token-abcd' }) })
      )
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace apps/web -- AccountMenu KeysPanel`
Expected: FAIL — cannot resolve `./AccountMenu` / `./KeysPanel`.

- [ ] **Step 3: Implement AccountMenu**

Create `apps/web/src/components/AccountMenu.tsx`:

```tsx
import React from 'react';
import { Key, LogIn, LogOut } from 'lucide-react';
import type { useSession } from '../auth/useSession';

interface AccountMenuProps {
  session: ReturnType<typeof useSession>;
  onOpenKeys: () => void;
  isGlass: boolean;
}

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1';

/** Shows only the signed-in person's own account. Nothing about other users. */
export const AccountMenu: React.FC<AccountMenuProps> = ({ session, onOpenKeys, isGlass }) => {
  const { state } = session;
  const chip = `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-colors duration-200 cursor-pointer ${focus} ${
    isGlass ? 'bg-white/80 border-[#e2ded5] text-slate-700 hover:text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
  }`;

  if (state.status === 'unconfigured') return null;

  if (state.status === 'loading') {
    return (
      <span className={`${chip} cursor-default opacity-60`} aria-live="polite">
        Checking sign-in…
      </span>
    );
  }

  if (state.status === 'signed-out') {
    return (
      <button type="button" className={chip} onClick={() => void session.signInWithGoogle()}>
        <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Sign in with Google</span>
      </button>
    );
  }

  const label = state.user.name || state.user.email;
  return (
    <div className="flex items-center gap-2">
      <span className={`${chip} cursor-default`}>
        {state.user.image ? <img src={state.user.image} alt="" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" /> : null}
        <span className="max-w-[10rem] truncate">{label}</span>
      </span>
      <button type="button" className={chip} onClick={onOpenKeys} aria-label="Your keys">
        <Key className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Keys</span>
      </button>
      <button type="button" className={chip} onClick={() => void session.signOut()} aria-label="Sign out">
        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Implement KeysPanel**

Create `apps/web/src/components/KeysPanel.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import { authorizedFetch } from '../auth/authorizedFetch';

type Platform = 'deepseek' | 'assemblyai' | 'devto' | 'linkedin' | 'twitter';

interface MaskedKey {
  platform: Platform;
  accountHandle: string | null;
  last4: string;
  updatedAt: string;
  lastTest: { ok: boolean; testedAt: string } | null;
}

const PLATFORMS: Array<{ id: Platform; label: string; fields: Array<{ name: string; label: string }> }> = [
  { id: 'deepseek', label: 'DeepSeek', fields: [{ name: 'apiKey', label: 'API key' }] },
  { id: 'assemblyai', label: 'AssemblyAI', fields: [{ name: 'apiKey', label: 'API key' }] },
  { id: 'devto', label: 'dev.to', fields: [{ name: 'apiKey', label: 'API key' }] },
  { id: 'linkedin', label: 'LinkedIn', fields: [{ name: 'accessToken', label: 'Access token' }] },
  {
    id: 'twitter',
    label: 'X',
    fields: [
      { name: 'apiKey', label: 'API key' },
      { name: 'apiSecret', label: 'API secret' },
      { name: 'accessToken', label: 'Access token' },
      { name: 'accessTokenSecret', label: 'Access token secret' }
    ]
  }
];

interface KeysPanelProps {
  isOpen: boolean;
  onClose: () => void;
  signedIn: boolean;
  isGlass: boolean;
  fetcher?: (path: string, init?: RequestInit) => Promise<Response>;
}

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500';

export const KeysPanel: React.FC<KeysPanelProps> = ({ isOpen, onClose, signedIn, isGlass, fetcher = authorizedFetch }) => {
  const [keys, setKeys] = useState<MaskedKey[]>([]);
  const [active, setActive] = useState<Platform>('deepseek');
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetcher('/api/me/credentials', undefined);
    const body = await res.json();
    if (res.ok) setKeys(body.credentials);
    else setMessage({ ok: false, text: body.error || 'Could not load your keys.' });
  }, [fetcher]);

  useEffect(() => {
    if (isOpen && signedIn) void load().catch(() => setMessage({ ok: false, text: 'Could not load your keys.' }));
  }, [isOpen, signedIn, load]);

  if (!isOpen) return null;

  const platform = PLATFORMS.find((p) => p.id === active)!;
  const saved = keys.find((k) => k.platform === active);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch {
      setMessage({ ok: false, text: 'Request failed. Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const body: Record<string, string> = {};
      platform.fields.forEach((f) => (body[f.name] = values[`${active}.${f.name}`] || ''));
      const res = await fetcher(`/api/me/credentials/${active}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const out = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: out.error || 'Could not save this key.' });
        return;
      }
      setValues({});
      setMessage({ ok: true, text: `${platform.label} key saved.` });
      await load();
    });

  const test = () =>
    run(async () => {
      const res = await fetcher(`/api/me/credentials/${active}/test`, { method: 'POST' });
      const out = await res.json();
      setMessage({ ok: Boolean(res.ok && out.ok), text: out.message || out.error || 'Test failed.' });
      await load();
    });

  const remove = () =>
    run(async () => {
      const res = await fetcher(`/api/me/credentials/${active}`, { method: 'DELETE' });
      const out = await res.json();
      setMessage({ ok: res.ok, text: res.ok ? `${platform.label} key removed.` : out.error || 'Could not remove this key.' });
      await load();
    });

  const surface = isGlass ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-950 text-slate-100 border-slate-800';
  const button = `px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors duration-200 cursor-pointer disabled:opacity-50 ${focus}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="keys-title">
      <div className={`w-full max-w-lg rounded-2xl border p-6 ${surface}`}>
        <div className="flex items-center justify-between">
          <h2 id="keys-title" className="flex items-center gap-2 text-lg font-bold">
            <KeyRound className="w-5 h-5" aria-hidden="true" /> Your keys
          </h2>
          <button type="button" onClick={onClose} aria-label="Close keys" className={`${button} border-transparent`}>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {!signedIn ? (
          <p className="mt-6 text-sm">Sign in to add your own keys.</p>
        ) : (
          <>
            <p className="mt-2 text-xs opacity-70">Stored encrypted in your private workspace. Only the last 4 characters are ever shown.</p>
            <div role="tablist" aria-label="Platforms" className="mt-4 flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  role="tab"
                  type="button"
                  aria-selected={active === p.id}
                  onClick={() => {
                    setActive(p.id);
                    setMessage(null);
                  }}
                  className={`${button} ${active === p.id ? 'border-cyan-500' : 'border-slate-500/30'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs">
              {saved ? (
                <p>
                  Saved: <span className="font-mono">{saved.last4}</span>
                  {saved.lastTest ? ` · last test ${saved.lastTest.ok ? 'passed' : 'failed'}` : ' · not tested yet'}
                </p>
              ) : (
                <p className="opacity-70">No {platform.label} key saved.</p>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {platform.fields.map((f) => {
                const id = `key-${active}-${f.name}`;
                return (
                  <div key={id}>
                    <label htmlFor={id} className="block text-xs font-semibold">
                      {f.label}
                    </label>
                    <input
                      id={id}
                      type="password"
                      autoComplete="off"
                      value={values[`${active}.${f.name}`] || ''}
                      onChange={(e) => setValues((v) => ({ ...v, [`${active}.${f.name}`]: e.target.value }))}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-transparent border-slate-500/40 ${focus}`}
                    />
                  </div>
                );
              })}
            </div>

            {message ? (
              <p role="status" className={`mt-4 text-xs ${message.ok ? 'text-emerald-500' : 'text-rose-500'}`}>
                {message.text}
              </p>
            ) : null}

            <div className="mt-5 flex gap-2">
              <button type="button" disabled={busy} onClick={() => void save()} className={`${button} border-cyan-500`}>
                Save key
              </button>
              <button type="button" disabled={busy || !saved} onClick={() => void test()} className={`${button} border-slate-500/40`}>
                Test
              </button>
              <button type="button" disabled={busy || !saved} onClick={() => void remove()} className={`${button} border-rose-500/50`}>
                Remove
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Run component tests**

Run: `npm test --workspace apps/web -- AccountMenu KeysPanel`
Expected: PASS — 6 tests.

- [ ] **Step 6: Wire App.tsx**

In `apps/web/src/App.tsx`:
1. Replace `import { ClientCredentialsModal } from './components/ClientCredentialsModal';` with:

```tsx
import { KeysPanel } from './components/KeysPanel';
import { AccountMenu } from './components/AccountMenu';
import { useSession } from './auth/useSession';
```

2. Replace `  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);` with:

```tsx
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const session = useSession();
```

3. Replace `          {/* 💎 Plans & Spoken ROI Calculator Trigger */}` with:

```tsx
          {/* Account: Google sign-in, own keys, sign out */}
          <AccountMenu session={session} onOpenKeys={() => setIsCredentialsModalOpen(true)} isGlass={isGlass} />

          {/* 💎 Plans & Spoken ROI Calculator Trigger */}
```

4. Replace:

```tsx
      {/* Client Connected Platforms & Cloud Credentials Modal */}
      <ClientCredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        companyName={prospectCompany || 'DesignAcademy Studio'}
        theme={theme}
      />
```

with:

```tsx
      {/* Your keys (BYOK), private to the signed-in workspace */}
      <KeysPanel
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        signedIn={session.state.status === 'signed-in'}
        isGlass={isGlass}
      />
```

5. Delete the old modal: `git rm apps/web/src/components/ClientCredentialsModal.tsx`

Run: `grep -rn "ClientCredentialsModal" apps/web/src`
Expected: no output. `ContentFactoryStudio.tsx` keeps its `onOpenCredentialsModal` prop. If it imports or renders `ClientCredentialsModal` itself, replace that render with `<KeysPanel isOpen={isCredentialsModalOpen} onClose={() => setIsCredentialsModalOpen(false)} signedIn={false} isGlass={isGlass} />` (using that component's own state/theme variables) and report it.

- [ ] **Step 7: Verify**

Run: `npm test --workspace apps/web`
Expected: all web tests PASS.

Run: `cd apps/web && npx tsc --noEmit; echo "exit $?"; cd ../..`
Expected: `exit 0`

Run: `npm run build --workspace apps/web`
Expected: build succeeds with both `prerender:` lines and `apps/web/dist/index.html` exists.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/AccountMenu.tsx apps/web/src/components/AccountMenu.test.tsx apps/web/src/components/KeysPanel.tsx apps/web/src/components/KeysPanel.test.tsx apps/web/src/App.tsx
git commit -m "feat(web): Google sign-in menu and private Keys panel"
```

(`git rm` already staged the deletion; stage `ContentFactoryStudio.tsx` if Step 6 changed it.)

---

### Task 9: Configuration, docs and full verification

**Files:**
- Modify: `.env.example`, `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: documented setup; green full verification. No push (the controller asks the user first).

- [ ] **Step 1: `.env.example`**

Append:

```bash
# --- Sign-in (Neon Auth, managed Better Auth) ---
# Orchestrator: verifies session tokens (JWKS at <url>/.well-known/jwks.json).
NEON_AUTH_BASE_URL=
# Web build: shows "Sign in with Google" when set.
VITE_NEON_AUTH_URL=
```

- [ ] **Step 2: `CLAUDE.md`**

In the `## ⚠️ Current Implementation Status` table, replace the whole `| Multi-tenant auth | ... |` row with:

```markdown
| Sign-in and private workspaces | `NEON_AUTH_BASE_URL` (orchestrator) and `VITE_NEON_AUTH_URL` (web build) set | Sign-in button hidden; `/api/me/*` returns 503 `AUTH_UNCONFIGURED`. Any Google account gets its own workspace; users never see each other. |
| BYOK keys (DeepSeek, AssemblyAI, LinkedIn, X, dev.to) | Signed in, and `DATABASE_URL` + `MASTER_KEY` set | 503 `KEY_STORAGE_UNCONFIGURED`. Stored encrypted per workspace, shown as last-4 only. **Stored keys are not yet used** for voice or drafts (sub-project 2). |
| Key "Test" button | DeepSeek, AssemblyAI, dev.to, LinkedIn: free read-only call | X is never called (paid API reads) and says so. |
| Owner-only demo routes (content trigger/audit/approve/reject/publish/dispatch/auto-pipeline, compliance log, Instatic, billing usage/record-call) | `ORCHESTRATOR_API_KEY` set | Local dev: open. **Production: 503 `ADMIN_UNCONFIGURED`.** |
```

In `## 🏗️ Repository Architecture`, replace `  * Credentials Routes: \`apps/orchestrator/src/routes/credentials.ts\`` with `  * Per-user routes (profile, BYOK keys): \`apps/orchestrator/src/routes/me.ts\``, and replace `  * Client Credentials Modal: \`apps/web/src/components/ClientCredentialsModal.tsx\`` with `  * Keys panel (BYOK) and account menu: \`apps/web/src/components/KeysPanel.tsx\`, \`apps/web/src/components/AccountMenu.tsx\``.

In `## 🎯 How to Integrate a User's Business`, replace the `### 2. Configure Cloud Social Credentials` section's `curl` example with this text (keep the heading):

```markdown
Sign in to the console with Google and open **Keys**. Keys are saved to your private workspace through `PUT /api/me/credentials/:platform` with a signed-in session token; there is no company-name credentials route any more.
```

- [ ] **Step 3: `README.md`**

In the `| Variable | Needed for |` table under "Run it locally", add a row after the `DATABASE_URL` row:

```markdown
| `NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL` | Google sign-in and private workspaces. Without them the sign-in button is hidden and `/api/me` returns 503. |
```

Change the `MASTER_KEY` row's right-hand cell to `Encrypting stored credentials, including each user's own keys. Without it, keys are never persisted.`

In the "What is real today" table, replace the cell `Multi-tenant login and accounts` with `Using each user's own keys for voice and drafts` in the "Not built yet" column, and add `Google sign-in with a private workspace and encrypted BYOK keys` to the "Real" column in the same row.

After the sentence starting `Create the tables with`, add: `This also creates the \`organization_members\` table used for workspaces.`

- [ ] **Step 4: Full verification**

Run: `npm test --workspace apps/orchestrator`
Expected: all suites PASS (63 original + auth 2, workspaceService 9, requireUser 9, workspaceKeysService 9, keyTesters 8, meRouter 7 = 107).

Run: `npm test --workspace apps/web`
Expected: all PASS (27 original + authorizedFetch 3, useSession 5, AccountMenu 3, KeysPanel 3 = 41).

Run: `cd apps/orchestrator && npx tsc --noEmit; echo "orch tsc $?"; cd ../web && npx tsc --noEmit; echo "web tsc $?"; cd ../..`
Expected: `orch tsc 0`, `web tsc 0`

Run: `npm run build --workspace apps/web`
Expected: success with both `prerender:` lines.

Run: `grep -rnE "console\.(log|error|warn).*(secrets|apiKey|accessToken)" apps/orchestrator/src | grep -v __tests__`
Expected: no output (no secrets logged).

- [ ] **Step 5: Commit**

```bash
git add .env.example CLAUDE.md README.md
git commit -m "docs: sign-in, private workspaces and BYOK keys setup"
```

- [ ] **Step 6: User setup checklist (report only — do not run)**

Include these steps verbatim in the report for the user, to run after merge:

1. `npx neon@latest auth` — sign in to the Neon CLI.
2. `npx neon@latest link` — link this repo to the Neon project.
3. `npx neon@latest neon-auth domain add https://growthvoice-os.vercel.app` — trust the production domain.
4. `npx neon@latest neon-auth domain allow-localhost` — allow local sign-in.
5. From `apps/orchestrator`: `npx dotenv -e ../../.env.local -- npx drizzle-kit push` — create `organization_members`.
6. In Vercel project settings add `NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL` and `ORCHESTRATOR_API_KEY`, then redeploy.
7. Before inviting real users: create a Google OAuth app with redirect URI `{NEON_AUTH_BASE_URL}/callback/google`, add its credentials in the Neon Console under Auth, and publish Privacy and Terms pages (sub-project 5).
