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
  body('items.*.price').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('shippingAddress').notEmpty().withMessage('Shipping address required'),
  body('paymentMethod').notEmpty().withMessage('Payment method required'),
];

// Controllers
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user!.userId;

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    // Start transaction
    const client = await pool.connect();
    try {
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
          [orderId, item.productId, item.productName || item.productId, item.quantity, item.price]
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

      // Publish order creation event to Redis Streams
      await publishEvent('order_events', 'order.created', {
        orderId,
        userId,
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
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    // Publish order status update event to Redis Streams
    await publishEvent('order_events', 'order.updated', {
      orderId,
      userId: result.rows[0].user_id,
      oldStatus: result.rows[0].status,
      newStatus: status,
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
