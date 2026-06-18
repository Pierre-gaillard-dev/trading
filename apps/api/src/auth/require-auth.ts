import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * preHandler Fastify : exige un jeton JWT valide (en-tête Authorization).
 * À placer sur les routes REST protégées ; le controller lit ensuite `request.user`.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    await reply.code(401).send({ error: 'Non authentifié.' });
  }
}

/**
 * preValidation pour un WebSocket : un navigateur ne peut pas envoyer d'en-tête
 * Authorization, donc on lit le jeton dans la query (?token=...). Si absent ou
 * invalide, on rejette le handshake (pas d'upgrade WebSocket).
 */
export async function requireWsAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = (request.query as { token?: string }).token ?? '';
  if (token === '') {
    await reply.code(401).send({ error: 'Non authentifié.' });
    return;
  }
  try {
    request.server.jwt.verify(token);
  } catch {
    await reply.code(401).send({ error: 'Jeton invalide.' });
  }
}
