import { useStore } from '../../app/store/useStore';
import { MOCK_PRODUCTS } from '../../app/data/mockData';

describe('useStore — Zustand Store', () => {
  beforeEach(() => {
    const { setState } = useStore;
    setState({
      currentUser: null,
      isAuthenticated: false,
      cartItems: [],
      wishlist: [],
      notifications: [],
      searchQuery: '',
    });
  });

  describe('Auth', () => {
    it('should login with valid mock credentials', () => {
      const { login } = useStore.getState();
      const result = login('admin@shopnova.com', 'admin123');
      expect(result.success).toBe(true);
      const state = useStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser?.email).toBe('admin@shopnova.com');
      expect(state.currentUser?.role).toBe('admin');
    });

    it('should fail login with unknown email', () => {
      const { login } = useStore.getState();
      const result = login('unknown@test.com', 'password');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(useStore.getState().isAuthenticated).toBe(false);
    });

    it('should login as customer', () => {
      const { login } = useStore.getState();
      const result = login('jane@example.com', 'customer123');
      expect(result.success).toBe(true);
      expect(useStore.getState().currentUser?.role).toBe('customer');
    });

    it('should load notifications on login', () => {
      const { login } = useStore.getState();
      login('jane@example.com', 'customer123');
      const { notifications } = useStore.getState();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.every(n => n.userId === 'u2')).toBe(true);
    });

    it('should logout and clear state', () => {
      const { login } = useStore.getState();
      login('jane@example.com', 'customer123');
      expect(useStore.getState().isAuthenticated).toBe(true);

      useStore.getState().logout();
      const state = useStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBeNull();
      expect(state.cartItems).toEqual([]);
      expect(state.notifications).toEqual([]);
    });

    it('should register a new user', () => {
      const { register } = useStore.getState();
      const result = register('New User', 'new@example.com', 'password123');
      expect(result.success).toBe(true);
      const state = useStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser?.name).toBe('New User');
      expect(state.currentUser?.email).toBe('new@example.com');
      expect(state.currentUser?.role).toBe('customer');
    });

    it('should reject duplicate email on register', () => {
      const { register } = useStore.getState();
      const result = register('Admin', 'admin@shopnova.com', 'password');
      expect(result.success).toBe(false);
      expect(result.error).toContain('already');
    });
  });

  describe('Cart', () => {
    const product = MOCK_PRODUCTS[0];

    it('should add product to cart', () => {
      useStore.getState().addToCart(product);
      const { cartItems } = useStore.getState();
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].product.id).toBe(product.id);
      expect(cartItems[0].quantity).toBe(1);
    });

    it('should increase quantity when adding same product', () => {
      useStore.getState().addToCart(product);
      useStore.getState().addToCart(product);
      const { cartItems } = useStore.getState();
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].quantity).toBe(2);
    });

    it('should add with custom quantity', () => {
      useStore.getState().addToCart(product, 3);
      expect(useStore.getState().cartItems[0].quantity).toBe(3);
    });

    it('should not exceed stock when adding', () => {
      useStore.getState().addToCart(product, product.stock);
      useStore.getState().addToCart(product, 5);
      expect(useStore.getState().cartItems[0].quantity).toBe(product.stock);
    });

    it('should remove product from cart', () => {
      useStore.getState().addToCart(product);
      useStore.getState().removeFromCart(product.id);
      expect(useStore.getState().cartItems).toHaveLength(0);
    });

    it('should update quantity', () => {
      useStore.getState().addToCart(product);
      useStore.getState().updateQuantity(product.id, 5);
      expect(useStore.getState().cartItems[0].quantity).toBe(5);
    });

    it('should remove item when quantity set to 0', () => {
      useStore.getState().addToCart(product);
      useStore.getState().updateQuantity(product.id, 0);
      expect(useStore.getState().cartItems).toHaveLength(0);
    });

    it('should clear cart', () => {
      useStore.getState().addToCart(MOCK_PRODUCTS[0]);
      useStore.getState().addToCart(MOCK_PRODUCTS[1]);
      useStore.getState().clearCart();
      expect(useStore.getState().cartItems).toHaveLength(0);
    });

    it('should calculate cart count', () => {
      useStore.getState().addToCart(MOCK_PRODUCTS[0], 2);
      useStore.getState().addToCart(MOCK_PRODUCTS[1], 3);
      expect(useStore.getState().cartCount()).toBe(5);
    });

    it('should calculate cart total', () => {
      useStore.getState().addToCart(MOCK_PRODUCTS[0], 1);
      useStore.getState().addToCart(MOCK_PRODUCTS[1], 2);
      const expectedTotal = MOCK_PRODUCTS[0].price + MOCK_PRODUCTS[1].price * 2;
      expect(useStore.getState().cartTotal()).toBeCloseTo(expectedTotal);
    });
  });

  describe('Wishlist', () => {
    it('should toggle wishlist add', () => {
      useStore.getState().toggleWishlist('p1');
      expect(useStore.getState().wishlist).toContain('p1');
    });

    it('should toggle wishlist remove', () => {
      useStore.getState().toggleWishlist('p1');
      useStore.getState().toggleWishlist('p1');
      expect(useStore.getState().wishlist).not.toContain('p1');
    });

    it('should handle multiple wishlist items', () => {
      useStore.getState().toggleWishlist('p1');
      useStore.getState().toggleWishlist('p2');
      useStore.getState().toggleWishlist('p3');
      expect(useStore.getState().wishlist).toEqual(['p1', 'p2', 'p3']);
    });
  });

  describe('Notifications', () => {
    beforeEach(() => {
      useStore.getState().login('jane@example.com', 'customer123');
    });

    it('should mark single notification as read', () => {
      const { notifications } = useStore.getState();
      const unread = notifications.find(n => !n.read);
      if (unread) {
        useStore.getState().markNotificationRead(unread.id);
        const updated = useStore.getState().notifications.find(n => n.id === unread.id);
        expect(updated?.read).toBe(true);
      }
    });

    it('should mark all notifications as read', () => {
      useStore.getState().markAllRead();
      const { notifications } = useStore.getState();
      expect(notifications.every(n => n.read)).toBe(true);
    });

    it('should count unread notifications', () => {
      const { notifications, unreadCount } = useStore.getState();
      const expected = notifications.filter(n => !n.read).length;
      expect(unreadCount()).toBe(expected);
    });
  });

  describe('Search', () => {
    it('should set search query', () => {
      useStore.getState().setSearchQuery('laptop');
      expect(useStore.getState().searchQuery).toBe('laptop');
    });

    it('should clear search query', () => {
      useStore.getState().setSearchQuery('laptop');
      useStore.getState().setSearchQuery('');
      expect(useStore.getState().searchQuery).toBe('');
    });
  });
});
