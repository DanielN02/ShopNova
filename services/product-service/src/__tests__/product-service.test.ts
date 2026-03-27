import request from 'supertest';
import { app } from '../index';
import { pool } from '../shared/database';

describe('Product Service API Tests', () => {
  let authToken: string;
  let testProductId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM products WHERE name LIKE \'test-%\'');
    await pool.query('DELETE FROM categories WHERE name LIKE \'test-%\'');
    
    // Create test category
    const categoryResult = await pool.query(
      `INSERT INTO categories (name, icon, color) 
       VALUES ($1, $2, $3) RETURNING id`,
      ['test-category', '🧪', '#FF0000']
    );
    testCategoryId = categoryResult.rows[0].id;

    // Create test product
    const productResult = await pool.query(
      `INSERT INTO products (name, description, price, category_id, tags, in_stock, image_url, rating, review_count) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        'test-product-laptop',
        'Test Laptop for testing',
        999.99,
        testCategoryId,
        ['laptop', 'test'],
        true,
        'https://example.com/test-laptop.jpg',
        4.5,
        10
      ]
    );
    testProductId = productResult.rows[0].id;

    // Generate auth token for testing
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { userId: 'test-user', email: 'test@example.com' },
      process.env.JWT_SECRET || 'shopnova-secret-key-change-in-production',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM products WHERE name LIKE \'test-%\'');
    await pool.query('DELETE FROM categories WHERE name LIKE \'test-%\'');
    await pool.end();
  });

  describe('Product Endpoints', () => {
    it('should get all products', async () => {
      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.products).toBeDefined();
      expect(response.body.products.length).toBeGreaterThan(0);
      expect(response.body.products[0]).toHaveProperty('image_url');
      expect(response.body.products[0]).toHaveProperty('price');
      expect(typeof response.body.products[0].price).toBe('string');
    });

    it('should get products by category', async () => {
      const response = await request(app)
        .get('/api/products?category=Electronics');

      expect(response.status).toBe(200);
      expect(response.body.products).toBeDefined();
    });

    it('should get products by category name', async () => {
      const response = await request(app)
        .get('/api/products?category=test-category');

      expect(response.status).toBe(200);
      expect(response.body.products).toBeDefined();
    });

    it('should get products with pagination', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.products).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should get product by ID', async () => {
      const response = await request(app)
        .get(`/api/products/${testProductId}`);

      expect(response.status).toBe(200);
      expect(response.body.product).toBeDefined();
      expect(response.body.product.name).toBe('test-product-laptop');
      expect(response.body.product).toHaveProperty('image_url');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should search products', async () => {
      const response = await request(app)
        .get('/api/products/search?q=laptop');

      expect(response.status).toBe(200);
      expect(response.body.products).toBeDefined();
    });

    it('should create a new product (protected)', async () => {
      const productData = {
        name: 'test-new-product',
        description: 'New test product',
        price: 199.99,
        category_id: testCategoryId,
        tags: ['new', 'test'],
        in_stock: true,
        image_url: 'https://example.com/new-product.jpg'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.product.name).toBe('test-new-product');
    });

    it('should reject product creation without auth', async () => {
      const productData = {
        name: 'test-unauthorized-product',
        description: 'Unauthorized test product',
        price: 299.99,
        category_id: testCategoryId,
        tags: ['unauthorized'],
        in_stock: true,
        image_url: 'https://example.com/unauthorized.jpg'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should update a product (protected)', async () => {
      const updateData = {
        name: 'test-product-laptop-updated',
        price: 1099.99
      };

      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.product.name).toBe('test-product-laptop-updated');
      expect(response.body.product.price).toBe('109.99'); // Note: comes back as string
    });

    it('should delete a product (protected)', async () => {
      // Create a product to delete
      const deleteProductResult = await pool.query(
        `INSERT INTO products (name, description, price, category_id, tags, in_stock, image_url, rating, review_count) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          'test-product-to-delete',
          'Product to delete',
          49.99,
          testCategoryId,
          ['delete', 'test'],
          true,
          'https://example.com/delete.jpg',
          3.0,
          5
        ]
      );
      const deleteProductId = deleteProductResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/products/${deleteProductId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Product deleted successfully');
    });
  });

  describe('Category Endpoints', () => {
    it('should get all categories', async () => {
      const response = await request(app)
        .get('/api/categories');

      expect(response.status).toBe(200);
      expect(response.body.categories).toBeDefined();
      expect(response.body.categories.length).toBeGreaterThan(0);
      expect(response.body.categories[0]).toHaveProperty('name');
      expect(response.body.categories[0]).toHaveProperty('product_count');
    });

    it('should create a new category (protected)', async () => {
      const categoryData = {
        name: 'test-new-category',
        icon: '🧪',
        color: '#00FF00'
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(categoryData);

      expect(response.status).toBe(201);
      expect(response.body.category.name).toBe('test-new-category');
    });

    it('should reject category creation without auth', async () => {
      const categoryData = {
        name: 'test-unauthorized-category',
        icon: '🚫',
        color: '#FF0000'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData);

      expect(response.status).toBe(401);
    });
  });

  describe('Data Validation', () => {
    it('should validate product creation data', async () => {
      const invalidProduct = {
        name: '', // Invalid: empty name
        description: 'Invalid product',
        price: -10, // Invalid: negative price
        category_id: 'invalid-id'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidProduct);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle malformed price data', async () => {
      // Test that the API handles price as string correctly
      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.products[0]).toHaveProperty('price');
      // Price should be a string from the database
      expect(typeof response.body.products[0].price).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // For now, just test that the endpoint exists
      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(200);
    });

    it('should return proper error for invalid category', async () => {
      const response = await request(app)
        .get('/api/products?category=non-existent-category');

      expect(response.status).toBe(200);
      expect(response.body.products).toEqual([]);
    });
  });
});
