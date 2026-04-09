import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../shared/database';
import { AuthRequest } from '../shared/middleware';
import { publishEvent } from '../index';

// Validation rules
export const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.productId').notEmpty().withMessage('Product ID required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').custom((value: any) => {
    const price = parseFloat(value);
    if (isNaN(price) || price < 0) {
      throw new Error('Valid price required');
    }
    return true;
  }).withMessage('Valid price required'),
  body('shippingAddress').notEmpty().withMessage('Shipping address required'),
  body('paymentMethod').notEmpty().withMessage('Payment method required'),
];

// Controllers
export const createOrder = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user!.userId;

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      const price = parseFloat(item.price);
      return sum + (price * item.quantity);
    }, 0);

    // Start transaction
    await client.query('BEGIN');

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, shipping_address, payment_method) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, totalAmount, JSON.stringify(shippingAddress), paymentMethod]
    );

    const orderId = orderResult.rows[0].id;

    // Add order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price) 
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.productId, item.productName || item.productId, item.quantity, parseFloat(item.price)]
      );
    }

    // Create notification for user
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, metadata) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'order',
        'Order Placed Successfully',
        `Your order #${orderId} has been placed and is being processed.`,
        JSON.stringify({ orderId, totalAmount })
      ]
    );

    await client.query('COMMIT');

    // Get user email for notifications
    const userResult = await pool.query('SELECT email, first_name, last_name FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    // Publish order creation event to Redis Streams
    await publishEvent('order.created', {
      orderId,
      userId,
      userEmail: user.email,
      userName: `${user.first_name} ${user.last_name}`,
      totalAmount,
      status: 'pending',
      shippingAddress,
      paymentMethod,
      items: items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName || item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      createdAt: new Date().toISOString()
    });

    // Fetch complete order details
    const orderDetails = await pool.query(
      `SELECT o.*, oi.product_id, oi.product_name, oi.quantity, oi.price 
       FROM orders o 
       LEFT JOIN order_items oi ON o.id = oi.order_id 
       WHERE o.id = $1`,
      [orderId]
    );

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: orderId,
        userId,
        totalAmount,
        status: 'pending',
        shippingAddress,
        paymentMethod,
        items: orderDetails.rows.map(row => ({
          productId: row.product_id,
          productName: row.product_name,
          quantity: row.quantity,
          price: row.price
        })),
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const ordersQuery = `
      SELECT o.*, 
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'productId', oi.product_id,
                 'productName', oi.product_name,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(ordersQuery, [userId, limit, offset]);

    // Get total count for pagination
    const countResult = await pool.query('SELECT COUNT(*) FROM orders WHERE user_id = $1', [userId]);
    const totalOrders = parseInt(countResult.rows[0].count);

    res.json({
      orders: result.rows,
      pagination: {
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit),
      },
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const orderId = parseInt(req.params.id);

    const result = await pool.query(
      `SELECT o.*, 
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'productId', oi.product_id,
                 'productName', oi.product_name,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1 AND o.user_id = $2
      GROUP BY o.id`,
      [orderId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create notification for status update
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, metadata) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        result.rows[0].user_id,
        'order',
        'Order Status Updated',
        `Your order #${orderId} status has been updated to ${status}.`,
        JSON.stringify({ orderId, status })
      ]
    );

    // Get user email for notifications
    const userResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [result.rows[0].user_id]);
    const user = userResult.rows[0];

    // Publish order status update event to Redis Streams
    await publishEvent('order.updated', {
      orderId,
      userId: result.rows[0].user_id,
      userEmail: user.email,
      userName: user.name,
      oldStatus: result.rows[0].status,
      newStatus: status,
      trackingNumber: status === 'shipped' ? `SN-TRK-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : undefined,
      updatedAt: new Date().toISOString()
    });

    res.json({
      message: 'Order status updated successfully',
      order: result.rows[0],
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin controllers
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT o.*, 
             u.email as user_email, 
             u.first_name || ' ' || u.last_name as user_name,
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'productId', oi.product_id,
                 'productName', oi.product_name,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id, u.email, u.first_name, u.last_name
      ORDER BY o.created_at DESC
    `);

    res.json({
      orders: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrdersAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    // Get order counts by status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
    `);

    // Get total revenue
    const revenueResult = await pool.query(`
      SELECT SUM(total_amount) as total_revenue,
             COUNT(*) as total_orders
      FROM orders 
      WHERE status != 'cancelled'
    `);

    // Get recent orders count (last 7 days)
    const recentResult = await pool.query(`
      SELECT COUNT(*) as recent_orders
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    const analytics = {
      ordersByStatus: statusResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      totalRevenue: parseFloat(revenueResult.rows[0]?.total_revenue || '0'),
      totalOrders: parseInt(revenueResult.rows[0]?.total_orders || '0'),
      recentOrders: parseInt(recentResult.rows[0]?.recent_orders || '0')
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get orders analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user!.userId;

    // Check if order exists and belongs to user
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check if order can be cancelled (only pending or confirmed orders)
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
    }

    // Update order status to cancelled
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['cancelled', orderId]
    );

    // Create notification for cancellation
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, metadata) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'order',
        'Order Cancelled',
        `Your order #${orderId} has been cancelled.`,
        JSON.stringify({ orderId, status: 'cancelled' })
      ]
    );

    res.json({
      message: 'Order cancelled successfully',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
