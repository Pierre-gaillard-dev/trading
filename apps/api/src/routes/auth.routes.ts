import type { FastifyInstance } from 'fastify';
import { createAuthController } from '../controllers/auth.controller';
import type { UserRepository } from '../repositories/user.repository';

export interface AuthRoutesOptions {
  users: UserRepository;
}

/** Câblage des URLs d'authentification vers leurs controllers. */
export function authRoutes(app: FastifyInstance, options: AuthRoutesOptions): void {
  const controller = createAuthController({ users: options.users });
  app.post('/api/auth/login', controller.login);
  app.get('/api/auth/me', controller.me);
}
