import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import amqplib from 'amqplib';
import Redis from 'ioredis';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://shopnova:shopnova123@localhost:27017/product_service?authSource=admin';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://shopnova:shopnova123@localhost:5672';
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

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

  app.use('/api/'  , generalLimiter);
  app.use('/api/products/search', searchLimiter);
}
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Image upload configuration
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  },
});

// Serve uploaded images as static files
app.use('/uploads', express.static(uploadsDir));

let redis: Redis | null = null;
let channel: amqplib.Channel | null = null;
let esClient: ElasticClient | null = null;
let esAvailable = false;
const ES_INDEX = 'shopnova_products';

// MongoDB Schemas
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: Number,
  category: { type: String, required: true, index: true },
  tags: [String],
  image: String,
  images: [String],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: String,
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: String,
  productCount: { type: Number, default: 0 },
  color: String,
});

const Product = mongoose.model('Product', productSchema);
const Review = mongoose.model('Review', reviewSchema);
const Category = mongoose.model('Category', categorySchema);

// Auth middleware
interface AuthRequest extends express.Request {
  user?: { id: number; email: string; role: string };
}

function authMiddleware(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return; }
  try {
    req.user = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function optionalAuth(req: AuthRequest, _res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string }; } catch { /* ignore */ }
  }
  next();
}

async function connectServices() {
  try {
    redis = new Redis(REDIS_URL);
    redis.on('error', () => { console.warn('Redis not available'); redis = null; });
    console.log('Redis connected');
  } catch { console.warn('Redis not available'); }

  try {
    const conn = await amqplib.connect(RABBITMQ_URL);
    channel = await conn.createChannel();
    await channel.assertExchange('shopnova_events', 'topic', { durable: true });
    console.log('RabbitMQ connected');
  } catch { console.warn('RabbitMQ not available'); }

  try {
    esClient = new ElasticClient({ node: ELASTICSEARCH_URL });
    await esClient.ping();
    esAvailable = true;
    console.log('Elasticsearch connected');
    await ensureESIndex();
  } catch {
    console.warn('Elasticsearch not available — falling back to MongoDB text search');
    esClient = null;
    esAvailable = false;
  }
}

