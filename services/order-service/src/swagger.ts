import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShopNova Order Service API',
      version: '1.0.0',
      description: 'Order processing, mock payments, real-time WebSocket updates, and analytics',
    },
    servers: [{ url: 'http://localhost:3003', description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            order_number: { type: 'string' },
            user_id: { type: 'integer' },
            total_amount: { type: 'number' },
            subtotal: { type: 'number' },
            tax: { type: 'number' },
            shipping: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
            payment_status: { type: 'string', enum: ['pending', 'paid', 'refunded'] },
            payment_method: { type: 'string' },
            shipping_address: { type: 'object' },
            tracking_number: { type: 'string' },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            product_id: { type: 'string' },
            product_name: { type: 'string' },
            product_image: { type: 'string' },
            quantity: { type: 'integer' },
            price: { type: 'number' },
          },
        },
        Analytics: {
          type: 'object',
          properties: {
            totalRevenue: { type: 'number' },
            totalOrders: { type: 'integer' },
            totalCustomers: { type: 'integer' },
            ordersByStatus: { type: 'array', items: { type: 'object', properties: { status: { type: 'string' }, count: { type: 'integer' } } } },
            topProducts: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, sold: { type: 'integer' }, revenue: { type: 'number' } } } },
            ordersPerUser: { type: 'array', items: { type: 'object', properties: { userId: { type: 'integer' }, orders: { type: 'integer' }, spent: { type: 'number' } } } },
            revenueByMonth: { type: 'array', items: { type: 'object', properties: { month: { type: 'string' }, revenue: { type: 'number' } } } },
          },
        },
      },
    },
    paths: {
      '/api/orders': {
        post: {
          tags: ['Orders'],
          summary: 'Place a new order',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    items: { type: 'array', items: { type: 'object', properties: { productId: { type: 'string' }, productName: { type: 'string' }, productImage: { type: 'string' }, quantity: { type: 'integer' }, price: { type: 'number' } } } },
                    shippingAddress: { type: 'object' },
                    paymentMethod: { type: 'string', default: 'card' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Order placed' }, '400': { description: 'No items' }, '401': { description: 'Auth required' } },
        },
        get: {
          tags: ['Orders'],
          summary: 'Get current user orders',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'User orders list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } } },
        },
      },
      '/api/orders/{id}': {
        get: {
          tags: ['Orders'],
          summary: 'Get single order',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Order details' }, '404': { description: 'Not found' } },
        },
      },
      '/api/orders/{id}/cancel': {
        put: {
          tags: ['Orders'],
          summary: 'Cancel an order (pending/processing only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Order cancelled' }, '400': { description: 'Cannot cancel' } },
        },
      },
      '/api/orders/admin/all': {
        get: {
          tags: ['Admin'],
          summary: 'Get all orders (admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] } }],
          responses: { '200': { description: 'All orders' }, '403': { description: 'Admin only' } },
        },
      },
      '/api/orders/{id}/status': {
        put: {
          tags: ['Admin'],
          summary: 'Update order status (admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] } } } } } },
          responses: { '200': { description: 'Status updated' }, '400': { description: 'Invalid status' } },
        },
      },
      '/api/orders/analytics/summary': {
        get: {
          tags: ['Admin'],
          summary: 'Get analytics summary (admin)',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Analytics data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Analytics' } } } }, '403': { description: 'Admin only' } },
        },
      },
      '/api/health': { get: { tags: ['System'], summary: 'Health check', responses: { '200': { description: 'OK' } } } },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
