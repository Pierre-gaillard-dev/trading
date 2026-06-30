import type { FastifyReply, FastifyRequest } from 'fastify';
import { loginRequestSchema } from '@trading/shared';
import { verifyPassword } from '../auth/password';
import type { UserRepository } from '../repositories/user.repository';

interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthControllerDeps {
  users: UserRepository;
}

/**
 * Crée les handlers d'authentification à partir de leurs dépendances.
 * Le repository est injecté → en test on passe un faux (InMemoryUserRepository).
 */
export function createAuthController({ users }: AuthControllerDeps) {
  async function login(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    // Validation du corps via le schéma Zod : email valide + mot de passe non vide.
    const parsed = loginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Requête invalide.',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const { email, password } = parsed.data;

    const user = await users.findByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return reply.code(401).send({ error: 'Identifiants invalides.' });
    }

    const token = request.server.jwt.sign({ sub: user.id, email: user.email });
    return reply.send({ token, user: { id: user.id, email: user.email } });
  }

  async function me(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Non authentifié.' });
    }
    const payload = request.user as JwtPayload;
    return reply.send({ user: { id: payload.sub, email: payload.email } });
  }

  return { login, me };
}