async function ensureESIndex() {
  if (!esClient) return;
  try {
    const exists = await esClient.indices.exists({ index: ES_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: ES_INDEX,
        settings: { number_of_shards: 1, number_of_replicas: 0 },
        mappings: {
          properties: {
            name: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            category: { type: 'keyword' },
            tags: { type: 'keyword' },
            price: { type: 'float' },
            rating: { type: 'float' },
            stock: { type: 'integer' },
            featured: { type: 'boolean' },
            image: { type: 'keyword', index: false },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log('Elasticsearch index created');
    }
  } catch (err) {
    console.error('ES index creation error:', err);
  }
}

async function syncProductsToES() {
  if (!esClient || !esAvailable) return;
  try {
    const products = await Product.find().lean();
    if (products.length === 0) return;
    const body = products.flatMap((p) => [
      { index: { _index: ES_INDEX, _id: (p._id as mongoose.Types.ObjectId).toString() } },
      {
        name: p.name,
        description: p.description,
        category: p.category,
        tags: p.tags,
        price: p.price,
        rating: p.rating,
        stock: p.stock,
        featured: p.featured,
        image: p.image,
        createdAt: p.createdAt,
      },
    ]);
    await esClient.bulk({ operations: body, refresh: true });
    console.log(`Synced ${products.length} products to Elasticsearch`);
  } catch (err) {
    console.error('ES sync error:', err);
  }
}

async function indexProductToES(product: Record<string, unknown>) {
  if (!esClient || !esAvailable) return;
  try {
    await esClient.index({
      index: ES_INDEX,
      id: (product._id as string).toString(),
      document: {
        name: product.name,
        description: product.description,
        category: product.category,
        tags: product.tags,
        price: product.price,
        rating: product.rating,
        stock: product.stock,
        featured: product.featured,
        image: product.image,
        createdAt: product.createdAt,
      },
      refresh: true,
    });
  } catch (err) {
    console.error('ES index product error:', err);
  }
}

async function removeProductFromES(id: string) {
  if (!esClient || !esAvailable) return;
  try {
    await esClient.delete({ index: ES_INDEX, id, refresh: true });
  } catch { /* ignore if not found */ }
}

function publishEvent(routingKey: string, data: Record<string, unknown>) {
  if (channel) channel.publish('shopnova_events', routingKey, Buffer.from(JSON.stringify(data)));
}

async function getCached(key: string): Promise<string | null> {
  if (!redis) return null;
  try { return await redis.get(key); } catch { return null; }
}

async function setCache(key: string, data: unknown, ttl = 300) {
  if (!redis) return;
  try { await redis.setex(key, ttl, JSON.stringify(data)); } catch { /* ignore */ }
}

async function clearCache(pattern: string) {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch { /* ignore */ }
}

// Seed data
async function seedProducts() {
  const count = await Product.countDocuments();
  if (count > 0) return;

  const categories = [
    { name: 'Electronics', icon: '💻', productCount: 5, color: 'bg-blue-100 text-blue-700' },
    { name: 'Fashion', icon: '👗', productCount: 1, color: 'bg-pink-100 text-pink-700' },
    { name: 'Sports', icon: '🏃', productCount: 3, color: 'bg-green-100 text-green-700' },
    { name: 'Home & Kitchen', icon: '🏠', productCount: 1, color: 'bg-yellow-100 text-yellow-700' },
    { name: 'Beauty', icon: '✨', productCount: 1, color: 'bg-purple-100 text-purple-700' },
    { name: 'Books', icon: '📚', productCount: 1, color: 'bg-orange-100 text-orange-700' },
  ];
  await Category.insertMany(categories);

  const products = [
    { name: 'ProBook Ultra 15 Laptop', description: 'Unleash your productivity with the ProBook Ultra 15 — featuring a stunning 4K OLED display, Intel Core i9 processor, 32GB RAM, and 1TB NVMe SSD.', price: 1299.99, originalPrice: 1599.99, category: 'Electronics', tags: ['laptop', 'computer', 'work', 'gaming'], image: 'https://images.unsplash.com/photo-1729496293008-0794382070c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBjb21wdXRlciUyMGVsZWN0cm9uaWNzfGVufDF8fHx8MTc3NDQyNzg1Mnww&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.7, reviewCount: 284, stock: 45, featured: true },
    { name: 'SoundWave Pro Headphones', description: 'Experience audio like never before. Immersive 3D surround sound, 40-hour battery life, and active noise cancellation.', price: 249.99, originalPrice: 349.99, category: 'Electronics', tags: ['headphones', 'audio', 'wireless', 'music'], image: 'https://images.unsplash.com/photo-1640300065113-738f2abb8ba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aXJlbGVzcyUyMGhlYWRwaG9uZXMlMjBhdWRpb3xlbnwxfHx8fDE3NzQ0MTE3MDd8MA&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.8, reviewCount: 512, stock: 120, featured: true },
    { name: 'Nova X12 Smartphone', description: 'The Nova X12 redefines the smartphone experience — a 6.7" ProMotion display, 200MP camera system, all-day battery.', price: 899.99, originalPrice: 999.99, category: 'Electronics', tags: ['smartphone', 'mobile', '5G', 'camera'], image: 'https://images.unsplash.com/photo-1646719223599-9864b351e242?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwbW9iaWxlJTIwZGV2aWNlfGVufDF8fHx8MTc3NDQ3NzY2M3ww&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.6, reviewCount: 943, stock: 200, featured: true },
    { name: 'ArcRun Pro Sneakers', description: 'Engineered for champions. Advanced cushioning technology, breathable knit upper, and carbon-fiber plate.', price: 159.99, originalPrice: 199.99, category: 'Sports', tags: ['shoes', 'running', 'sports', 'fitness'], image: 'https://images.unsplash.com/photo-1695459468644-717c8ae17eed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxydW5uaW5nJTIwc2hvZXMlMjBzbmVha2Vyc3xlbnwxfHx8fDE3NzQ0NDU4NDN8MA&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.5, reviewCount: 387, stock: 85, featured: false },
    { name: 'Luxe Linen Blazer', description: 'Effortlessly chic. Premium European linen with a tailored fit.', price: 189.99, originalPrice: 249.99, category: 'Fashion', tags: ['blazer', 'fashion', 'linen', 'formal'], image: 'https://images.unsplash.com/photo-1763771522867-c26bf75f12bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwY2xvdGhpbmclMjBhcHBhcmVsfGVufDF8fHx8MTc3NDQ4NzAyNnww&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.3, reviewCount: 156, stock: 60, featured: false },
    { name: 'BrewMaster Elite Coffee Maker', description: 'Transform your morning ritual. Precision temperature control, built-in grinder, programmable brewing.', price: 299.99, originalPrice: 399.99, category: 'Home & Kitchen', tags: ['coffee', 'kitchen', 'appliance', 'brewing'], image: 'https://images.unsplash.com/photo-1760278679190-ca627281de03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBtYWtlciUyMGtpdGNoZW4lMjBhcHBsaWFuY2V8ZW58MXx8fHwxNzc0NDIyODg2fDA&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.9, reviewCount: 731, stock: 30, featured: true },
    { name: 'IronFlex Pro Dumbbell Set', description: 'Build your dream home gym. Ranges from 5 to 52.5 lbs with a quick-lock dial system.', price: 349.99, category: 'Sports', tags: ['dumbbells', 'fitness', 'gym', 'weights'], image: 'https://images.unsplash.com/photo-1770493895453-4f758c40d11d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwZHVtYmJlbGwlMjBneW0lMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzc0NDg3MDI2fDA&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.6, reviewCount: 289, stock: 55, featured: false },
    { name: 'TimePiece Series 5 Smart Watch', description: 'More than a watch — a health companion. Tracks heart rate, SpO2, sleep quality, and stress levels.', price: 399.99, originalPrice: 449.99, category: 'Electronics', tags: ['smartwatch', 'wearable', 'fitness', 'health'], image: 'https://images.unsplash.com/photo-1716234479503-c460b87bdf98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydCUyMHdhdGNoJTIwd2VhcmFibGUlMjB0ZWNofGVufDF8fHx8MTc3NDQwOTQ1N3ww&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.7, reviewCount: 654, stock: 90, featured: true },
    { name: 'GlowUp Skincare Collection', description: 'Science-backed beauty. 5-piece collection including hydrating serum, vitamin C brightener, retinol night cream.', price: 129.99, originalPrice: 179.99, category: 'Beauty', tags: ['skincare', 'beauty', 'serum', 'moisturizer'], image: 'https://images.unsplash.com/photo-1624819318229-f006595a4993?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxza2luY2FyZSUyMGJlYXV0eSUyMHByb2R1Y3RzfGVufDF8fHx8MTc3NDQ1NDcxMnww&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.4, reviewCount: 423, stock: 150, featured: false },
    { name: 'Mindful Reading Bundle', description: 'Feed your mind with our handpicked bestseller collection. 5 acclaimed titles on productivity, mindfulness.', price: 79.99, category: 'Books', tags: ['books', 'reading', 'self-help', 'education'], image: 'https://images.unsplash.com/photo-1716654716572-7b13ad56ba63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib29rcyUyMHJlYWRpbmclMjBsaWJyYXJ5fGVufDF8fHx8MTc3NDQyNzc0MHww&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.8, reviewCount: 198, stock: 300, featured: false },
    { name: 'VisionX Pro DSLR Camera', description: 'Capture moments in breathtaking detail. 45MP full-frame sensor, 8K video recording.', price: 2499.99, originalPrice: 2799.99, category: 'Electronics', tags: ['camera', 'photography', 'DSLR', 'video'], image: 'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW1lcmElMjBwaG90b2dyYXBoeSUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzQ0MDc3OTh8MA&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.9, reviewCount: 321, stock: 20, featured: true },
    { name: 'CoreStrength Yoga Mat Premium', description: 'Elevate your practice. Extra-thick 6mm cushioning, non-slip micro-suede surface, alignment guides.', price: 89.99, originalPrice: 119.99, category: 'Sports', tags: ['yoga', 'fitness', 'mat', 'wellness'], image: 'https://images.unsplash.com/photo-1770493895453-4f758c40d11d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwZHVtYmJlbGwlMjBneW0lMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzc0NDg3MDI2fDA&ixlib=rb-4.1.0&q=80&w=1080', images: [], rating: 4.5, reviewCount: 267, stock: 180, featured: false },
  ];

  await Product.insertMany(products);
  console.log('Seeded products and categories');
}

// ROUTES

// Get all products
app.get('/api/products', optionalAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { category, search, minPrice, maxPrice, minRating, tags, sort, featured, limit, page } = req.query;
    const cacheKey = `products:${JSON.stringify(req.query)}`;
    const cached = await getCached(cacheKey);
    if (cached) { res.json(JSON.parse(cached)); return; }

    const filter: Record<string, unknown> = {};
    if (category && category !== 'All') filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) (filter.price as Record<string, number>).$gte = Number(minPrice);
      if (maxPrice) (filter.price as Record<string, number>).$lte = Number(maxPrice);
    }
    if (minRating) filter.rating = { $gte: Number(minRating) };
    if (tags) filter.tags = { $in: (tags as string).split(',') };
    if (search) filter.$text = { $search: search as string };

    let sortObj: Record<string, 1 | -1> = { featured: -1, createdAt: -1 };
    if (sort === 'price-asc') sortObj = { price: 1 };
    else if (sort === 'price-desc') sortObj = { price: -1 };
    else if (sort === 'rating') sortObj = { rating: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    const result = { products, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
    await setCache(cacheKey, result, 60);
    res.json(result);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search products (Elasticsearch with MongoDB fallback)
app.get('/api/products/search', async (req: express.Request, res: express.Response) => {
  try {
    const { q, category, minPrice, maxPrice, minRating } = req.query;
    if (!q) { res.json({ products: [] }); return; }

    // Try Elasticsearch first
    if (esClient && esAvailable) {
      try {
        const must: Record<string, unknown>[] = [
          {
            multi_match: {
              query: q as string,
              fields: ['name^3', 'description', 'tags^2'],
              fuzziness: 'AUTO',
            },
          },
        ];
        const filter: Record<string, unknown>[] = [];
        if (category && category !== 'All') filter.push({ term: { category } });
        if (minPrice || maxPrice) {
          const range: Record<string, number> = {};
          if (minPrice) range.gte = Number(minPrice);
          if (maxPrice) range.lte = Number(maxPrice);
          filter.push({ range: { price: range } });
        }
        if (minRating) filter.push({ range: { rating: { gte: Number(minRating) } } });

        const esResult = await esClient.search({
          index: ES_INDEX,
          query: { bool: { must, filter } },
          size: 20,
        });

        const hits = esResult.hits.hits;
        const esIds = hits.map((h) => h._id).filter((id): id is string => !!id);
        const products = await Product.find({ _id: { $in: esIds } }).lean();

        // Preserve ES relevance ordering
        const productMap = new Map(products.map(p => [(p._id as mongoose.Types.ObjectId).toString(), p]));
        const ordered = esIds.map(id => productMap.get(id)).filter(Boolean);

        res.json({ products: ordered, source: 'elasticsearch' });
        return;
      } catch (esErr) {
        console.warn('ES search failed, falling back to MongoDB:', (esErr as Error).message);
      }
    }

    // MongoDB fallback
    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [(q as string).toLowerCase()] } },
      ],
    }).limit(20).lean();
    res.json({ products, source: 'mongodb' });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
app.get('/api/products/:id', async (req: express.Request, res: express.Response) => {
  try {
    const cached = await getCached(`product:${req.params.id}`);
    if (cached) { res.json(JSON.parse(cached)); return; }
    const product = await Product.findById(req.params.id).lean();
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    await setCache(`product:${req.params.id}`, product, 300);
    res.json(product);
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product (admin) - supports multipart/form-data with optional images
app.post('/api/products', authMiddleware, (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        return;
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({ error: 'Too many files. Maximum is 5 images.' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    next();
  });
}, async (req: AuthRequest, res: express.Response) => {
  if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  try {
    const body = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    // Parse tags if sent as a JSON string
    if (typeof body.tags === 'string') {
      try { body.tags = JSON.parse(body.tags); } catch { /* leave as-is */ }
    }
    // Parse numeric fields from form data
    if (body.price) body.price = Number(body.price);
    if (body.originalPrice) body.originalPrice = Number(body.originalPrice);
    if (body.stock) body.stock = Number(body.stock);
    if (body.rating) body.rating = Number(body.rating);
    if (body.reviewCount) body.reviewCount = Number(body.reviewCount);
    if (body.featured !== undefined) body.featured = body.featured === 'true' || body.featured === true;

    // Validate required fields for product creation
    const errors: string[] = [];
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) errors.push('Name is required');
    if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) errors.push('Description is required');
    if (body.price === undefined || body.price === null || isNaN(body.price) || body.price < 0) errors.push('Price must be a non-negative number');
    if (!body.category || typeof body.category !== 'string' || body.category.trim().length === 0) errors.push('Category is required');
    if (errors.length > 0) { res.status(400).json({ errors }); return; }

    if (files && files.length > 0) {
      const imageUrls = files.map(f => `/uploads/${f.filename}`);
      body.images = imageUrls;
      if (!body.image) {
        body.image = imageUrls[0];
      }
    }

    const product = new Product(body);
    await product.save();
    await clearCache('products:*');
    await Category.findOneAndUpdate({ name: product.category }, { $inc: { productCount: 1 } });
    await indexProductToES(product.toObject());
    publishEvent('product.created', { productId: product._id, name: product.name });
    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product (admin) - supports multipart/form-data with optional images
app.put('/api/products/:id', authMiddleware, (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        return;
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({ error: 'Too many files. Maximum is 5 images.' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    next();
  });
}, async (req: AuthRequest, res: express.Response) => {
  if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  try {
    const body = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    // Parse tags if sent as a JSON string
    if (typeof body.tags === 'string') {
      try { body.tags = JSON.parse(body.tags); } catch { /* leave as-is */ }
    }
    // Parse numeric fields from form data
    if (body.price) body.price = Number(body.price);
    if (body.originalPrice) body.originalPrice = Number(body.originalPrice);
    if (body.stock) body.stock = Number(body.stock);
    if (body.rating) body.rating = Number(body.rating);
    if (body.reviewCount) body.reviewCount = Number(body.reviewCount);
    if (body.featured !== undefined) body.featured = body.featured === 'true' || body.featured === true;

    // Validate fields for product update
    const errors: string[] = [];
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) errors.push('Name must be a non-empty string');
    if (body.price !== undefined && (isNaN(body.price) || body.price < 0)) errors.push('Price must be a non-negative number');
    if (body.category !== undefined && (typeof body.category !== 'string' || body.category.trim().length === 0)) errors.push('Category must be a non-empty string');
    if (errors.length > 0) { res.status(400).json({ errors }); return; }

    // Parse existingImages if sent as JSON string
    let existingImages: string[] = [];
    if (body.existingImages) {
      try { existingImages = JSON.parse(body.existingImages); } catch { /* ignore */ }
      delete body.existingImages;
    }

    if (files && files.length > 0) {
      const newImageUrls = files.map(f => `/uploads/${f.filename}`);
      body.images = [...existingImages, ...newImageUrls];
      if (!body.image) {
        body.image = body.images[0];
      }
    } else if (existingImages.length > 0) {
      body.images = existingImages;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    await clearCache('products:*');
    await clearCache(`product:${req.params.id}`);
    await indexProductToES(product.toObject());
    publishEvent('product.updated', { productId: product._id, name: product.name });
    res.json(product);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload images for a product (admin)
app.post('/api/products/:id/images', authMiddleware, (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        return;
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({ error: 'Too many files. Maximum is 5 images.' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    next();
  });
}, async (req: AuthRequest, res: express.Response) => {
  if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No images provided' });
      return;
    }

    const imageUrls = files.map(f => `/uploads/${f.filename}`);
    const product = await Product.findById(req.params.id);
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    const currentImages = product.images || [];
    product.images = [...currentImages, ...imageUrls];
    if (!product.image) {
      product.image = imageUrls[0];
    }
    await product.save();

    await clearCache('products:*');
    await clearCache(`product:${req.params.id}`);
    res.json({ images: product.images, newImages: imageUrls });
  } catch (err) {
    console.error('Upload images error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (admin)
app.delete('/api/products/:id', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    await clearCache('products:*');
    await Category.findOneAndUpdate({ name: product.category }, { $inc: { productCount: -1 } });
    await removeProductFromES(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
app.get('/api/categories', async (_req: express.Request, res: express.Response) => {
  try {
    const cached = await getCached('categories');
    if (cached) { res.json(JSON.parse(cached)); return; }
    const categories = await Category.find().lean();
    await setCache('categories', categories, 600);
    res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reviews
app.get('/api/products/:id/reviews', async (req: express.Request, res: express.Response) => {
  try {
    const reviews = await Review.find({ productId: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json(reviews);
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add review
app.post('/api/products/:id/reviews', authMiddleware,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().notEmpty().withMessage('Comment is required'),
  async (req: AuthRequest, res: express.Response) => {
  const valErrors = validationResult(req);
  if (!valErrors.isEmpty()) { res.status(400).json({ errors: valErrors.array() }); return; }
  try {
    const { rating, comment } = req.body;
    const review = new Review({
      productId: req.params.id,
      userId: req.user!.id.toString(),
      userName: req.user!.email.split('@')[0],
      rating,
      comment,
    });
    await review.save();
    const reviews = await Review.find({ productId: req.params.id });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Product.findByIdAndUpdate(req.params.id, { rating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length });
    await clearCache(`product:${req.params.id}`);
    res.status(201).json(review);
  } catch (err) {
    console.error('Add review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'product-service' });
});

async function start() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', (err as Error).message);
    console.log('Starting without MongoDB — will retry...');
  }
  await connectServices();
  await seedProducts();
  await syncProductsToES();
  app.listen(PORT, () => console.log(`Product Service running on port ${PORT}`));
}

export { app, Product, Category, Review };

if (require.main === module) {
  start();
}
