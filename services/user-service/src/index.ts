import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import amqplib from 'amqplib';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://shopnova:shopnova123@localhost:5672';

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// Rate limiters
if (process.env.NODE_ENV !== 'test') {
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
  });

  app.use('/api/', generalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
}
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'shopnova',
  password: process.env.DB_PASSWORD || 'shopnova123',
  database: process.env.DB_NAME || 'user_service',
});

let channel: amqplib.Channel | null = null;

async function connectRabbitMQ() {
  try {
    const connection = await amqplib.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange('shopnova_events', 'topic', { durable: true });
    console.log('Connected to RabbitMQ');
  } catch (err) {
    console.warn('RabbitMQ not available, running without message queue:', (err as Error).message);
  }
}

function publishEvent(routingKey: string, data: Record<string, unknown>) {
  if (channel) {
    channel.publish('shopnova_events', routingKey, Buffer.from(JSON.stringify(data)));
  }
}

interface AuthRequest extends express.Request {
  user?: { id: number; email: string; role: string };
}

function authMiddleware(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminMiddleware(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        name VARCHAR(200),
        role VARCHAR(50) DEFAULT 'customer',
        avatar VARCHAR(500),
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@shopnova.com']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, name, role, avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin@shopnova.com', hashedPassword, 'Admin', 'User', 'Admin User', 'admin', 'https://i.pravatar.cc/150?img=3']
      );
    }

    const customerExists = await pool.query('SELECT id FROM users WHERE email = $1', ['jane@example.com']);
    if (customerExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('customer123', 10);
      await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, name, role, avatar, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['jane@example.com', hashedPassword, 'Jane', 'Cooper', 'Jane Cooper', 'customer', 'https://i.pravatar.cc/150?img=47', '+1 (555) 123-4567']
      );
    }

    console.log('Database initialized');
  } catch (err) {
    console.error('Database init error:', (err as Error).message);
  }
}

// Register
app.post(
  '/api/auth/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, name } = req.body;
    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      const avatar = `https://i.pravatar.cc/150?u=${email}`;

      const result = await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, name, role, avatar)
         VALUES ($1, $2, $3, $4, $5, 'customer', $6) RETURNING id, email, name, role, avatar, created_at`,
        [email, hashedPassword, firstName, lastName, name, avatar]
      );

      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

      publishEvent('user.registered', { userId: user.id, email: user.email, name: user.name });

      res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar, createdAt: user.created_at } });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Login
app.post(
  '/api/auth/login',
  [body('email').isEmail(), body('password').notEmpty()],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

      publishEvent('user.login', { userId: user.id, email: user.email });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          createdAt: user.created_at,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get profile
app.get('/api/auth/profile', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, name, role, avatar, phone, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
app.put('/api/auth/profile', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  const { name, phone } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), updated_at = NOW() WHERE id = $3 RETURNING id, email, name, role, avatar, phone',
      [name, phone, req.user!.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (admin)
app.get('/api/users', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: express.Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, avatar, phone, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

export { app, pool, JWT_SECRET };

async function start() {
  await initDB();
  await connectRabbitMQ();
  app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
  });
}

if (require.main === module) {
  start();
}
