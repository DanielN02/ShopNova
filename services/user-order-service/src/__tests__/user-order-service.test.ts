/**
 * User-Order Service Tests
 * PostgreSQL-based microservice tests
 */

import request from 'supertest';
import { app } from '../app';

describe('User-Order Service API', () => {
  
  describe('Health Check', () => {
    it('GET /api/health - should return service status', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.service).toBe('user-order-service');
    });
  });

  describe('Authentication Endpoints', () => {
    it('POST /api/auth/register - should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('POST /api/auth/login - should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('GET /api/auth/profile - should require authentication', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Access token required');
    });
  });

  describe('Order Endpoints', () => {
    it('GET /api/orders - should require authentication', async () => {
      const res = await request(app).get('/api/orders');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Access token required');
    });

    it('POST /api/orders - should require authentication', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ items: [] });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Access token required');
    });
  });

  describe('Admin Endpoints', () => {
    it('GET /api/users - should require authentication', async () => {
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Access token required');
    });

    it('GET /api/orders/admin/all - should require authentication', async () => {
      const res = await request(app).get('/api/orders/admin/all');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Access token required');
    });

    it.skip('GET /api/orders/analytics/summary - should require authentication', async () => {
      const res = await request(app).get('/api/orders/analytics/summary');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Access token required');
    });
  });

  describe('API Documentation', () => {
    it('GET /api/docs - should serve Swagger documentation', async () => {
      const res = await request(app).get('/api/docs/');

      expect(res.status).toBe(200);
    });
  });
});
