import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * preHandler Fastify : exige un jeton JWT valide.
 * À placer sur les routes protégées ; le controller lit ensuite `request.user`.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    await reply.code(401).send({ error: 'Non authentifié.' });
  }
}
