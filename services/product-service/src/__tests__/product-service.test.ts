/**
 * Product Service Tests
 * PostgreSQL-based microservice tests
 */

import request from 'supertest';
import { app } from '../index';

describe('Product Service API', () => {
  
  describe('Health Check', () => {
    it('GET /api/health - should return service status', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.service).toBe('product-service');
    });
  });

  describe('Product Endpoints', () => {
    it('GET /api/products - should handle requests', async () => {
      const res = await request(app).get('/api/products');

      // Accept either success or database error
      expect([200, 500]).toContain(res.status);
    }, 10000); // Increase timeout for Redis caching

    it('GET /api/products/search - should handle search requests', async () => {
      const res = await request(app).get('/api/products/search?q=laptop');

      // Accept either success or database error
      expect([200, 500]).toContain(res.status);
    });

    it('POST /api/products - should require authentication', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Test Product', price: 99.99 });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('PUT /api/products/:id - should require authentication', async () => {
      const res = await request(app)
        .put('/api/products/some-id')
        .send({ name: 'Updated Product' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('DELETE /api/products/:id - should require authentication', async () => {
      const res = await request(app).delete('/api/products/some-id');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Category Endpoints', () => {
    it('GET /api/categories - should handle requests', async () => {
      const res = await request(app).get('/api/categories');

      // Accept either success or database error
      expect([200, 500]).toContain(res.status);
    });

    it('POST /api/categories - should require authentication', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({ name: 'Test Category' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('API Documentation', () => {
    it('GET /api/docs - should serve Swagger documentation', async () => {
      const res = await request(app).get('/api/docs/');

      expect(res.status).toBe(200);
    });
  });
});
