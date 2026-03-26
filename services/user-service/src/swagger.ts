import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShopNova User Service API',
      version: '1.0.0',
      description: 'User authentication, registration, and management service',
    },
    servers: [{ url: 'http://localhost:3001', description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'customer'] },
            avatar: { type: 'string' },
            phone: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'User registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            '400': { description: 'Validation error' },
            '409': { description: 'Email already in use' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/api/auth/profile': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            '401': { description: 'Unauthorized' },
          },
        },
        put: {
          tags: ['Auth'],
          summary: 'Update user profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    phone: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Updated profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          },
        },
      },
      '/api/users': {
        get: {
          tags: ['Admin'],
          summary: 'List all users (admin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Users list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
            '403': { description: 'Admin access required' },
          },
        },
      },
      '/api/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: { '200': { description: 'Service healthy' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
