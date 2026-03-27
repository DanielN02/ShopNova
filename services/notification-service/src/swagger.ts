import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShopNova Notification Service API',
      version: '1.0.0',
      description: 'Email notifications, push notifications (WebSocket), and RabbitMQ event consumer',
    },
    servers: [
      { url: 'http://localhost:3004', description: 'Local' },
      { url: 'https://notification-service.onrender.com', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Notification: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            type: { type: 'string', enum: ['order', 'promo', 'system'] },
            title: { type: 'string' },
            message: { type: 'string' },
            read: { type: 'boolean' },
            metadata: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      '/api/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'Get user notifications',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Notifications list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } },
            '401': { description: 'Auth required' },
          },
        },
        post: {
          tags: ['Admin'],
          summary: 'Create notification (admin)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId', 'title', 'message'],
                  properties: {
                    userId: { type: 'string' },
                    type: { type: 'string', enum: ['order', 'promo', 'system'] },
                    title: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Created' }, '403': { description: 'Admin only' } },
        },
      },
      '/api/notifications/{id}/read': {
        put: {
          tags: ['Notifications'],
          summary: 'Mark notification as read',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Marked as read' } },
        },
      },
      '/api/notifications/read-all': {
        put: {
          tags: ['Notifications'],
          summary: 'Mark all notifications as read',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'All marked as read' } },
        },
      },
      '/api/health': { get: { tags: ['System'], summary: 'Health check', responses: { '200': { description: 'OK' } } } },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
