/**
 * État d'authentification, hors React, pour que le routeur (TanStack Router)
 * puisse vérifier "suis-je connecté ?" AVANT d'afficher une page (dans `beforeLoad`).
 * Le jeton est rangé dans le localStorage du navigateur.
 */
const TOKEN_KEY = 'trading.token';

let token: string | null = localStorage.getItem(TOKEN_KEY);
const listeners = new Set<() => void>();

export function getToken(): string | null {
  return token;
}

export function isAuthenticated(): boolean {
  return token !== null;
}

export function setToken(value: string | null): void {
  token = value;
  if (value === null) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    localStorage.setItem(TOKEN_KEY, value);
  }
  listeners.forEach((listener) => {
    listener();
  });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
