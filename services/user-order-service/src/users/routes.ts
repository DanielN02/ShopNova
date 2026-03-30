import { Router } from 'express';
import { register, login, getProfile, updateProfile, getAllUsers, forgotPassword, resetPassword, registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation } from './controllers';
import { authenticateToken, requireRole } from '../shared/middleware';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.patch('/profile', authenticateToken, updateProfile);
router.get('/', authenticateToken, requireRole(['admin']), getAllUsers);

export default router;
