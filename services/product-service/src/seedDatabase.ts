import { pool } from './shared/database';

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database with sample data...');

    // Create categories
    const categories = [
      { name: 'Electronics', icon: 'laptop', color: '#3B82F6' },
      { name: 'Clothing', icon: 'shirt', color: '#10B981' },
      { name: 'Books', icon: 'book', color: '#F59E0B' },
      { name: 'Home & Garden', icon: 'home', color: '#8B5CF6' },
      { name: 'Sports', icon: 'football', color: '#EF4444' }
    ];

    for (const category of categories) {
      await pool.query(
        'INSERT INTO categories (name, icon, color) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [category.name, category.icon, category.color]
      );
    }

    console.log('✅ Categories created');

    // Get category IDs
    const categoryResult = await pool.query('SELECT id, name FROM categories ORDER BY id');
    const categoryMap = categoryResult.rows.reduce((acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    }, {} as Record<string, number>);

    // Create products
    const products = [
      {
        name: 'MacBook Pro 14"',
        description: 'Powerful laptop with M2 Pro chip, 16GB RAM, 512GB SSD. Perfect for professionals and creators.',
        price: 1999.99,
        category_id: categoryMap['Electronics'],
        tags: ['laptop', 'apple', 'm2', 'professional'],
        in_stock: true,
        image_url: 'https://picsum.photos/seed/macbook-pro/400/300.jpg'
      },
      {
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone with titanium design, A17 Pro chip, and advanced camera system.',
        price: 999.99,
        category_id: categoryMap['Electronics'],
        tags: ['phone', 'apple', 'smartphone', 'camera'],
        in_stock: true,
        image_url: 'https://picsum.photos/seed/iphone-15/400/300.jpg'
      },
      {
        name: 'Sony WH-1000XM5',
        description: 'Premium noise-canceling headphones with exceptional sound quality and 30-hour battery life.',
        price: 349.99,
        category_id: categoryMap['Electronics'],
        tags: ['headphones', 'sony', 'noise-canceling', 'wireless'],
        in_stock: true,
        image_url: 'https://picsum.photos/seed/sony-headphones/400/300.jpg'
      },
      {
        name: 'Nike Air Max 90',
        description: 'Classic running shoes with iconic design and comfortable cushioning for everyday wear.',
        price: 120.00,
        category_id: categoryMap['Clothing'],
        tags: ['shoes', 'nike', 'running', 'athletic'],
        in_stock: true,
        image_url: 'https://picsum.photos/seed/nike-air-max/400/300.jpg'
      },
      {
        name: "Levi's 501 Jeans",
        description: 'Original straight-fit jeans made from premium denim. Timeless style for any occasion.',
        price: 79.99,
        category_id: categoryMap['Clothing'],
        tags: ['jeans', 'levi', 'denim', 'casual'],
        in_stock: true,
        image_url: 'https://picsum.photos/seed/levis-501/400/300.jpg'
      },
      {
        name: 'The Great Gatsby',
        description: 'Classic American novel by F. Scott Fitzgerald. A timeless story of wealth, love, and the American Dream.',
        price: 12.99,
        category_id: categoryMap['Books'],
        tags: ['fiction', 'classic', 'literature', 'american'],
        in_stock: true,
        image_url: 'https://picsum.photos/seed/great-gatsby/400/300.jpg'
      },
      {
        name: 'Atomic Habits',
        description: 'Bestselling self-help book by James Clear. Learn how to build good habits and break bad ones.',
        price: 16.99,
        category_id: categoryMap['Books'],
        tags: ['self-help', 'psychology', 'habits', 'productivity'],
        in_stock: true,
        image_url: 'https://picsum.photos/seed/atomic-habits/400/300.jpg'
      },
      {
        name: 'Smart Garden Kit',
        description: 'Indoor herb garden with LED grow lights. Perfect for growing fresh herbs year-round.',
        price: 89.99,
        category_id: categoryMap['Home & Garden'],
        tags: ['garden', 'indoor', 'herbs', 'smart'],
        in_stock: true,
        image_url: 'https://picsum.photos/seed/smart-garden/400/300.jpg'
      },
      {
        name: 'Yoga Mat Premium',
        description: 'Extra-thick eco-friendly yoga mat with alignment markers. Non-slip surface for safe practice.',
        price: 45.00,
        category_id: categoryMap['Sports'],
        tags: ['yoga', 'fitness', 'mat', 'exercise'],
        in_stock: true,
        image_url: 'https://picsum.photos/seed/yoga-mat/400/300.jpg'
      },
      {
        name: 'iPad Air',
        description: 'Versatile tablet with M1 chip, 10.9-inch display, and all-day battery life.',
        price: 599.99,
        category_id: categoryMap['Electronics'],
        tags: ['tablet', 'apple', 'ipad', 'm1'],
        in_stock: true,
        image_url: 'https://picsum.photos/seed/ipad-air/400/300.jpg'
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
      
      // Add some sample reviews
      const reviews = [
        { rating: 5, comment: 'Excellent product! Highly recommended.' },
        { rating: 4, comment: 'Good value for money. Works as expected.' },
        { rating: 5, comment: 'Amazing quality! Will definitely buy again.' }
      ];
      
      // Add 1-3 random reviews per product
      const numReviews = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numReviews; i++) {
        const review = reviews[i];
        await pool.query(
          'INSERT INTO reviews (product_id, user_id, user_name, user_avatar, rating, comment) VALUES ($1, $2, $3, $4, $5, $6)',
          [productId, `user${i + 1}`, `Test User ${i + 1}`, '/assets/images/faceless_profile.jpeg', review.rating, review.comment]
        );
      }
    }

    console.log('✅ Products and reviews created');

    // Update product counts in categories
    await pool.query(`
      UPDATE categories 
      SET product_count = (
        SELECT COUNT(*) 
        FROM products 
        WHERE category_id = categories.id
      )
    `);

    console.log('✅ Category product counts updated');

    // Get final counts
    const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
    const categoryCount = await pool.query('SELECT COUNT(*) as count FROM categories');
    const reviewCount = await pool.query('SELECT COUNT(*) as count FROM reviews');

    console.log('🎉 Database seeding completed!');
    console.log(`📦 Products: ${productCount.rows[0].count}`);
    console.log(`🏷️  Categories: ${categoryCount.rows[0].count}`);
    console.log(`⭐ Reviews: ${reviewCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
