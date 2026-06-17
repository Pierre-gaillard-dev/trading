import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { isAuthenticated } from './auth/auth-store';
import { LoginPage } from './routes/login';
import { DashboardPage } from './routes/dashboard';

const rootRoute = createRootRoute({ component: Outlet });

// "/" redirige vers le dashboard si connecté, sinon vers le login.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: isAuthenticated() ? '/dashboard' : '/login' });
  },
});

// Déjà connecté ? On évite de revenir au login.
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginPage,
});

// Page protégée : pas connecté → redirection vers /login.
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  component: DashboardPage,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, dashboardRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
