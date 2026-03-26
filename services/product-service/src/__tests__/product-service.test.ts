import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'shopnova-secret-key-change-in-production';

// Mock mongoose
const mockFind = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockCountDocuments = jest.fn();
const mockSave = jest.fn();
const mockLean = jest.fn();
const mockSort = jest.fn();
const mockSkip = jest.fn();
const mockLimit = jest.fn();

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const mockModel: any = jest.fn().mockImplementation(() => ({
    save: mockSave,
  }));
  mockModel.find = mockFind;
  mockModel.findById = mockFindById;
  mockModel.findByIdAndUpdate = mockFindByIdAndUpdate;
  mockModel.findByIdAndDelete = mockFindByIdAndDelete;
  mockModel.countDocuments = mockCountDocuments;
  mockModel.insertMany = jest.fn();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(undefined),
    model: jest.fn().mockReturnValue(mockModel),
    Schema: actualMongoose.Schema,
  };
});

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
    on: jest.fn(),
  }));
});

// Mock amqplib
jest.mock('amqplib', () => ({
  connect: jest.fn().mockRejectedValue(new Error('mock')),
}));

// Mock elasticsearch
jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockRejectedValue(new Error('mock')),
  })),
}));

import { app } from '../index';

function generateToken(payload: { id: number; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Product Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'product-service' });
    });
  });

  describe('GET /api/products', () => {
    it('should return products list', async () => {
      const mockProducts = [
        { _id: '1', name: 'Laptop', price: 1299.99, category: 'Electronics' },
        { _id: '2', name: 'Headphones', price: 249.99, category: 'Electronics' },
      ];

      mockLimit.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockProducts) });
      mockSkip.mockReturnValue({ limit: mockLimit });
      mockSort.mockReturnValue({ skip: mockSkip });
      mockFind.mockReturnValue({ sort: mockSort });
      mockCountDocuments.mockResolvedValue(2);

      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/products/search', () => {
    it('should return empty array when no query', async () => {
      const res = await request(app).get('/api/products/search');
      expect(res.status).toBe(200);
      expect(res.body.products).toEqual([]);
    });

    it('should search products by query string', async () => {
      const mockProducts = [{ _id: '1', name: 'Laptop', price: 1299.99 }];
      mockLean.mockResolvedValue(mockProducts);
      mockLimit.mockReturnValue({ lean: mockLean });
      mockFind.mockReturnValue({ limit: mockLimit });

      const res = await request(app).get('/api/products/search?q=laptop');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a single product', async () => {
      const mockProduct = { _id: '1', name: 'Laptop', price: 1299.99 };
      mockLean.mockResolvedValue(mockProduct);
      mockFindById.mockReturnValue({ lean: mockLean });

      const res = await request(app).get('/api/products/1');
      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent product', async () => {
      mockLean.mockResolvedValue(null);
      mockFindById.mockReturnValue({ lean: mockLean });

      const res = await request(app).get('/api/products/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/products (admin)', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'New Product', price: 99 });
      expect(res.status).toBe(401);
    });

    it('should reject non-admin user', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Product', price: 99 });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/products/:id (admin)', () => {
    it('should reject non-admin user', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      const res = await request(app)
        .put('/api/products/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 199 });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/products/:id (admin)', () => {
    it('should reject non-admin user', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      const res = await request(app).delete('/api/products/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/categories', () => {
    it('should return categories', async () => {
      const mockCategories = [{ name: 'Electronics', icon: '💻' }];
      mockLean.mockResolvedValue(mockCategories);
      mockFind.mockReturnValue({ lean: mockLean });

      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/products/:id/reviews', () => {
    it('should return reviews for a product', async () => {
      const mockReviews = [{ rating: 5, comment: 'Great!' }];
      mockLean.mockResolvedValue(mockReviews);
      mockSort.mockReturnValue({ lean: mockLean });
      mockFind.mockReturnValue({ sort: mockSort });

      const res = await request(app).get('/api/products/1/reviews');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/products/:id/reviews', () => {
    it('should reject unauthenticated review', async () => {
      const res = await request(app)
        .post('/api/products/1/reviews')
        .send({ rating: 5, comment: 'Great!' });
      expect(res.status).toBe(401);
    });
  });
});
