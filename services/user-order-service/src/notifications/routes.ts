import { Router } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
} from './controllers';
import { authenticateToken, requireRole } from '../shared/middleware';

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

// Customer routes
router.get('/', getUserNotifications);
router.patch('/:id/read', markNotificationAsRead);
router.patch('/read-all', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);

// Admin only routes
router.post('/', requireRole(['admin']), createNotification);

export default router;
