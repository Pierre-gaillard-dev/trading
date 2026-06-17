import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_ACCOUNT, loginResponseSchema } from '@trading/shared';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify/types/instance';

describe('loginRoute', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    vi.resetAllMocks();

    app = buildApp();
  });

  describe('POST /api/auth/login', () => {
    it('should return a valid JWT token for correct credentials', async () => {
      const request = {
        body: {
          email: DEMO_ACCOUNT.email,
          password: DEMO_ACCOUNT.password,
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: request.body,
      });

      expect(response.statusCode).toBe(200);
      const responseBody = JSON.parse(response.body);
      expect(responseBody).toHaveProperty('token');
    });

    it('should return 401 for incorrect credentials', async () => {
      const request = {
        body: {
          email: DEMO_ACCOUNT.email,
          password: 'wrong-password',
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: request.body,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should resist to SQL injection attempts', async () => {
      const request = {
        body: {
          email: "admin' OR '1'='1",
          password: "password' OR '1'='1",
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: request.body,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user information for a valid token', async () => {
      // First, log in to get a valid token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: DEMO_ACCOUNT.email,
          password: DEMO_ACCOUNT.password,
        },
      });

      const { token } = JSON.parse(loginResponse.body);

      // Now, use the token to access the /me endpoint
      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(meResponse.statusCode).toBe(200);
      const result = loginResponseSchema.safeParse(JSON.parse(meResponse.body));
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('email', DEMO_ACCOUNT.email);
    });

    it('should return 401 for an invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
