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
export const authClient: AuthLike | null = baseUrl
  ? (createAuthClient(baseUrl, {
      adapter: BetterAuthVanillaAdapter({ fetchOptions: { credentials: 'include' } })
    }) as unknown as AuthLike)
  : null;
