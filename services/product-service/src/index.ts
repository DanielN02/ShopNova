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
      // Handle both category ID and category name
      if (isNaN(parseInt(category as string))) {
        // Category is a name
        query += ' WHERE c.name = $1';
        params.push(category);
      } else {
        // Category is an ID
        query += ' WHERE p.category_id = $1';
        params.push(category);
      }
    }
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` ORDER BY p.${sort} ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id';
    const countParams: any[] = [];
    if (category) {
      if (isNaN(parseInt(category as string))) {
        // Category is a name
        countQuery += ' WHERE c.name = $1';
        countParams.push(category);
      } else {
        // Category is an ID
        countQuery += ' WHERE p.category_id = $1';
        countParams.push(category);
      }
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

// Seed database endpoint (for testing)
app.get('/api/seed', async (req, res) => {
  try {
    console.log('🌱 Starting database seeding with ShopNova products...');
    
    // Create categories from the app
    const categories = [
      { name: 'Electronics', icon: '💻', color: '#3B82F6' },
      { name: 'Fashion', icon: '👗', color: '#EC4899' },
      { name: 'Sports', icon: '🏃', color: '#10B981' },
      { name: 'Home & Kitchen', icon: '🏠', color: '#F59E0B' },
      { name: 'Beauty', icon: '✨', color: '#8B5CF6' },
      { name: 'Books', icon: '📚', color: '#F97316' }
    ];

    for (const category of categories) {
      await pool.query(
        'INSERT INTO categories (name, icon, color) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [category.name, category.icon, category.color]
      );
    }

    // Get category IDs
    const categoryResult = await pool.query('SELECT id, name FROM categories ORDER BY id');
    const categoryMap = categoryResult.rows.reduce((acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    }, {} as Record<string, number>);

    // Create products from the app's MOCK_PRODUCTS
    const products = [
      {
        name: 'ProBook Ultra 15 Laptop',
        description: 'Unleash your productivity with the ProBook Ultra 15 — featuring a stunning 4K OLED display, Intel Core i9 processor, 32GB RAM, and 1TB NVMe SSD. Perfect for professionals and creatives who demand the best.',
        price: 1299.99,
        category_id: categoryMap['Electronics'],
        tags: ['laptop', 'computer', 'work', 'gaming'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1729496293008-0794382070c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBjb21wdXRlciUyMGVsZWN0cm9uaWNzfGVufDF8fHx8MTc3NDQyNzg1Mnww&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'SoundWave Pro Headphones',
        description: 'Experience audio like never before. SoundWave Pro delivers immersive 3D surround sound, 40-hour battery life, and active noise cancellation. Industry-leading clarity for music, calls, and gaming.',
        price: 249.99,
        category_id: categoryMap['Electronics'],
        tags: ['headphones', 'audio', 'wireless', 'music'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1640300065113-738f2abb8ba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aXJlbGVzcyUyMGhlYWRwaG9uZXMlMjBhdWRpb3xlbnwxfHx8fDE3NzQ0MTE3MDd8MA&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'Nova X12 Smartphone',
        description: 'The Nova X12 redefines the smartphone experience — a 6.7" ProMotion display, 200MP camera system, all-day battery with 100W fast charging, and lightning-fast performance.',
        price: 899.99,
        category_id: categoryMap['Electronics'],
        tags: ['smartphone', 'mobile', '5G', 'camera'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1646719223599-9864b351e242?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwbW9iaWxlJTIwZGV2aWNlfGVufDF8fHx8MTc3NDQ3NzY2M3ww&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'ArcRun Pro Sneakers',
        description: 'Engineered for champions. ArcRun Pro sneakers combine advanced cushioning technology, breathable knit upper, and carbon-fiber plate for explosive performance during every run.',
        price: 159.99,
        category_id: categoryMap['Sports'],
        tags: ['shoes', 'running', 'sports', 'fitness'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1695459468644-717c8ae17eed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxydW5uaW5nJTIwc2hvZXMlMjBzbmVha2Vyc3xlbnwxfHx8fDE3NzQ0NDU4NDN8MA&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'Luxe Linen Blazer',
        description: 'Effortlessly chic. Our Luxe Linen Blazer is crafted from premium European linen with a tailored fit that transitions seamlessly from the boardroom to weekend brunch.',
        price: 189.99,
        category_id: categoryMap['Fashion'],
        tags: ['blazer', 'fashion', 'linen', 'formal'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1763771522867-c26bf75f12bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwY2xvdGhpbmclMjBhcHBhcmVsfGVufDF8fHx8MTc3NDQ4NzAyNnww&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'BrewMaster Elite Coffee Maker',
        description: 'Transform your morning ritual. The BrewMaster Elite features a precision temperature control system, built-in grinder, and programmable brewing schedules — barista-quality coffee at home.',
        price: 299.99,
        category_id: categoryMap['Home & Kitchen'],
        tags: ['coffee', 'kitchen', 'appliance', 'brewing'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1760278679190-ca627281de03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBtYWtlciUyMGtpdGNoZW4lMjBhcHBsaWFuY2V8ZW58MXx8fHwxNzc0NDIyODg2fDA&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'IronFlex Pro Dumbbell Set',
        description: 'Build your dream home gym with the IronFlex Pro adjustable dumbbell set. Ranges from 5 to 52.5 lbs with a quick-lock dial system. Space-saving and commercial-grade durability.',
        price: 349.99,
        category_id: categoryMap['Sports'],
        tags: ['dumbbells', 'fitness', 'gym', 'weights'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1770493895453-4f758c40d11d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwZHVtYmJlbGwlMjBneW0lMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzc0NDg3MDI2fDA&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'TimePiece Series 5 Smart Watch',
        description: 'More than a watch — a health companion. TimePiece Series 5 tracks your heart rate, SpO2, sleep quality, and stress levels with medical-grade accuracy. Always-on AMOLED display and 7-day battery.',
        price: 399.99,
        category_id: categoryMap['Electronics'],
        tags: ['smartwatch', 'wearable', 'fitness', 'health'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1716234479503-c460b87bdf98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydCUyMHdhdGNoJTIwd2VhcmFibGUlMjB0ZWNofGVufDF8fHx8MTc3NDQwOTQ1N3ww&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'GlowUp Skincare Collection',
        description: 'Science-backed beauty. Our GlowUp 5-piece collection includes a hydrating serum, vitamin C brightener, retinol night cream, SPF 50 moisturizer, and cleansing balm — dermatologist recommended.',
        price: 129.99,
        category_id: categoryMap['Beauty'],
        tags: ['skincare', 'beauty', 'serum', 'moisturizer'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1624819318229-f006595a4993?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxza2luY2FyZSUyMGJlYXV0eSUyMHByb2R1Y3RzfGVufDF8fHx8MTc3NDQ1NDcxMnww&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'Mindful Reading Bundle',
        description: 'Feed your mind with our handpicked bestseller collection. Includes 5 acclaimed titles on productivity, mindfulness, and leadership — curated by top CEOs and life coaches.',
        price: 79.99,
        category_id: categoryMap['Books'],
        tags: ['books', 'reading', 'self-help', 'education'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1716654716572-7b13ad56ba63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib29rcyUyMHJlYWRpbmclMjBsaWJyYXJ5fGVufDF8fHx8MTc3NDQyNzc0MHww&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'VisionX Pro DSLR Camera',
        description: 'Capture moments in breathtaking detail. The VisionX Pro DSLR features a 45MP full-frame sensor, dual-card slot, 8K video recording, and weather-sealed magnesium alloy body.',
        price: 2499.99,
        category_id: categoryMap['Electronics'],
        tags: ['camera', 'photography', 'DSLR', 'video'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW1lcmElMjBwaG90b2dyYXBoeSUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzQ0MDc3OTh8MA&ixlib=rb-4.1.0&q=80&w=1080'
      },
      {
        name: 'CoreStrength Yoga Mat Premium',
        description: 'Elevate your practice with the CoreStrength Premium Yoga Mat — extra-thick 6mm cushioning, non-slip micro-suede surface, alignment guides, and eco-friendly TPE material.',
        price: 89.99,
        category_id: categoryMap['Sports'],
        tags: ['yoga', 'fitness', 'mat', 'wellness'],
        in_stock: true,
        image_url: 'https://images.unsplash.com/photo-1770493895453-4f758c40d11d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwZHVtYmJlbGwlMjBneW0lMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzc0NDg3MDI2fDA&ixlib=rb-4.1.0&q=80&w=1080'
      }
    ];

    for (const product of products) {
      const result = await pool.query(
        `INSERT INTO products (name, description, price, category_id, tags, in_stock, image_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [product.name, product.description, product.price, product.category_id, product.tags, product.in_stock, product.image_url]
      );
      
      const productId = result.rows[0].id;
      
      // Add reviews from the app's MOCK_REVIEWS
      const reviews = [
        { rating: 5, comment: 'Absolutely love this laptop! The 4K display is stunning and the performance is incredible. Battery life easily lasts a full workday.', user_name: 'Jane Cooper' },
        { rating: 4, comment: 'Great laptop for the price. Fast, sleek, and the display is gorgeous. Docking slightly for the fan noise under heavy load.', user_name: 'Robert Fox' },
        { rating: 5, comment: 'Best headphones I\'ve ever owned! The noise cancellation is on another level and the sound quality is phenomenal.', user_name: 'Emily Watson' },
        { rating: 4, comment: 'Excellent product! Highly recommended.', user_name: 'Test User 1' },
        { rating: 5, comment: 'Amazing quality! Will definitely buy again.', user_name: 'Test User 2' }
      ];
      
      // Add 1-3 random reviews per product
      const numReviews = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numReviews; i++) {
        const review = reviews[i % reviews.length];
        await pool.query(
          'INSERT INTO reviews (product_id, user_id, user_name, user_avatar, rating, comment) VALUES ($1, $2, $3, $4, $5, $6)',
          [productId, `user${i + 1}`, review.user_name, '/assets/images/faceless_profile.jpeg', review.rating, review.comment]
        );
      }
    }

    // Update product counts in categories
    await pool.query(`
      UPDATE categories 
      SET product_count = (
        SELECT COUNT(*) 
        FROM products 
        WHERE category_id = categories.id
      )
    `);

    // Get final counts
    const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
    const categoryCount = await pool.query('SELECT COUNT(*) as count FROM categories');
    const reviewCount = await pool.query('SELECT COUNT(*) as count FROM reviews');

    res.json({
      message: 'Database seeded successfully with ShopNova products!',
      stats: {
        products: parseInt(productCount.rows[0].count),
        categories: parseInt(categoryCount.rows[0].count),
        reviews: parseInt(reviewCount.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: 'Failed to seed database' });
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
      console.log('🎉 Product service started successfully!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

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

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Export app for testing
export { app };
