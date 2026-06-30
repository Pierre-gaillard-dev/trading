import { describe, it, expect, beforeAll } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { requireWsAuth } from './require-auth';

/** Faux reply qui capture le code HTTP renvoyé. */
function fakeReply(): { reply: FastifyReply; codes: number[] } {
  const codes: number[] = [];
  const reply = {
    code(c: number) {
      codes.push(c);
      return this;
    },
    send() {
      return Promise.resolve(this);
    },
  } as unknown as FastifyReply;
  return { reply, codes };
}

describe('requireWsAuth (jeton en query string)', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    void app.register(fastifyJwt, { secret: 'test-secret' });
    await app.ready();
    token = app.jwt.sign({ sub: 'usr_1' });
  });

  function request(query: Record<string, string>): FastifyRequest {
    return { query, server: app } as unknown as FastifyRequest;
  }

  it('laisse passer un jeton valide (aucun code d’erreur renvoyé)', async () => {
    const { reply, codes } = fakeReply();
    await requireWsAuth(request({ token }), reply);
    expect(codes).toEqual([]);
  });

  it('rejette (401) si le jeton est absent', async () => {
    const { reply, codes } = fakeReply();
    await requireWsAuth(request({}), reply);
    expect(codes).toEqual([401]);
  });

  it('rejette (401) si le jeton est invalide', async () => {
    const { reply, codes } = fakeReply();
    await requireWsAuth(request({ token: 'pas-un-jwt' }), reply);
    expect(codes).toEqual([401]);
  });
});
