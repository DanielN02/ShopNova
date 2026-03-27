import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { pool } from './shared/database';
import bcrypt from 'bcryptjs';

// Import routes
import userRoutes from './users/routes';
import orderRoutes from './orders/routes';
import notificationRoutes from './notifications/routes';

const app = express();

app.use(helmet());
app.use(cors({ 
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://shopnovastore.netlify.app',
    'https://*.netlify.app'
  ], 
  credentials: true 
}));
app.use(express.json());

// Rate limiters (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
  });

  const orderCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many order requests, please try again later.' },
  });

  app.use('/api/', generalLimiter);
  app.use('/api/auth/', authLimiter);
  app.use('/api/orders', orderCreateLimiter);
}

// Swagger documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'user-order-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Debug endpoint to check users table
app.get('/api/debug-users', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const usersResult = await pool.query('SELECT id, email, first_name, last_name, role FROM users LIMIT 5');
    
    res.json({
      usersCount: result.rows[0].count,
      recentUsers: usersResult.rows
    });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({ error: 'Debug error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Debug endpoint to check orders table
app.get('/api/debug-orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM orders');
    const ordersResult = await pool.query('SELECT id, user_id, total_amount, status, created_at FROM orders LIMIT 5');
    
    res.json({
      ordersCount: result.rows[0].count,
      recentOrders: ordersResult.rows
    });
  } catch (error) {
    console.error('Debug orders error:', error);
    res.status(500).json({ error: 'Debug error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Seed demo users endpoint (for development/testing)
app.get('/api/seed-demo-users', async (req, res) => {
  try {
    const dbTest = await pool.query('SELECT NOW()');
    
    const demoUsers = [
      { email: 'admin@shopnova.com', password: 'admin123', first_name: 'Admin', last_name: 'User', role: 'admin' },
      { email: 'jane@example.com', password: 'customer123', first_name: 'Jane', last_name: 'Cooper', role: 'customer' },
      { email: 'robert@example.com', password: 'customer123', first_name: 'Robert', last_name: 'Fox', role: 'customer' },
      { email: 'emily@example.com', password: 'customer123', first_name: 'Emily', last_name: 'Watson', role: 'customer' }
    ];

    const createdUsers = [];
    
    for (const user of demoUsers) {
      try {
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
        
        if (existingUser.rows.length === 0) {
          const hashedPassword = await bcrypt.hash(user.password, 10);
          const result = await pool.query(
            `INSERT INTO users (email, password, first_name, last_name, role, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
             RETURNING id, email, first_name, last_name, role`,
            [user.email, hashedPassword, user.first_name, user.last_name, user.role]
          );
          createdUsers.push({
            id: result.rows[0].id,
            email: result.rows[0].email,
            name: `${result.rows[0].first_name} ${result.rows[0].last_name}`,
            role: result.rows[0].role,
          });
        } else {
          createdUsers.push({
            id: existingUser.rows[0].id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            existing: true
          });
        }
      } catch (error) {
        createdUsers.push({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      message: 'Demo users seeding completed!',
      users: createdUsers,
      total: createdUsers.length,
      new: createdUsers.filter((u: any) => !u.existing).length,
      existing: createdUsers.filter((u: any) => u.existing).length
    });

  } catch (error) {
    console.error('Error seeding demo users:', error);
    res.status(500).json({ error: 'Failed to seed demo users', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// API routes
app.use('/api/auth', userRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);

export { app };
