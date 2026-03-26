import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShopNova Product Service API',
      version: '1.0.0',
      description: 'Product catalog, categories, search (Elasticsearch), and reviews',
    },
    servers: [{ url: 'http://localhost:3002', description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            originalPrice: { type: 'number' },
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            image: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            rating: { type: 'number' },
            reviewCount: { type: 'integer' },
            stock: { type: 'integer' },
            featured: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            icon: { type: 'string' },
            productCount: { type: 'integer' },
            color: { type: 'string' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            productId: { type: 'string' },
            userId: { type: 'string' },
            userName: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      '/api/products': {
        get: {
          tags: ['Products'],
          summary: 'List and filter products',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'minPrice', in: 'query', schema: { type: 'number' } },
            { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
            { name: 'minRating', in: 'query', schema: { type: 'number' } },
            { name: 'tags', in: 'query', schema: { type: 'string' }, description: 'Comma-separated' },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['price-asc', 'price-desc', 'rating', 'newest'] } },
            { name: 'featured', in: 'query', schema: { type: 'boolean' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            '200': { description: 'Paginated products', content: { 'application/json': { schema: { type: 'object', properties: { products: { type: 'array', items: { $ref: '#/components/schemas/Product' } }, total: { type: 'integer' }, page: { type: 'integer' }, totalPages: { type: 'integer' } } } } } },
          },
        },
        post: {
          tags: ['Products'],
          summary: 'Create product (admin)',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          responses: { '201': { description: 'Product created' }, '403': { description: 'Admin only' } },
        },
      },
      '/api/products/search': {
        get: {
          tags: ['Products'],
          summary: 'Search products (Elasticsearch with MongoDB fallback)',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search query' },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'minPrice', in: 'query', schema: { type: 'number' } },
            { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
            { name: 'minRating', in: 'query', schema: { type: 'number' } },
          ],
          responses: {
            '200': { description: 'Search results with source indicator', content: { 'application/json': { schema: { type: 'object', properties: { products: { type: 'array', items: { $ref: '#/components/schemas/Product' } }, source: { type: 'string', enum: ['elasticsearch', 'mongodb'] } } } } } },
          },
        },
      },
      '/api/products/{id}': {
        get: {
          tags: ['Products'],
          summary: 'Get single product',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Product details' }, '404': { description: 'Not found' } },
        },
        put: {
          tags: ['Products'],
          summary: 'Update product (admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          responses: { '200': { description: 'Updated' }, '403': { description: 'Admin only' } },
        },
        delete: {
          tags: ['Products'],
          summary: 'Delete product (admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Deleted' }, '403': { description: 'Admin only' } },
        },
      },
      '/api/categories': {
        get: { tags: ['Categories'], summary: 'List all categories', responses: { '200': { description: 'Categories' } } },
      },
      '/api/products/{id}/reviews': {
        get: {
          tags: ['Reviews'],
          summary: 'Get product reviews',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Reviews list' } },
        },
        post: {
          tags: ['Reviews'],
          summary: 'Add a review',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string' } } } } } },
          responses: { '201': { description: 'Review added' }, '401': { description: 'Auth required' } },
        },
      },
      '/api/health': { get: { tags: ['System'], summary: 'Health check', responses: { '200': { description: 'OK' } } } },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
