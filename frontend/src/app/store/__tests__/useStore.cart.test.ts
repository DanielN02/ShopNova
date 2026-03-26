import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../useStore';
import type { Product } from '../../types';

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Test Product',
  description: 'A test product',
  price: 29.99,
  category: 'Electronics',
  tags: ['test'],
  image: 'https://example.com/img.jpg',
  images: ['https://example.com/img.jpg'],
  rating: 4.5,
  reviewCount: 10,
  stock: 50,
  featured: false,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('useStore - Cart', () => {
  beforeEach(() => {
    useStore.setState({ cartItems: [], wishlist: [], currentUser: null, isAuthenticated: false });
  });

  it('should start with an empty cart', () => {
    const { cartItems } = useStore.getState();
    expect(cartItems).toEqual([]);
  });

  it('should add a product to the cart', () => {
    const product = makeProduct();
    useStore.getState().addToCart(product);
    const { cartItems } = useStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].product.id).toBe('p1');
    expect(cartItems[0].quantity).toBe(1);
  });

  it('should add a product with a specific quantity', () => {
    const product = makeProduct();
    useStore.getState().addToCart(product, 3);
    const { cartItems } = useStore.getState();
    expect(cartItems[0].quantity).toBe(3);
  });

  it('should increase quantity when adding an existing product', () => {
    const product = makeProduct();
    useStore.getState().addToCart(product, 2);
    useStore.getState().addToCart(product, 3);
    const { cartItems } = useStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toBe(5);
  });

  it('should not exceed stock when adding an existing product', () => {
    const product = makeProduct({ stock: 5 });
    useStore.getState().addToCart(product, 3);
    useStore.getState().addToCart(product, 10);
    const { cartItems } = useStore.getState();
    expect(cartItems[0].quantity).toBe(5);
  });

  it('should remove a product from the cart', () => {
    const product = makeProduct();
    useStore.getState().addToCart(product);
    useStore.getState().removeFromCart('p1');
    const { cartItems } = useStore.getState();
    expect(cartItems).toHaveLength(0);
  });

  it('should update quantity of a cart item', () => {
    const product = makeProduct();
    useStore.getState().addToCart(product);
    useStore.getState().updateQuantity('p1', 5);
    const { cartItems } = useStore.getState();
    expect(cartItems[0].quantity).toBe(5);
  });

  it('should remove item when quantity is updated to 0', () => {
    const product = makeProduct();
    useStore.getState().addToCart(product);
    useStore.getState().updateQuantity('p1', 0);
    const { cartItems } = useStore.getState();
    expect(cartItems).toHaveLength(0);
  });

  it('should remove item when quantity is updated to negative', () => {
    const product = makeProduct();
    useStore.getState().addToCart(product);
    useStore.getState().updateQuantity('p1', -1);
    const { cartItems } = useStore.getState();
    expect(cartItems).toHaveLength(0);
  });

  it('should clear the cart', () => {
    useStore.getState().addToCart(makeProduct({ id: 'p1' }));
    useStore.getState().addToCart(makeProduct({ id: 'p2' }));
    useStore.getState().clearCart();
    const { cartItems } = useStore.getState();
    expect(cartItems).toHaveLength(0);
  });

  it('should calculate cart count correctly', () => {
    useStore.getState().addToCart(makeProduct({ id: 'p1' }), 2);
    useStore.getState().addToCart(makeProduct({ id: 'p2' }), 3);
    expect(useStore.getState().cartCount()).toBe(5);
  });

  it('should calculate cart total correctly', () => {
    useStore.getState().addToCart(makeProduct({ id: 'p1', price: 10 }), 2);
    useStore.getState().addToCart(makeProduct({ id: 'p2', price: 25 }), 1);
    expect(useStore.getState().cartTotal()).toBe(45);
  });

  it('should return 0 for cart total when cart is empty', () => {
    expect(useStore.getState().cartTotal()).toBe(0);
  });

  it('should return 0 for cart count when cart is empty', () => {
    expect(useStore.getState().cartCount()).toBe(0);
  });
});
