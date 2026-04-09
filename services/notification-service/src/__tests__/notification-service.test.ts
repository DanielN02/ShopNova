import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'dev-secret-key-change-in-production';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    xrange: jest.fn().mockResolvedValue([]),
    xreadgroup: jest.fn().mockResolvedValue(null),
    xgroup: jest.fn().mockResolvedValue('OK'),
    xack: jest.fn().mockResolvedValue(1),
    disconnect: jest.fn(),
  }));
});

// Mock @sendgrid/mail
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202, headers: {}, body: '' }]),
}));

import { app } from '../index';

function generateToken(payload: { userId: number; email: string; role: string }) {
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
      expect(res.body.status).toBe('OK');
      expect(res.body.service).toBe('notification-service');
    });
  });

  describe('GET /api/test', () => {
    it('should return test response', async () => {
      const res = await request(app).get('/api/test');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Test endpoint working');
    });
  });

  describe('GET /', () => {
    it('should return root service info', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('notification-service');
    });
  });

  describe('GET /api/notifications', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    it('should return notifications for authenticated user', async () => {
      const token = generateToken({ userId: 2, email: 'jane@example.com', role: 'customer' });
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('notifications');
      expect(Array.isArray(res.body.notifications)).toBe(true);
    });
  });

  describe('GET /api/debug/email', () => {
    it('should return email configuration info', async () => {
      const res = await request(app).get('/api/debug/email');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sendgrid_api_key_configured');
      expect(res.body).toHaveProperty('sendgrid_api_key_format');
      expect(res.body).toHaveProperty('sendgrid_api_key_prefix');
      expect(res.body.sendgrid_api_key_configured).toBeDefined();
    });
  });

  describe('GET /api/debug/streams', () => {
    it('should return stream debug info', async () => {
      const res = await request(app).get('/api/debug/streams');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user_events_count');
      expect(res.body).toHaveProperty('order_events_count');
    });
  });
});
