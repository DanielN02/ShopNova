import { Router } from 'express';
import { register, login, getProfile, registerValidation, loginValidation } from './controllers';
import { authenticateToken } from '../shared/middleware';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

export default router;
