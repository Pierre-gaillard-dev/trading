interface LoginResponse {
  token: string;
  user: { id: string; email: string };
}

/** Appelle le backend pour se connecter. Lève une erreur si les identifiants sont refusés. */
export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? 'Connexion échouée.');
  }

  return (await response.json()) as LoginResponse;
}
