import Fastify, { type FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.routes';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import type { UserRepository } from './repositories/user.repository';

export interface BuildAppOptions {
  /** Repository des utilisateurs ; par défaut Prisma (Postgres). En test : InMemoryUserRepository. */
  userRepository?: UserRepository;
  /** Force les logs Fastify. Par défaut activés, sauf en test (coupés automatiquement). */
  logger?: boolean;
}

/**
 * Construit l'application Fastify (sans la démarrer).
 * Les dépendances sont injectées → on peut monter l'app dans un test
 * avec un faux repository, sans toucher à la base de données.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  // Logs coupés par défaut en test (Vitest définit VITEST) ; option explicite prioritaire.
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST !== undefined;
  const app = Fastify({ logger: options.logger ?? !isTest });

  const users = options.userRepository ?? new PrismaUserRepository();
  const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me';

  void app.register(fastifyJwt, { secret });
  void app.register(authRoutes, { users });

  return app;
}
