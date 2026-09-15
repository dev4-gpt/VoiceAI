# Sub-project 2: Use Each User's Own Keys — Design

**Date:** 2026-09-14
**Status:** Approved for implementation
**Depends on:** Sub-project 1 (Google sign-in via Neon Auth, private workspaces, encrypted BYOK key storage) — merged c5633fb, verified working end-to-end in production as of this session.

## Problem

Sub-project 1 lets a signed-in user save their own DeepSeek/AssemblyAI/LinkedIn/X/dev.to keys, encrypted, in their private workspace. Nothing reads them back yet: voice sessions and the console's chat replies always use the server's own `ASSEMBLYAI_API_KEY` / `DEEPSEEK_API_KEY`, regardless of who's signed in or what they've saved. The Keys panel is a vault with no lock to open.

## Product framing

GrowthVoice OS's model is: a visitor signs in with Google, lands in the normal console, and brings their own AssemblyAI/DeepSeek keys — that's how the product is used and monetized (setup fee + retainer for the infrastructure), not an embeddable widget for third-party sites. Testing this sub-project against the owner's own Google account (`aryamandev777@gmail.com`) stands in for "any other client" going through the same flow. Embedding Anna on a client's own external site (`embed.js`, third-party site visitors who never sign into GrowthVoice OS) is a related but separate, bigger feature — explicitly out of scope here.

## Scope

**In scope:**
1. `POST /api/voice/token` uses the signed-in caller's saved AssemblyAI key, when present, instead of the server's.
2. `POST /api/token/chat` uses the signed-in caller's saved DeepSeek key, when present, instead of the server's.
3. Signed-out visitors and hackathon judges: zero behavior change. Same server keys, same anonymous access, no auth required.
4. `deepseekService`'s default model moves off the retired `deepseek-chat` onto `deepseek-flash` (both the service's own fallback default and the hardcoded override in `/api/token/chat`).
5. `apps/orchestrator/src/db/repository.ts` (568 lines) splits into `db/repository/{tenant,billing,consent,crm,credentials}.ts`, each under ~150 lines, re-exported from `db/repository/index.ts` so no other file's imports change. The duplicated encrypt-and-build-row logic in `credentials.ts`'s `upsert`/`replaceIfUnchanged` folds into one `sealCredentials()` helper.

