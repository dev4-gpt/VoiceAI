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
