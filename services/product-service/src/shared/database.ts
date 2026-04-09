import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'shopnova_products',
  user: process.env.DB_USER || 'shopnova',
  password: process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : 'dev-password'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const initializeDatabase = async () => {
  try {
    // Categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        icon VARCHAR(50),
        color VARCHAR(20),
        product_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        tags TEXT[],
        in_stock BOOLEAN DEFAULT true,
        image_url VARCHAR(500),
        rating DECIMAL(2,1) DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_avatar VARCHAR(500),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for better performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)`);

    // Full-text search index (removed for now - can be added later with proper setup)
    // await pool.query(`
    //   CREATE INDEX IF NOT EXISTS idx_products_search 
    //   ON products USING GIN(to_tsvector('english', name || ' ' || description || ' ' || COALESCE(array_to_string(tags, ' '), '')))
    // `);

    console.log('✅ Product service database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

export { pool };
export default pool;
