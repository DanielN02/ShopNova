import { Request, Response } from 'express';
import { pool } from '../shared/database';
import { AuthRequest } from '../shared/middleware';

// Controllers
export const getUserNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true';

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];

    if (unreadOnly) {
      whereClause += ' AND is_read = false';
    }

    const query = `
      SELECT id, type, title, message, is_read, metadata, created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM notifications 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, [userId]);
    const totalNotifications = parseInt(countResult.rows[0].count);

    // Get unread count
    const unreadResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    const unreadCount = parseInt(unreadResult.rows[0].count);

    res.json({
      notifications: result.rows,
      pagination: {
        page,
        limit,
        total: totalNotifications,
        pages: Math.ceil(totalNotifications / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = parseInt(req.params.id);

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0],
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING id',
      [userId]
    );

    res.json({
      message: 'All notifications marked as read',
      markedCount: result.rows.length,
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = parseInt(req.params.id);

    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin only - create notification for user
export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, type, title, message, metadata } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'userId, type, title, and message are required' });
    }

    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, metadata) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, title, message, JSON.stringify(metadata || {})]
    );

    res.status(201).json({
      message: 'Notification created successfully',
      notification: result.rows[0],
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
