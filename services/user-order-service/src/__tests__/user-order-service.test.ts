import request from 'supertest';
import { app } from '../index';
import { pool } from '../shared/database';
import bcrypt from 'bcryptjs';

describe('User-Order Service API Tests', () => {
  let authToken: string;
  let adminToken: string;
  let testUserId: string;
  let testOrderId: string;

  beforeAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM orders WHERE user_id LIKE \'test-%\'');
    await pool.query('DELETE FROM users WHERE email LIKE \'test-%\'');
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const userResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['test-user@example.com', hashedPassword, 'Test', 'User', 'customer']
    );
    testUserId = userResult.rows[0].id;

    // Create test admin
    const adminResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['test-admin@example.com', hashedPassword, 'Test', 'Admin', 'admin']
    );

    // Login as user
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test-user@example.com',
        password: 'password123'
      });
    authToken = userLogin.body.token;

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test-admin@example.com',
        password: 'password123'
      });
    adminToken = adminLogin.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM orders WHERE user_id LIKE \'test-%\'');
    await pool.query('DELETE FROM users WHERE email LIKE \'test-%\'');
    await pool.end();
  });

  describe('Authentication Endpoints', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-newuser@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user.email).toBe('test-newuser@example.com');
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-user@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test-user@example.com');
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-user@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test-user@example.com');
    });
  });

  describe('Order Endpoints', () => {
    it('should create a new order', async () => {
      const orderData = {
        items: [
          {
            productId: 'test-product-1',
            productName: 'Test Product',
            quantity: 2,
            price: 99.99
          }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'USA'
        },
        paymentMethod: 'credit_card'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Order created successfully');
      expect(response.body.order.items).toHaveLength(1);
      testOrderId = response.body.order.id;
    });

    it('should get user orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
      expect(response.body.orders.length).toBeGreaterThan(0);
    });

    it('should get specific order', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.order.id).toBe(testOrderId);
    });

    it('should update order status (admin only)', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'shipped' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Order status updated successfully');
      expect(response.body.order.status).toBe('shipped');
    });

    it('should reject order status update from non-admin', async () => {
      const response = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'delivered' });

      expect(response.status).toBe(403);
    });
  });

  describe('Admin Endpoints', () => {
    it('should get all orders (admin only)', async () => {
      const response = await request(app)
        .get('/api/orders/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
      expect(response.body.orders.length).toBeGreaterThan(0);
      expect(response.body.orders[0]).toHaveProperty('user_email');
      expect(response.body.orders[0]).toHaveProperty('user_name');
    });

    it('should reject all orders endpoint for non-admin', async () => {
      const response = await request(app)
        .get('/api/orders/admin/all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    it('should get all users (admin only)', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users[0]).toHaveProperty('email');
      expect(response.body.users[0]).toHaveProperty('role');
    });

    it('should reject all users endpoint for non-admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    it('should get orders analytics (admin only)', async () => {
      const response = await request(app)
        .get('/api/orders/analytics/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ordersByStatus');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('recentOrders');
    });

    it('should reject analytics endpoint for non-admin', async () => {
      const response = await request(app)
        .get('/api/orders/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Debug Endpoints', () => {
    it('should get debug users info', async () => {
      const response = await request(app)
        .get('/api/debug-users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usersCount');
      expect(response.body).toHaveProperty('recentUsers');
    });

    it('should get debug orders info', async () => {
      const response = await request(app)
        .get('/api/debug-orders');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ordersCount');
      expect(response.body).toHaveProperty('recentOrders');
    });

    it('should seed demo users', async () => {
      const response = await request(app)
        .post('/api/seed-demo-users');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Demo users seeding completed!');
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/orders');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Order not found');
    });

    it('should validate order creation data', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [], // Invalid: empty items array
          shippingAddress: {},
          paymentMethod: 'credit_card'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
});
