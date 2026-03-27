import { Router } from 'express';
import { 
  createOrder, 
  getUserOrders, 
  getOrderById, 
  updateOrderStatus,
  getAllOrders,
  getOrdersAnalytics,
  createOrderValidation 
} from './controllers';
import { authenticateToken, requireRole } from '../shared/middleware';

const router = Router();

// All order routes require authentication
router.use(authenticateToken);

// Admin only routes (must be before /:id to avoid being caught by it)
router.get('/admin/all', requireRole(['admin']), getAllOrders);
router.get('/analytics/summary', requireRole(['admin']), getOrdersAnalytics);

// Customer routes
router.post('/', createOrderValidation, createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrderById);

// Admin only
router.patch('/:id/status', requireRole(['admin']), updateOrderStatus);

export default router;
