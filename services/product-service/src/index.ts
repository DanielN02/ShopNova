import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { initializeDatabase, pool } from './shared/database';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client for streams
const redis = new Redis(REDIS_URL);

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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  console.log(`🔍 Headers:`, Object.keys(req.headers));
  next();
});

app.use(express.json());

// Swagger documentation (before rate limiter)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rate limiters
if (process.env.NODE_ENV !== 'test') {
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many search requests, please try again later.' },
  });

  app.use('/api/', generalLimiter);
  app.use('/api/products/search', searchLimiter);
}

// Image upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Redis Streams setup
const initializeRedisStreams = async () => {
  try {
    // Create streams for product events
    await redis.xgroup('CREATE', 'shopnova.products', 'product-service-group', '$', 'MKSTREAM');
    console.log('✅ Redis Streams initialized for product service');
  } catch (error) {
    if (error instanceof Error && !error.message.includes('BUSYGROUP')) {
      console.error('❌ Redis Streams initialization error:', error);
    }
  }
};

// Event publishing function
export const publishEvent = async (eventType: string, data: any) => {
  try {
    await redis.xadd('shopnova.products', '*', 'event', eventType, 'data', JSON.stringify(data));
    console.log(`📤 Event published: ${eventType}`);
  } catch (error) {
    console.error('❌ Error publishing event:', error);
  }
};

// Auth middleware
interface AuthRequest extends express.Request {
  user?: { userId: string; email: string; role: string };
}

