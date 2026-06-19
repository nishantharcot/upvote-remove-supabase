import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut as signOutFn } from '@/server/functions/auth';

interface AuthState {
  user: { id: string; email: string } | null;
  isLoading: boolean;
  isAdmin: boolean;
  profile: { name: string | null; email: string | null; avatar_url: string | null } | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAdmin: false,
    profile: null,
  });

  const refresh = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      if (!data) {
        setState({ user: null, isLoading: false, isAdmin: false, profile: null });
        return;
      }
      setState({
        user: { id: data.id, email: data.email },
        isLoading: false,
        isAdmin: data.isAdmin,
        profile: data.profile,
      });
    } catch {
      setState({ user: null, isLoading: false, isAdmin: false, profile: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await signOutFn();
    setState({ user: null, isLoading: false, isAdmin: false, profile: null });
  }, []);

  return { ...state, signOut, refresh };
}
