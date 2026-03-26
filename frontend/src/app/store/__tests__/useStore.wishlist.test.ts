import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../useStore';

describe('useStore - Wishlist', () => {
  beforeEach(() => {
    useStore.setState({ wishlist: [], cartItems: [], currentUser: null, isAuthenticated: false });
  });

  it('should start with an empty wishlist', () => {
    expect(useStore.getState().wishlist).toEqual([]);
  });

  it('should add a product to the wishlist via toggleWishlist', () => {
    useStore.getState().toggleWishlist('p1');
    expect(useStore.getState().wishlist).toContain('p1');
    expect(useStore.getState().wishlist).toHaveLength(1);
  });

  it('should remove a product from the wishlist via toggleWishlist', () => {
    useStore.getState().toggleWishlist('p1');
    expect(useStore.getState().wishlist).toContain('p1');
    useStore.getState().toggleWishlist('p1');
    expect(useStore.getState().wishlist).not.toContain('p1');
    expect(useStore.getState().wishlist).toHaveLength(0);
  });

  it('should handle multiple products in the wishlist', () => {
    useStore.getState().toggleWishlist('p1');
    useStore.getState().toggleWishlist('p2');
    useStore.getState().toggleWishlist('p3');
    expect(useStore.getState().wishlist).toHaveLength(3);
    expect(useStore.getState().wishlist).toEqual(['p1', 'p2', 'p3']);
  });

  it('should only remove the toggled product', () => {
    useStore.getState().toggleWishlist('p1');
    useStore.getState().toggleWishlist('p2');
    useStore.getState().toggleWishlist('p1');
    expect(useStore.getState().wishlist).toEqual(['p2']);
  });
});
