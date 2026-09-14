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

afterEach(() => {
  vi.unstubAllGlobals();
});

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
