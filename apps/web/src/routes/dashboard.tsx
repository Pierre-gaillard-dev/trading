import { useNavigate } from '@tanstack/react-router';
import { setToken } from '../auth/auth-store';

export function DashboardPage() {
  const navigate = useNavigate();

  function handleLogout() {
    setToken(null);
    void navigate({ to: '/login' });
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100'>
      <h1 className='text-3xl font-bold text-slate-900'>Hello world 👋</h1>
      <p className='text-slate-600'>Tu es connecté au dashboard.</p>
      <button
        type='button'
        onClick={handleLogout}
        className='rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700'
      >
        Se déconnecter
      </button>
    </div>
  );
}
