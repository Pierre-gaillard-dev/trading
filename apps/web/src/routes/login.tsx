import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { validatePassword, DEMO_ACCOUNT } from '@trading/shared';
import { apiLogin } from '../lib/api';
import { setToken } from '../auth/auth-store';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const check = validatePassword(password);
    if (!check.valid) {
      setError(`Mot de passe : ${check.errors.join(' · ')}`);
      return;
    }

    setLoading(true);
    try {
      const { token } = await apiLogin(email, password);
      setToken(token);
      await navigate({ to: '/dashboard' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-slate-100 p-4'>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className='w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow'
      >
        <h1 className='text-2xl font-semibold text-slate-900'>Connexion</h1>

        <div className='space-y-1'>
          <label htmlFor='email' className='text-sm font-medium text-slate-700'>
            Email
          </label>
          <input
            id='email'
            type='email'
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            className='w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500'
          />
        </div>

        <div className='space-y-1'>
          <label htmlFor='password' className='text-sm font-medium text-slate-700'>
            Mot de passe
          </label>
          <input
            id='password'
            type='password'
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            className='w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500'
          />
        </div>

        {error !== null && <p className='text-sm text-red-600'>{error}</p>}

        <button
          type='submit'
          disabled={loading}
          className='w-full rounded-md bg-slate-900 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50'
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>

        <p className='text-center text-xs text-slate-500'>
          Compte de démo : {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
        </p>
      </form>
    </div>
  );
}
