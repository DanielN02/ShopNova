import { Router } from 'express';
import { 
  createOrder, 
  getUserOrders, 
  getOrderById, 
  updateOrderStatus,
  createOrderValidation 
} from './controllers';
import { authenticateToken, requireRole } from '../shared/middleware';

const router = Router();

// All order routes require authentication
router.use(authenticateToken);

// Customer routes
router.post('/', createOrderValidation, createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrderById);

// Admin only routes
router.patch('/:id/status', requireRole(['admin']), updateOrderStatus);

export default router;
