# Sign-in, Private Workspaces and Bring-Your-Own-Keys — Design (Sub-project 1 of 5)

**Date:** 2026-09-13
**Status:** Design approved in chat; pending written-spec review
**Goal:** Anyone can sign in to GrowthVoice OS with their Google account and gets a private workspace where they store their own API keys, encrypted. No user can see or reach another user's account, keys, or data. The public demo keeps working unchanged for signed-out visitors.

## Programme context

| # | Sub-project | Depends on |
|---|---|---|
| **1** | **Sign-in, private workspaces, Keys tab (this spec)** | — |
| 2 | Use each user's own keys: voice calls on their AssemblyAI key, drafts on their DeepSeek key | 1 |
| 3 | Honest draft generation (facts-grounded LinkedIn / X / dev.to drafts, no invented numbers) | 1, 2 |
| 4 | Drafts workspace: read, edit, approve, publish (pre-filled manual posting now, API later) | 1, 3 |
| 5 | Business model and trust pages: hybrid pricing (Managed plans on the owner's keys with minutes included, plus a flat BYOK software plan), About, Security, key setup guide, Privacy and Terms | — (Privacy/Terms needed before a public Google OAuth launch) |

## Decisions (made with the user)

| Decision | Choice | Why |
|---|---|---|
| Auth provider | Neon Auth (managed Better Auth), already provisioned on the project | Free to 60,000 MAU, users stored in the existing Neon Postgres, no auth server to run |
| Sign-in method | Google | One click; Neon Auth provides shared Google credentials for development |
| Who can sign in | Anyone with a Google account | Ready for future clients from day one |
| Isolation | One private workspace per user, created on first sign-in | Users are independent: not linked to the owner, not visible to each other |
| Keys stored | DeepSeek, AssemblyAI, LinkedIn, X, dev.to | Users' usage never spends the owner's balances (consumption is sub-project 2) |
| Public surface | Voice demo, CRM demo, `/product`, `/pricing`, checkout, consent, widget stay open on the owner's server keys | Hackathon judges and visitors must keep the full demo |
| Interim lock on today's open admin routes | Not applied; fixed by this build's fail-closed rule | User's call |
| Future pricing direction | Hybrid: Managed + BYOK plans | Recorded for sub-project 5; no pricing changes in this sub-project |

## Privacy rules (binding)

1. A signed-in user sees only their own Google name, email and avatar, taken from their own session. No endpoint lists users, returns another user's profile, or reveals which workspaces exist.
2. A user's workspace is never linked to, owned by, or visible to the site owner's account. The owner is simply one more user.
3. The workspace for every request comes from the verified token. No route accepts a workspace, tenant, company or client identifier from the URL, query or body for workspace-scoped data.
4. Secrets are never logged, never returned in full, and never included in error messages. Reads return the platform, the account handle if any, the last 4 characters, and timestamps.

## Architecture

```
Browser (apps/web)                         Neon Auth (*.neonauth…neon.tech)
  "Sign in with Google" ──signIn.social──▶  Google OAuth → session cookie
  authClient.token() ◀──────────────────── 15-min EdDSA JWT
       │  Authorization: Bearer <jwt>
       ▼
Express orchestrator (same origin, /api)
  requireUser ── jose.jwtVerify(JWKS at NEON_AUTH_BASE_URL/.well-known/jwks.json)
       │          issuer/audience = origin of NEON_AUTH_BASE_URL
       ▼
  workspaceService.ensureForUser(sub) ── organization_members ─▶ organizations
       │  req.user = { userId, email }   req.workspace = { tenantId, role }
       ▼
  /api/me/*  ── clientCredentialsService (tenant-id methods) ─▶ platform_credentials (AES-256-GCM, existing)
```

### Units

| Unit | Responsibility | Depends on |
|---|---|---|
| `apps/web/src/auth/authClient.ts` | `createAuthClient(import.meta.env.VITE_NEON_AUTH_URL, { fetchOptions: { credentials: 'include' } })` | `@neondatabase/neon-js` |
| `apps/web/src/auth/useSession.ts` | Session state hook: `{ status: 'loading' \| 'signed-out' \| 'signed-in', user }`; refreshes after the OAuth redirect | authClient |
| `apps/web/src/auth/authorizedFetch.ts` | `authorizedFetch(path, init)`: gets `authClient.token()`, adds `Authorization: Bearer`, retries once with a fresh token on 401, throws `SignedOutError` when there is no session | authClient, `config/api.ts` |
| `apps/web/src/components/AccountMenu.tsx` | Header control: "Sign in with Google" when signed out; own avatar, name, **Keys**, **Sign out** when signed in | useSession |
| `apps/web/src/components/KeysPanel.tsx` | Replaces `ClientCredentialsModal`: list, save, test, remove the signed-in user's keys; signed-out state says "Sign in to add your own keys" | authorizedFetch |
| `apps/orchestrator/src/middleware/requireUser.ts` | Verify the JWT; attach `req.user`; call `workspaceService`; attach `req.workspace`; error codes below | `jose`, workspaceService |
| `apps/orchestrator/src/services/workspaceService.ts` | `ensureForUser(authUserId): Promise<{ tenantId, role }>`: return existing membership or create organization + owner membership in one transaction; in-process cache keyed by user id | Drizzle, schema |
| `apps/orchestrator/src/routes/me.ts` | Mounted at `/api/me`, all behind `requireUser` (see API) | requireUser, clientCredentialsService |
| `apps/orchestrator/src/services/keyTesters.ts` | One free, read-only connectivity check per platform (see Testing a key) | fetch |
| `clientCredentialsService.ts` (modified) | Add tenant-id methods: `getMaskedForTenant`, `setForTenant`, `testForTenant`, `deleteForTenant`, `getRawForTenant`; no name-to-tenant resolution in these paths | existing encryption and repository |
| `middleware/auth.ts` `requireApiKey` (modified) | Fail closed in production: when `NODE_ENV === 'production'` and `ORCHESTRATOR_API_KEY` is unset, return 503 `ADMIN_UNCONFIGURED` instead of passing through | — |
| `db/schema.ts` (modified) | New `organization_members` table | Drizzle |

## Data model

New table `organization_members`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK, default random | |
| `tenant_id` | uuid, not null, FK → `organizations.id`, on delete cascade | |
| `auth_user_id` | text, not null | Neon Auth user id (JWT `sub`) |
| `role` | text, not null, default `'owner'` | Only `owner` is created in this sub-project; kept for a future invite feature |
| `created_at` | timestamptz, not null, default now | |

Indexes: unique (`auth_user_id`, `tenant_id`); index (`auth_user_id`).

Workspace creation on first sign-in: insert `organizations` with `name = 'Workspace'` and `slug = 'ws-' + 10 random base36 chars` (retry on slug collision), then insert the owner membership, in one transaction. The user's name or email is not written to `organizations`. Applied with the project's existing `drizzle-kit push` flow.

The existing seeded demo organization and its data are untouched and remain what signed-out demo routes use.

## API

All routes under `/api/me` require a valid token and act only on `req.workspace.tenantId`.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/me` | — | `{ user: { email, name, image }, workspace: { role } }` (no tenant id, no other users) |
| GET | `/api/me/credentials` | — | `{ credentials: [{ platform, accountHandle, last4, updatedAt, lastTest: { ok, testedAt } \| null }] }` |
| PUT | `/api/me/credentials/:platform` | platform-specific secrets (below) + optional `accountHandle` | masked record for that platform |
| POST | `/api/me/credentials/:platform/test` | — | `{ ok: boolean, message: string, testedAt }` |
| DELETE | `/api/me/credentials/:platform` | — | `{ status: 'deleted' }` or 404 |

Allowed platforms and secret shapes (each value a non-empty string, trimmed, max 4 KB):

| Platform | Secrets |
|---|---|
| `deepseek` | `{ apiKey }` |
| `assemblyai` | `{ apiKey }` |
| `devto` | `{ apiKey }` |
| `linkedin` | `{ accessToken }` |
| `twitter` | `{ apiKey, apiSecret, accessToken, accessTokenSecret }` |

The old `/api/credentials/:clientId` routes are removed; `ClientCredentialsModal` is replaced by `KeysPanel`.

### Testing a key (free, read-only calls only)

| Platform | Check |
|---|---|
| `deepseek` | `GET https://api.deepseek.com/models` with the key (no tokens spent) |
| `assemblyai` | Mint a 60-second Voice Agent token (`GET https://agents.assemblyai.com/v1/token?expires_in_seconds=60`) and discard it |
| `devto` | `GET https://dev.to/api/users/me` with the `api-key` header |
| `linkedin` | `GET https://api.linkedin.com/v2/userinfo` with the bearer token |
| `twitter` | Not tested: X API reads are paid per request. Returns `{ ok: false, message: 'X keys are stored but not tested — X charges for API reads.' }` |

Tests are rate limited to 10 per user per minute (in-process). A test result stores only `ok` and `testedAt`, never provider response bodies.

## Route protection after this change

| Routes | Guard |
|---|---|
| `/api/me/*` | `requireUser` |
| Owner-only operations on shared demo data: content `dispatch`, `publish`, `auto-pipeline`, `trigger`, `audit`, job `approve`/`reject`; `compliance/log`; billing `usage/:clientId`, `record-call`; Instatic `generate`, `patch-node`, `ai-assist`, `pages` | `requireApiKey`, now fail-closed in production. Being signed in does not grant these, because any Google user can sign in. |
| Public demo: voice `token`, `chat`; `billing/plans`, `calculate-roi`, `subscribe`; `compliance/policy`, `consent`; CRM demo routes; graph routes; `health`; widget | unchanged |

Consequence to accept: after deploy, these console features return 503 in production until `ORCHESTRATOR_API_KEY` is set, because they operate on shared demo data and (for `trigger`/`audit`) spend the owner's DeepSeek balance: Content Studio **Generate** (`trigger`) and **Audit** (`audit`), job **Approve**/**Reject**, **Publish**/**Dispatch**/**Auto-pipeline**, the compliance log, and Instatic generation. Voice calls, the CRM demo, pricing, checkout and the widget are unaffected. Per-user equivalents of the content features arrive in sub-projects 3 and 4.

## Error handling

| Situation | Response |
|---|---|
| No `Authorization` header on `/api/me/*` | 401 `SIGNED_OUT` |
| Invalid signature, wrong issuer/audience, malformed token | 401 `INVALID_TOKEN` |
| Expired token | 401 `TOKEN_EXPIRED` (web retries once with a fresh token) |
| `NEON_AUTH_BASE_URL` unset | 503 `AUTH_UNCONFIGURED` (all environments) |
| JWKS unreachable | 503 `AUTH_UNAVAILABLE` (not 401, so users aren't told they're signed out when Neon is down) |
| `DATABASE_URL` or `MASTER_KEY` unset when saving a key | 503 `KEY_STORAGE_UNCONFIGURED` (existing refuse-to-store-plaintext rule) |
| Unknown platform or bad secret shape | 400 with the allowed shape |
| Test rate limit exceeded | 429 |

The web app shows these as plain messages; a failed sign-in shows Neon Auth's error text plus "Try again".

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `NEON_AUTH_BASE_URL` | orchestrator (local `.env`, Vercel) | JWKS location and expected issuer/audience |
| `VITE_NEON_AUTH_URL` | web build (local `.env`, Vercel) | Auth client base URL |
| `ORCHESTRATOR_API_KEY` | orchestrator | Owner-only routes and scripts |
| `DATABASE_URL`, `MASTER_KEY` | orchestrator | Existing; required to store keys |

One-time setup by the user (documented in the plan's final task):
1. Sign in to the Neon CLI and link the project.
2. Add `https://growthvoice-os.vercel.app` to Neon Auth trusted domains and allow `localhost`.
3. Add the variables above to Vercel.
4. Before inviting real users: create a Google OAuth app with redirect URI `{NEON_AUTH_BASE_URL}/callback/google`, add its credentials in Neon Auth, and publish Privacy and Terms pages (sub-project 5).

Cost: $0 (Neon Auth free tier; `jose` and `@neondatabase/neon-js` are free libraries; key tests use free endpoints only).

## Testing

**Orchestrator (Jest)**, with an Ed25519 key pair generated in the test and a stubbed JWKS:
- `requireUser`: valid token passes and attaches user and workspace; missing header 401; bad signature 401; wrong issuer 401; expired 401 `TOKEN_EXPIRED`; unset `NEON_AUTH_BASE_URL` 503; JWKS failure 503.
- `workspaceService`: first call creates exactly one organization and one owner membership; second call returns the same tenant; two different users get two different tenants; `organizations` row contains no name or email.
- Isolation: user A saves a DeepSeek key; user B's `GET /api/me/credentials` does not include it; B cannot delete or test A's platform.
- Credentials: masked output never contains more than the last 4 characters; bad shape 400; unknown platform 400; storage unconfigured 503.
- Key testers: each tester called with a mocked `fetch`; X returns the not-tested message without any network call; rate limit 429 on the 11th call.
- `requireApiKey`: production without a key returns 503; with the key, passes; development without a key still passes.

**Web (Vitest + Testing Library):**
- `AccountMenu`: signed-out shows "Sign in with Google" and calls `signIn.social({ provider: 'google' })`; signed-in shows only the session user's name and a Sign out that calls `signOut`.
- `KeysPanel`: renders masked keys from a mocked `authorizedFetch`; saving sends the platform shape; signed-out state shows the sign-in prompt.
- `authorizedFetch`: adds the bearer token; retries once on 401; throws `SignedOutError` without a session.

## Out of scope

Using stored keys for voice or drafts (sub-project 2); draft generation and publishing (3, 4); pricing, About, Security, Privacy and Terms pages (5); team invites and roles beyond `owner`; account deletion and data export; admin tooling; any change to the public demo beyond the owner-only route guards listed under "Route protection after this change".
