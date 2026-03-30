import { Router } from 'express';
import { getCart, saveCart, clearCart } from './controllers';
import { authenticateToken } from '../shared/middleware';

const router = Router();

// All cart routes require authentication
router.use(authenticateToken);

// Cart routes
router.get('/', getCart);
router.post('/', saveCart);
router.delete('/', clearCart);

export default router;