const authMiddleware = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'product-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'ShopNova Product Service',
    service: 'product-service',
    status: 'running',
    docs: '/api/docs',
    health: '/api/health'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Product service test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Categories endpoints
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/categories', 
  authMiddleware,
  [body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Category name must be 1-100 characters')],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, icon, color } = req.body;

      const result = await pool.query(
        'INSERT INTO categories (name, icon, color) VALUES ($1, $2, $3) RETURNING *',
        [name, icon, color]
      );

      const category = result.rows[0];
      
      // Publish category created event
      await publishEvent('category.created', category);

      res.status(201).json({
        message: 'Category created successfully',
        category
      });
    } catch (error: any) {
      console.error('Error creating category:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Category name already exists' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    const { category, page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = req.query;
    
    let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id';
    const params: any[] = [];
    
    if (category) {
      query += ' WHERE p.category_id = $1';
      params.push(category);
    }
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` ORDER BY p.${sort} ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM products p';
    const countParams: any[] = [];
    if (category) {
      countQuery += ' WHERE p.category_id = $1';
      countParams.push(category);
    }
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      products: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get reviews for this product
    const reviewsResult = await pool.query(
      'SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC',
      [id]
    );
    
    const product = result.rows[0];
    product.reviews = reviewsResult.rows;
    
    res.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/products',
  authMiddleware,
  upload.single('image'),
  [
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Product name must be 1-255 characters'),
    body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category_id').isInt().withMessage('Category ID must be an integer')
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, price, category_id, tags, in_stock } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
      
      const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
      
      const result = await pool.query(
        `INSERT INTO products (name, description, price, category_id, tags, in_stock, image_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, description, price, category_id, tagsArray, in_stock !== false, imageUrl]
      );

      const product = result.rows[0];
      
      // Update category product count
      await pool.query('UPDATE categories SET product_count = product_count + 1 WHERE id = $1', [category_id]);
      
      // Publish product created event
      await publishEvent('product.created', product);

      res.status(201).json({
        message: 'Product created successfully',
        product
      });
    } catch (error: any) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.put('/api/products/:id',
  authMiddleware,
  upload.single('image'),
  [
    body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Product name must be 1-255 characters'),
    body('description').optional().trim().isLength({ min: 1 }).withMessage('Description is required'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category_id').optional().isInt().withMessage('Category ID must be an integer')
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, description, price, category_id, tags, in_stock } = req.body;
      
      // Check if product exists
      const existingProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (existingProduct.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : existingProduct.rows[0].image_url;
      const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : existingProduct.rows[0].tags);
      
      const result = await pool.query(
        `UPDATE products 
         SET name = COALESCE($1, name), 
             description = COALESCE($2, description), 
             price = COALESCE($3, price), 
             category_id = COALESCE($4, category_id), 
             tags = $5, 
             in_stock = COALESCE($6, in_stock), 
             image_url = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8 RETURNING *`,
        [name, description, price, category_id, tagsArray, in_stock, imageUrl, id]
      );

      const product = result.rows[0];
      
      // Publish product updated event
      await publishEvent('product.updated', product);

      res.json({
        message: 'Product updated successfully',
        product
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.delete('/api/products/:id', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const existingProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    
    // Update category product count
    await pool.query('UPDATE categories SET product_count = product_count - 1 WHERE id = $1', [existingProduct.rows[0].category_id]);
    
    // Publish product deleted event
    await publishEvent('product.deleted', { id, name: existingProduct.rows[0].name });

    res.json({
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reviews endpoints
app.post('/api/products/:id/reviews',
  authMiddleware,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1-1000 characters')
  ],
  async (req: AuthRequest, res: express.Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user!.userId;
      
      // Check if product exists
      const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (productResult.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Check if user already reviewed
      const existingReview = await pool.query(
        'SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (existingReview.rows.length > 0) {
        return res.status(400).json({ error: 'You have already reviewed this product' });
      }
      
      const result = await pool.query(
        'INSERT INTO reviews (product_id, user_id, user_name, user_avatar, rating, comment) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [id, userId, req.user!.email, '/assets/images/faceless_profile.jpeg', rating, comment]
      );

      const review = result.rows[0];
      
      // Update product rating
      await pool.query(`
        UPDATE products 
        SET rating = (
          SELECT COALESCE(AVG(rating), 0) 
          FROM reviews 
          WHERE product_id = $1
        ),
        review_count = review_count + 1
        WHERE id = $1
      `, [id]);
      
      // Publish review created event
      await publishEvent('review.created', review);

      res.status(201).json({
        message: 'Review created successfully',
        review
      });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Search endpoint
app.get('/api/products/search', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, minRating, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (
        p.name ILIKE $1 
        OR p.description ILIKE $1 
        OR $1 = ANY(p.tags)
      )
    `;
    
    const params: any[] = [`%${q}%`];
    let paramIndex = 2;
    
    if (category) {
      query += ` AND p.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (minPrice) {
      query += ` AND p.price >= $${paramIndex}`;
      params.push(minPrice);
      paramIndex++;
    }
    
    if (maxPrice) {
      query += ` AND p.price <= $${paramIndex}`;
      params.push(maxPrice);
      paramIndex++;
    }
    
    if (minRating) {
      query += ` AND p.rating >= $${paramIndex}`;
      params.push(minRating);
      paramIndex++;
    }
    
    query += ` ORDER BY p.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      products: result.rows,
      query: q,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting product service...');
    console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔧 Port: ${process.env.PORT || 3002}`);
    
    // Initialize database
    console.log('🗄️ Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Initialize Redis Streams
    console.log('🌊 Initializing Redis Streams...');
    await initializeRedisStreams();
    console.log('✅ Redis Streams initialized');
    
    // Start HTTP server
    console.log('🌐 Starting HTTP server...');
    server.listen(PORT, () => {
      console.log(`🚀 Product Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`🔗 Available endpoints:`);
      console.log(`   GET  /                    - Root endpoint`);
      console.log(`   GET  /api/test            - Test endpoint`);
      console.log(`   GET  /api/health          - Health check`);
      console.log(`   GET  /api/docs            - Swagger documentation`);
      console.log(`   GET  /api/products        - Get products`);
      console.log(`   GET  /api/categories      - Get categories`);
      console.log(`   GET  /api/products/search - Search products`);
      console.log('🎉 Product service started successfully!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Export app for testing
export { app };

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  redis.disconnect();
  process.exit(0);
});

startServer();
