import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock pg before importing app
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockPool = { query: mockQuery, connect: jest.fn(), end: jest.fn() };
  return { Pool: jest.fn(() => mockPool) };
});

// Mock amqplib
jest.mock('amqplib', () => ({
  connect: jest.fn().mockRejectedValue(new Error('mock')),
}));

import { app, pool, JWT_SECRET } from '../index';

const mockPool = pool as unknown as { query: jest.Mock };

function generateToken(payload: { id: number; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'user-service' });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'notanemail', password: '123456', name: 'Test User' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: '123', name: 'Test User' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject missing name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: '123456' });
      expect(res.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'existing@example.com', password: '123456', name: 'Test User' });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already in use');
    });

    it('should register a new user successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing user
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: 'new@example.com', name: 'New User', role: 'customer', avatar: 'https://i.pravatar.cc/150?u=new@example.com', created_at: '2025-01-01' }],
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: '123456', name: 'New User' });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('new@example.com');
      expect(res.body.user.role).toBe('customer');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad', password: 'password' });
      expect(res.status).toBe(400);
    });

    it('should reject non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: '123456' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should reject wrong password', async () => {
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash('correctpassword', 10);
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'user@example.com', password: hashed, role: 'customer', name: 'User' }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('should login successfully with correct credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash('password123', 10);
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1, email: 'user@example.com', password: hashed,
          role: 'customer', name: 'Test User', avatar: 'avatar.jpg', phone: '555-1234', created_at: '2025-01-01',
        }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('user@example.com');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });

    it('should return user profile with valid token', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'user@example.com', name: 'Test User', role: 'customer', avatar: 'avatar.jpg', phone: '555', created_at: '2025-01-01' }],
      });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('user@example.com');
    });

    it('should return 404 if user not found', async () => {
      const token = generateToken({ id: 999, email: 'gone@example.com', role: 'customer' });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'user@example.com', name: 'Updated Name', role: 'customer', avatar: 'avatar.jpg', phone: '555-9999' }],
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name', phone: '555-9999' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });
  });

  describe('GET /api/users (admin)', () => {
    it('should reject non-admin user', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return all users for admin', async () => {
      const token = generateToken({ id: 1, email: 'admin@shopnova.com', role: 'admin' });
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, email: 'admin@shopnova.com', name: 'Admin', role: 'admin' },
          { id: 2, email: 'jane@example.com', name: 'Jane', role: 'customer' },
        ],
      });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });
});
