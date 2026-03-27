import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShopNova Product Service API',
      version: '1.0.0',
      description: 'Product catalog, categories, search, and reviews',
    },
    servers: [
      { url: 'http://localhost:3002', description: 'Local' },
      { url: 'https://product-service-03qg.onrender.com', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Product ID' },
            name: { type: 'string', description: 'Product name' },
            description: { type: 'string', description: 'Product description' },
            price: { type: 'number', description: 'Product price' },
            category_id: { type: 'integer', description: 'Category ID' },
            category_name: { type: 'string', description: 'Category name' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Product tags' },
            in_stock: { type: 'boolean', description: 'Whether product is in stock' },
            image_url: { type: 'string', description: 'Product image URL' },
            rating: { type: 'number', description: 'Average rating' },
            review_count: { type: 'integer', description: 'Number of reviews' },
            created_at: { type: 'string', format: 'date-time', description: 'Creation date' },
            updated_at: { type: 'string', format: 'date-time', description: 'Last update date' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Category ID' },
            name: { type: 'string', description: 'Category name' },
            icon: { type: 'string', description: 'Category icon' },
            color: { type: 'string', description: 'Category color' },
            product_count: { type: 'integer', description: 'Number of products in category' },
            created_at: { type: 'string', format: 'date-time', description: 'Creation date' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Review ID' },
            product_id: { type: 'integer', description: 'Product ID' },
            user_id: { type: 'string', description: 'User ID' },
            user_name: { type: 'string', description: 'User name' },
            user_avatar: { type: 'string', description: 'User avatar URL' },
            rating: { type: 'integer', description: 'Rating (1-5)' },
            comment: { type: 'string', description: 'Review comment' },
            created_at: { type: 'string', format: 'date-time', description: 'Creation date' },
          },
        },
        PaginatedProducts: {
          type: 'object',
          properties: {
            products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', description: 'Current page' },
                limit: { type: 'integer', description: 'Items per page' },
                total: { type: 'integer', description: 'Total items' },
                pages: { type: 'integer', description: 'Total pages' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
          },
        },
      },
    },
    paths: {
      '/api/products': {
        get: {
          tags: ['Products'],
          summary: 'List products with pagination',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'integer' }, description: 'Category ID' },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Items per page' },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['created_at', 'name', 'price', 'rating'], default: 'created_at' }, description: 'Sort field' },
            { name: 'order', in: 'query', schema: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' }, description: 'Sort order' },
          ],
          responses: {
            '200': { 
              description: 'Paginated products', 
              content: { 
                'application/json': { 
                  schema: { $ref: '#/components/schemas/PaginatedProducts' } 
                } 
              } 
            },
          },
        },
        post: {
          tags: ['Products'],
          summary: 'Create product (admin)',
          security: [{ bearerAuth: [] }],
          requestBody: { 
            required: true, 
            content: { 
              'multipart/form-data': { 
                schema: { 
                  type: 'object', 
                  properties: { 
                    name: { type: 'string' }, 
                    description: { type: 'string' }, 
                    price: { type: 'number' }, 
                    category_id: { type: 'integer' }, 
                    tags: { type: 'array', items: { type: 'string' } }, 
                    in_stock: { type: 'boolean' } 
                  } 
                } 
              } 
            } 
          },
          responses: { 
            '201': { description: 'Product created' }, 
            '401': { description: 'Authentication required' },
            '400': { description: 'Validation error' }
          },
        },
      },
      '/api/products/search': {
        get: {
          tags: ['Products'],
          summary: 'Search products',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search query' },
            { name: 'category', in: 'query', schema: { type: 'integer' }, description: 'Category ID' },
            { name: 'minPrice', in: 'query', schema: { type: 'number' }, description: 'Minimum price' },
            { name: 'maxPrice', in: 'query', schema: { type: 'number' }, description: 'Maximum price' },
            { name: 'minRating', in: 'query', schema: { type: 'number' }, description: 'Minimum rating' },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Items per page' },
          ],
          responses: {
            '200': { 
              description: 'Search results', 
              content: { 
                'application/json': { 
                  schema: { 
                    type: 'object', 
                    properties: { 
                      products: { type: 'array', items: { $ref: '#/components/schemas/Product' } }, 
                      query: { type: 'string' },
                      pagination: { 
                        type: 'object', 
                        properties: { 
                          page: { type: 'integer' }, 
                          limit: { type: 'integer' }, 
                          total: { type: 'integer' } 
                        } 
                      } 
                    } 
                  } 
                } 
              } 
            },
            '400': { description: 'Search query required' },
          },
        },
      },
      '/api/products/{id}': {
        get: {
          tags: ['Products'],
          summary: 'Get single product with reviews',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Product ID' }],
          responses: { 
            '200': { 
              description: 'Product details', 
              content: { 
                'application/json': { 
                  schema: { 
                    type: 'object', 
                    properties: { 
                      product: { $ref: '#/components/schemas/Product' } 
                    } 
                  } 
                } 
              } 
            }, 
            '404': { description: 'Product not found' } 
          },
        },
        put: {
          tags: ['Products'],
          summary: 'Update product (admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Product ID' }],
          requestBody: { 
            content: { 
              'multipart/form-data': { 
                schema: { 
                  type: 'object', 
                  properties: { 
                    name: { type: 'string' }, 
                    description: { type: 'string' }, 
                    price: { type: 'number' }, 
                    category_id: { type: 'integer' }, 
                    tags: { type: 'array', items: { type: 'string' } }, 
                    in_stock: { type: 'boolean' } 
                  } 
                } 
              } 
            } 
          },
          responses: { 
            '200': { description: 'Product updated' }, 
            '401': { description: 'Authentication required' },
            '404': { description: 'Product not found' }
          },
        },
        delete: {
          tags: ['Products'],
          summary: 'Delete product (admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Product ID' }],
          responses: { 
            '200': { description: 'Product deleted' }, 
            '401': { description: 'Authentication required' },
            '404': { description: 'Product not found' }
          },
        },
      },
      '/api/categories': {
        get: { 
          tags: ['Categories'], 
          summary: 'List all categories', 
          responses: { 
            '200': { 
              description: 'Categories list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      categories: { type: 'array', items: { $ref: '#/components/schemas/Category' } }
                    }
                  }
                }
              }
            } 
          },
        },
        post: {
          tags: ['Categories'],
          summary: 'Create category (admin)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    icon: { type: 'string' },
                    color: { type: 'string' }
                  },
                  required: ['name']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Category created' },
            '401': { description: 'Authentication required' },
            '400': { description: 'Validation error' }
          }
        }
      },
      '/api/products/{id}/reviews': {
        post: {
          tags: ['Reviews'],
          summary: 'Add a review',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Product ID' }],
          requestBody: { 
            required: true, 
            content: { 
              'application/json': { 
                schema: { 
                  type: 'object', 
                  properties: { 
                    rating: { type: 'integer', minimum: 1, maximum: 5 }, 
                    comment: { type: 'string' } 
                  }, 
                  required: ['rating'] 
                } 
              } 
            } 
          },
          responses: { 
            '201': { description: 'Review added' }, 
            '401': { description: 'Authentication required' },
            '400': { description: 'Validation error' },
            '404': { description: 'Product not found' }
          },
        },
      },
      '/api/health': { 
        get: { 
          tags: ['System'], 
          summary: 'Health check', 
          responses: { 
            '200': { 
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      service: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' },
                      version: { type: 'string' }
                    }
                  }
                }
              }
            } 
          } 
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