**Out of scope:**
- `embed.js` / third-party site widget BYOK (needs a new public per-workspace identifier mechanism; separate sub-project).
- The owner-only content pipeline (`/api/content/*`, gated by `requireOwnerKey`) — unrelated to per-user BYOK, untouched.
- Any change to `LinkedIn`/`X`/`dev.to` key usage (those aren't read by any live call path yet; out of scope until the content/publishing sub-project).

## Architecture

Both target routes are fully anonymous today — no auth check, no `req.user`, identical behavior for the owner signed in and a random judge. This sub-project adds an **optional** auth layer, not a gate:

- New `optionalUser` middleware, a sibling to the existing `requireUser` ([apps/orchestrator/src/middleware/requireUser.ts](../../../apps/orchestrator/src/middleware/requireUser.ts)), reusing the same JWT verification (issuer/audience checked against `NEON_AUTH_BASE_URL`, same JWKS).
- Success (valid token): populates `req.user` / `req.workspace`, exactly like `requireUser`.
- Any failure — no `Authorization` header, an invalid/expired token, JWKS temporarily unreachable, workspace resolution failure — the middleware does **not** reject the request. It simply proceeds with `req.user`/`req.workspace` left `undefined`, and the route falls through to today's server-key behavior. This is fail-open by design: the worst case of any auth hiccup here is "used the server key instead of theirs," never a broken or blocked request. Anonymous access must always work, unconditionally.
- The workspace is resolved only from the verified JWT's `sub` claim, never from the request body, query string, or any client-supplied identifier — same invariant `requireUser` already upholds.

## Backend changes

**`deepseekService.createCompletion()`** gains an optional `apiKey` parameter on `DeepSeekCompletionOptions`, defaulting to the service's own server key when omitted. The singleton's own `this.apiKey` is never mutated per-request — it's shared across concurrent requests, so any per-caller key must be threaded through the call, not written onto the instance.

**`POST /api/voice/token`** ([apps/orchestrator/src/routes/token.ts](../../../apps/orchestrator/src/routes/token.ts)): runs `optionalUser` first. If `req.workspace` is set and a saved AssemblyAI key exists for it (via the existing workspace key storage), mint the AssemblyAI token against that key instead of `process.env.ASSEMBLYAI_API_KEY`. Everything else about the route (disclosure policy, brand voice lookup, CRM note) is unchanged.

**`POST /api/token/chat`** (same file): same shape — if the caller has a saved DeepSeek key, pass it into `deepseekService.createCompletion({ ..., apiKey })`. Also switches the hardcoded `model: 'deepseek-chat'` to the new default (`deepseek-flash`), i.e. stops overriding the model explicitly and lets the service's own default apply — or sets it explicitly, whichever keeps the code clearest at implementation time.

**Model default**: `deepseekService`'s fallback (`process.env.DEEPSEEK_MODEL || 'deepseek-chat'`) becomes `process.env.DEEPSEEK_MODEL || 'deepseek-flash'`.

## Frontend changes

`/api/voice/token` and `/api/token/chat` are currently called with plain `fetch` in `apps/web/src/App.tsx` — not `authorizedFetch` ([apps/web/src/auth/authorizedFetch.ts](../../../apps/web/src/auth/authorizedFetch.ts)), which throws `SignedOutError` when signed out (correct for `/api/me/*`, wrong here — these routes must always succeed anonymously).

Add a small best-effort helper — attaches a bearer token *if* a session exists (reusing `authClient.token()`), and silently omits the header otherwise. No behavior change for anonymous callers; signed-in callers with a valid session get the header attached automatically.

## `db/repository.ts` split

Five files under `apps/orchestrator/src/db/repository/`, each scoped to one domain already visible in the current file's structure:

| File | Contents | Approx. lines |
|---|---|---|
| `tenant.ts` | `slugify`, `resolveTenantId`, `isNotSignedInWorkspace`, the tenant-id cache | ~65 |
| `billing.ts` | `upsertSubscription`, `getSubscription`, `recordUsage`, `getUsageAggregate` | ~90 |
| `consent.ts` | `insertConsent`, `listConsent` | ~45 |
| `crm.ts` | `upsertLead`, `listAllLeads`, `upsertMember`, `listAllMembers` | ~80 |
| `credentials.ts` | Legacy company-based credential functions + the workspace `KeyStore` object (`get`/`upsert`/`remove`/`replaceIfUnchanged`/`list`), with a shared `sealCredentials(entry)` helper deduplicating the encrypt-and-build-row logic currently repeated between `upsert` and `replaceIfUnchanged` | ~180 |
| `index.ts` | Re-exports everything from the five files above | ~10 |

No call site elsewhere in the codebase changes — everything currently does `import { X } from '../db/repository'` (or similar relative path to the file), which keeps working unchanged against `index.ts`.

## Error handling

- `optionalUser` never surfaces an error to the client; any verification failure degrades silently to anonymous.
- If a caller's saved key is itself invalid (e.g. a revoked AssemblyAI key) and the resulting upstream call fails, the route returns the same error shape it already does today for a bad server key — no new error handling needed, the existing failure path just runs with a different key.
- `deepseekService`'s existing fallback (`isFallback: true` placeholder response) covers a bad per-caller DeepSeek key exactly as it covers a bad server key today — `isConfigured()` and the try/catch around the fetch don't care whose key failed.

## Testing

- `optionalUser` unit tests: valid token → `req.user`/`req.workspace` populated; no `Authorization` header → passthrough, no `req.user`; invalid/expired token → passthrough, not a 401; workspace resolution throwing → passthrough (never crashes the request).
- `deepseekService` unit tests: `createCompletion` with an explicit `apiKey` uses it in the `Authorization` header; without one, falls back to the server key; default model is `deepseek-flash`.
- Repository split: existing `repository`-adjacent tests continue to pass unchanged against the new `index.ts` (behavior parity, not a rewrite).
- Manual verification in production after deploy: signed out → unchanged; signed in with a saved (real or intentionally-invalid) AssemblyAI/DeepSeek key → confirm the right key is the one actually used (e.g. via a deliberately-bad key producing the expected upstream 401, proving it reached AssemblyAI/DeepSeek rather than silently falling back to the server key).
