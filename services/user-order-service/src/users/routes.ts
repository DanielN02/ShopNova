import { Router } from 'express';
import { register, login, getProfile, getAllUsers, registerValidation, loginValidation } from './controllers';
import { authenticateToken, requireRole } from '../shared/middleware';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.get('/', authenticateToken, requireRole(['admin']), getAllUsers);

export default router;
