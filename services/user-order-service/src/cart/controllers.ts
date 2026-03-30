import { Response } from 'express';
import { AuthRequest } from '../shared/middleware';
import { redis } from '../index';

// Get user's cart from Redis
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const cartKey = `cart:${userId}`;
    
    const cart = await redis.get(cartKey);
    
    if (!cart) {
      return res.json({ items: [] });
    }
    
    res.json({ items: JSON.parse(cart) });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Save user's cart to Redis
export const saveCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }
    
    const cartKey = `cart:${userId}`;
    
    // Store cart in Redis with 7 day expiration
    await redis.setex(cartKey, 7 * 24 * 60 * 60, JSON.stringify(items));
    
    res.json({ message: 'Cart saved successfully', items });
  } catch (error) {
    console.error('Save cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Clear user's cart from Redis
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const cartKey = `cart:${userId}`;
    
    await redis.del(cartKey);
    
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
