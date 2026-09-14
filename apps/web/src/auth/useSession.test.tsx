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
