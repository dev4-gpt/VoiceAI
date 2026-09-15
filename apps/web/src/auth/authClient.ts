import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthVanillaAdapter } from '@neondatabase/neon-js/auth/vanilla/adapters';

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
 *
 * Note: the neon-js `createAuthClient(url, config)` config only accepts
 * `adapter` and `allowAnonymous` (no top-level `fetchOptions`), so the fetch
 * options — including `credentials` — are passed through the
 * `BetterAuthVanillaAdapter({ fetchOptions })` builder instead. That builder
 * is exported from the `@neondatabase/neon-js/auth/vanilla/adapters` subpath,
 * not the top-level `@neondatabase/neon-js/auth` entry.
 */
const vendorClient = baseUrl
  ? (createAuthClient(baseUrl, {
      adapter: BetterAuthVanillaAdapter({ fetchOptions: { credentials: 'include' } })
    }) as unknown as AuthLike)
  : null;

/**
 * The vendor client's own `.token()` does not reliably hit Better Auth's
 * `/token` endpoint (observed in production: it resolves with no token and
 * issues no network request at all, even with a valid session cookie
 * present). Call the endpoint directly instead — verified working with the
 * same session cookie via `credentials: 'include'`.
 */
async function fetchToken(): Promise<{ data: { token?: string } | null; error: unknown }> {
  try {
    const res = await fetch(`${baseUrl}/token`, { credentials: 'include' });
    if (!res.ok) return { data: null, error: { status: res.status } };
    return { data: await res.json(), error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export const authClient: AuthLike | null = vendorClient ? { ...vendorClient, token: fetchToken } : null;
