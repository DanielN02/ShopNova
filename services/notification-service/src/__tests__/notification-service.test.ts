import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'shopnova-secret-key-change-in-production';

// Mock mongoose
const mockFind = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockUpdateMany = jest.fn();
const mockCountDocuments = jest.fn().mockResolvedValue(1);
const mockSave = jest.fn().mockResolvedValue({ _id: 'notif1', createdAt: new Date() });

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockModel: any = Object.assign(
    jest.fn().mockImplementation(() => ({
      save: mockSave,
      _id: 'notif1',
      createdAt: new Date(),
    })),
    {
      find: mockFind,
      findOneAndUpdate: mockFindOneAndUpdate,
      updateMany: mockUpdateMany,
      countDocuments: mockCountDocuments,
      insertMany: jest.fn(),
    }
  );

  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(undefined),
    model: jest.fn().mockReturnValue(mockModel),
    Schema: actualMongoose.Schema,
  };
});

// Mock amqplib
jest.mock('amqplib', () => ({
  connect: jest.fn().mockRejectedValue(new Error('mock')),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTestAccount: jest.fn().mockRejectedValue(new Error('mock')),
  createTransport: jest.fn(),
  getTestMessageUrl: jest.fn(),
}));

// Mock ws
jest.mock('ws', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  WebSocket: { OPEN: 1 },
}));

import { app } from '../index';

function generateToken(payload: { id: number; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'notification-service' });
    });
  });

  describe('GET /api/notifications', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    it('should return user notifications', async () => {
      const token = generateToken({ id: 2, email: 'jane@example.com', role: 'customer' });
      const mockNotifications = [
        { _id: 'n1', userId: '2', type: 'order', title: 'Order Shipped', message: 'Your order shipped', read: false },
        { _id: 'n2', userId: '2', type: 'promo', title: 'Sale!', message: '30% off', read: true },
      ];
      const mockLean = jest.fn().mockResolvedValue(mockNotifications);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      mockFind.mockReturnValue({ sort: mockSort });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).put('/api/notifications/n1/read');
      expect(res.status).toBe(401);
    });

    it('should mark notification as read', async () => {
      const token = generateToken({ id: 2, email: 'jane@example.com', role: 'customer' });
      mockFindOneAndUpdate.mockResolvedValue({ _id: 'n1', read: true });

      const res = await request(app)
        .put('/api/notifications/n1/read')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Marked as read');
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const token = generateToken({ id: 2, email: 'jane@example.com', role: 'customer' });
      mockUpdateMany.mockResolvedValue({ modifiedCount: 3 });

      const res = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('All marked as read');
    });
  });

  describe('POST /api/notifications (admin)', () => {
    it('should reject non-admin user', async () => {
      const token = generateToken({ id: 2, email: 'jane@example.com', role: 'customer' });
      const res = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: '2', type: 'promo', title: 'Sale', message: 'Big sale!' });
      expect(res.status).toBe(403);
    });

    it('should create notification as admin', async () => {
      const token = generateToken({ id: 1, email: 'admin@shopnova.com', role: 'admin' });

      const res = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: '2', type: 'promo', title: 'Sale', message: 'Big sale!' });
      expect(res.status).toBe(201);
    });
  });
});
