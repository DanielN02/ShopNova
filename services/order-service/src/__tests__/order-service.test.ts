import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock pg before importing app
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockRelease = jest.fn();

jest.mock('pg', () => {
  const mockClient = {
    query: mockQuery,
    release: mockRelease,
  };
  const mockPool = {
    query: mockQuery,
    connect: mockConnect.mockResolvedValue(mockClient),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

// Mock amqplib
jest.mock('amqplib', () => ({
  connect: jest.fn().mockRejectedValue(new Error('mock')),
}));

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
  }));
});

// Mock ws
jest.mock('ws', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  WebSocket: { OPEN: 1 },
}));

import { app, JWT_SECRET } from '../index';

function generateToken(payload: { id: number; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Order Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', service: 'order-service' });
    });
  });

  describe('POST /api/orders', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ items: [{ productId: '1', productName: 'Laptop', price: 100, quantity: 1 }] });
      expect(res.status).toBe(401);
    });

    it('should reject order with no items', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [] });
      expect(res.status).toBe(400);
    });

    it('should create an order successfully', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });

      // Mock: BEGIN
      mockQuery.mockResolvedValueOnce(undefined);
      // Mock: INSERT order
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, order_number: 'ORD-TEST', user_id: 1, status: 'pending', payment_status: 'pending', total_amount: 108 }],
      });
      // Mock: INSERT order_item
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock: UPDATE payment status
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock: COMMIT
      mockQuery.mockResolvedValueOnce(undefined);
      // Mock: SELECT order_items
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, order_id: 1, product_name: 'Laptop', quantity: 1, price: 100 }],
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ productId: '1', productName: 'Laptop', price: 100, quantity: 1 }],
          paymentMethod: 'card',
        });
      expect(res.status).toBe(201);
      expect(res.body.order_number).toBeDefined();
    });
  });

  describe('GET /api/orders', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
    });

    it('should return user orders', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, order_number: 'ORD-001', status: 'processing' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, product_name: 'Laptop', quantity: 1 }] });

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return 404 for non-existent order', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/orders/999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('should return order details', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, order_number: 'ORD-001', user_id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ product_name: 'Laptop', quantity: 1 }] });

      const res = await request(app)
        .get('/api/orders/1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.order_number).toBe('ORD-001');
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    it('should cancel a pending order', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, order_number: 'ORD-001', status: 'pending', user_id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/orders/1/cancel')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Order cancelled');
    });

    it('should reject cancellation of shipped order', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'shipped', user_id: 1 }] });

      const res = await request(app)
        .put('/api/orders/1/cancel')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders/admin/all', () => {
    it('should reject non-admin', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      const res = await request(app)
        .get('/api/orders/admin/all')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return all orders for admin', async () => {
      const token = generateToken({ id: 1, email: 'admin@shopnova.com', role: 'admin' });
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, order_number: 'ORD-001' }] })
        .mockResolvedValueOnce({ rows: [{ product_name: 'Laptop' }] });

      const res = await request(app)
        .get('/api/orders/admin/all')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/orders/:id/status (admin)', () => {
    it('should reject non-admin', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      const res = await request(app)
        .put('/api/orders/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'shipped' });
      expect(res.status).toBe(403);
    });

    it('should reject invalid status', async () => {
      const token = generateToken({ id: 1, email: 'admin@shopnova.com', role: 'admin' });
      const res = await request(app)
        .put('/api/orders/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid_status' });
      expect(res.status).toBe(400);
    });

    it('should update order status', async () => {
      const token = generateToken({ id: 1, email: 'admin@shopnova.com', role: 'admin' });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, order_number: 'ORD-001', status: 'shipped', user_id: 2 }],
      });

      const res = await request(app)
        .put('/api/orders/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'shipped' });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/orders/analytics/summary (admin)', () => {
    it('should reject non-admin', async () => {
      const token = generateToken({ id: 1, email: 'user@example.com', role: 'customer' });
      const res = await request(app)
        .get('/api/orders/analytics/summary')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return analytics data for admin', async () => {
      const token = generateToken({ id: 1, email: 'admin@shopnova.com', role: 'admin' });
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '15000.00' }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ status: 'processing', count: '20' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ name: 'Laptop', image: 'img.jpg', sold: '10', revenue: '12999.90' }] })
        .mockResolvedValueOnce({ rows: [{ user_id: 1, orders: '5', spent: '5000.00' }] })
        .mockResolvedValueOnce({ rows: [{ month: 'Jan', revenue: '5000.00' }] });

      const res = await request(app)
        .get('/api/orders/analytics/summary')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.totalRevenue).toBe(15000);
      expect(res.body.totalOrders).toBe(50);
      expect(res.body.topProducts).toBeDefined();
      expect(res.body.ordersPerUser).toBeDefined();
      expect(res.body.revenueByMonth).toBeDefined();
    });
  });
});
