import { useSyncExternalStore } from 'react';
import { isAuthenticated, subscribe } from './auth-store';

/** Hook React qui réagit aux changements de connexion (login / logout). */
export function useAuth(): { isAuthenticated: boolean } {
  const authed = useSyncExternalStore(subscribe, isAuthenticated, isAuthenticated);
  return { isAuthenticated: authed };
}
