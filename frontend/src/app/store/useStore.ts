import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, CartItem, Product, Notification, Order, Category } from '../types';
import { authService, productService, orderService, notificationService } from '../services/api';
import { MOCK_USERS, MOCK_NOTIFICATIONS, MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_ORDERS } from '../data/mockData';
import axios from 'axios';

function isConnectionError(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    return !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED';
  }
  return false;
}

interface StoreState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;

  // Cart
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: () => number;
  cartTotal: () => number;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;

  // Notifications
  notifications: Notification[];
  notificationsLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: () => number;

  // Products
  products: Product[];
  productsLoading: boolean;
  productsError: string | null;
  categories: Category[];
  productsTotalPages: number;
  fetchProducts: (params?: Record<string, string>) => Promise<void>;
  fetchProductById: (id: string) => Promise<Product | null>;
  searchProducts: (query: string) => Promise<Product[]>;
  fetchCategories: () => Promise<void>;

  // Orders
  orders: Order[];
  ordersLoading: boolean;
  ordersError: string | null;
  fetchOrders: () => Promise<void>;
  createOrder: (data: {
    items: Array<{ productId: string; quantity: number; price: number; productName: string }>;
    shippingAddress: Record<string, string>;
    paymentMethod: string;
  }) => Promise<{ success: boolean; order?: Record<string, unknown>; error?: string }>;
  cancelOrder: (id: string) => Promise<{ success: boolean; error?: string }>;

  // WebSocket
  wsConnected: { order: boolean; notification: boolean };
  setWsConnected: (service: 'order' | 'notification', connected: boolean) => void;
  addNotification: (notification: Notification) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Auth
      currentUser: null,
      isAuthenticated: false,
      authLoading: false,
      authError: null,

      login: async (email: string, password: string) => {
        set({ authLoading: true, authError: null });
        try {
          const response = await authService.login(email, password);
          const { token, user } = response.data;
          localStorage.setItem('shopnova-token', token);
          const mappedUser: User = {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone,
            createdAt: user.createdAt,
          };
          set({ currentUser: mappedUser, isAuthenticated: true, authLoading: false });
          // Fetch notifications in background after login
          get().fetchNotifications();
          return { success: true };
        } catch (err: unknown) {
          if (isConnectionError(err)) {
            // Fallback to mock data
            const user = MOCK_USERS.find(u => u.email === email);
            if (user) {
              set({ currentUser: user, isAuthenticated: true, authLoading: false });
              const userNotifications = MOCK_NOTIFICATIONS.filter(n => n.userId === user.id);
              set({ notifications: userNotifications });
              return { success: true };
            }
          }
          const errorMsg = axios.isAxiosError(err) && err.response?.data?.error
            ? err.response.data.error
            : 'Login failed';
          set({ authLoading: false, authError: errorMsg });
          return { success: false, error: errorMsg };
        }
      },

      logout: () => {
        localStorage.removeItem('shopnova-token');
        set({
          currentUser: null,
          isAuthenticated: false,
          cartItems: [],
          notifications: [],
          orders: [],
          authError: null,
        });
      },

      register: async (name: string, email: string, password: string) => {
        set({ authLoading: true, authError: null });
        try {
          const response = await authService.register(name, email, password);
          const { token, user } = response.data;
          localStorage.setItem('shopnova-token', token);
          const mappedUser: User = {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            createdAt: user.createdAt,
          };
          set({ currentUser: mappedUser, isAuthenticated: true, authLoading: false, notifications: [] });
          return { success: true };
        } catch (err: unknown) {
          if (isConnectionError(err)) {
            // Fallback to mock
            const exists = MOCK_USERS.find(u => u.email === email);
            if (exists) {
              set({ authLoading: false });
              return { success: false, error: 'Email already in use' };
            }
            const newUser: User = {
              id: `u${Date.now()}`,
              name,
              email,
              role: 'customer',
              avatar: `https://i.pravatar.cc/150?u=${email}`,
              createdAt: new Date().toISOString(),
            };
            set({ currentUser: newUser, isAuthenticated: true, authLoading: false, notifications: [] });
            return { success: true };
          }
          const errorMsg = axios.isAxiosError(err) && err.response?.data?.error
            ? err.response.data.error
            : 'Registration failed';
          set({ authLoading: false, authError: errorMsg });
          return { success: false, error: errorMsg };
        }
      },

      // Cart
      cartItems: [],

      addToCart: (product: Product, quantity = 1) => {
        set(state => {
          const existing = state.cartItems.find(i => i.product.id === product.id);
          if (existing) {
            return {
              cartItems: state.cartItems.map(i =>
                i.product.id === product.id
                  ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) }
                  : i
              ),
            };
          }
          return { cartItems: [...state.cartItems, { product, quantity }] };
        });
      },

      removeFromCart: (productId: string) => {
        set(state => ({ cartItems: state.cartItems.filter(i => i.product.id !== productId) }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        set(state => ({
          cartItems: quantity <= 0
            ? state.cartItems.filter(i => i.product.id !== productId)
            : state.cartItems.map(i =>
                i.product.id === productId ? { ...i, quantity } : i
              ),
        }));
      },

      clearCart: () => set({ cartItems: [] }),

      cartCount: () => get().cartItems.reduce((sum, i) => sum + i.quantity, 0),

      cartTotal: () =>
        get().cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

      // Wishlist
      wishlist: [],

      toggleWishlist: (productId: string) => {
        set(state => ({
          wishlist: state.wishlist.includes(productId)
            ? state.wishlist.filter(id => id !== productId)
            : [...state.wishlist, productId],
        }));
      },

      // Notifications
      notifications: [],
      notificationsLoading: false,

      fetchNotifications: async () => {
        set({ notificationsLoading: true });
        try {
          const response = await notificationService.getAll();
          const data = response.data as Array<Record<string, unknown>>;
          const mapped: Notification[] = data.map((n) => ({
            id: String(n._id || n.id),
            userId: String(n.userId),
            type: n.type as 'order' | 'promo' | 'system',
            title: n.title as string,
            message: n.message as string,
            read: n.read as boolean,
            createdAt: String(n.createdAt),
          }));
          set({ notifications: mapped, notificationsLoading: false });
        } catch (err: unknown) {
          if (isConnectionError(err)) {
            const user = get().currentUser;
            if (user) {
              const userNotifications = MOCK_NOTIFICATIONS.filter(n => n.userId === user.id);
              set({ notifications: userNotifications, notificationsLoading: false });
            } else {
              set({ notificationsLoading: false });
            }
          } else {
            set({ notificationsLoading: false });
          }
        }
      },

      markNotificationRead: (id: string) => {
        set(state => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        }));
        // Fire and forget API call
        notificationService.markRead(id).catch(() => {});
      },

      markAllRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
        }));
        notificationService.markAllRead().catch(() => {});
      },

      unreadCount: () => get().notifications.filter(n => !n.read).length,

      // Products
      products: [],
      productsLoading: false,
      productsError: null,
      categories: [],
      productsTotalPages: 1,

      fetchProducts: async (params?: Record<string, string>) => {
        set({ productsLoading: true, productsError: null });
        try {
          const response = await productService.getAll(params);
          const data = response.data;
          const rawProducts = data.products || data;
          const mapped: Product[] = (rawProducts as Array<Record<string, unknown>>).map((p) => ({
            id: String(p._id || p.id),
            name: p.name as string,
            description: p.description as string,
            price: p.price as number,
            originalPrice: p.originalPrice as number | undefined,
            category: p.category as string,
            tags: (p.tags || []) as string[],
            image: p.image as string,
            images: (p.images || []) as string[],
            rating: p.rating as number,
            reviewCount: p.reviewCount as number,
            stock: p.stock as number,
            featured: p.featured as boolean,
            createdAt: String(p.createdAt),
          }));
          set({
            products: mapped,
            productsLoading: false,
            productsTotalPages: data.totalPages || 1,
          });
        } catch (err: unknown) {
          if (isConnectionError(err)) {
            set({ products: MOCK_PRODUCTS, productsLoading: false });
          } else {
            const errorMsg = axios.isAxiosError(err) && err.response?.data?.error
              ? err.response.data.error
              : 'Failed to load products';
            set({ productsError: errorMsg, productsLoading: false });
          }
        }
      },

      fetchProductById: async (id: string) => {
        try {
          const response = await productService.getById(id);
          const p = response.data as Record<string, unknown>;
          return {
            id: String(p._id || p.id),
            name: p.name as string,
            description: p.description as string,
            price: p.price as number,
            originalPrice: p.originalPrice as number | undefined,
            category: p.category as string,
            tags: (p.tags || []) as string[],
            image: p.image as string,
            images: (p.images || []) as string[],
            rating: p.rating as number,
            reviewCount: p.reviewCount as number,
            stock: p.stock as number,
            featured: p.featured as boolean,
            createdAt: String(p.createdAt),
          };
        } catch (err: unknown) {
          if (isConnectionError(err)) {
            return MOCK_PRODUCTS.find(p => p.id === id) || null;
          }
          return null;
        }
      },

      searchProducts: async (query: string) => {
        try {
          const response = await productService.search(query);
          const data = response.data;
          const rawProducts = data.products || data;
          return (rawProducts as Array<Record<string, unknown>>).map((p) => ({
            id: String(p._id || p.id),
            name: p.name as string,
            description: p.description as string,
            price: p.price as number,
            originalPrice: p.originalPrice as number | undefined,
            category: p.category as string,
            tags: (p.tags || []) as string[],
            image: p.image as string,
            images: (p.images || []) as string[],
            rating: p.rating as number,
            reviewCount: p.reviewCount as number,
            stock: p.stock as number,
            featured: p.featured as boolean,
            createdAt: String(p.createdAt),
          }));
        } catch (err: unknown) {
          if (isConnectionError(err)) {
            const q = query.toLowerCase();
            return MOCK_PRODUCTS.filter(p =>
              p.name.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              p.tags.some(t => t.toLowerCase().includes(q))
            );
          }
          return [];
        }
      },

      fetchCategories: async () => {
        try {
          const response = await productService.getCategories();
          const data = response.data as Array<Record<string, unknown>>;
          const mapped: Category[] = data.map((c) => ({
            id: String(c._id || c.id),
            name: c.name as string,
            icon: (c.icon || '') as string,
            productCount: (c.productCount || 0) as number,
            color: (c.color || '') as string,
          }));
          set({ categories: mapped });
        } catch (err: unknown) {
          if (isConnectionError(err)) {
            set({ categories: MOCK_CATEGORIES });
          }
        }
      },

      // Orders
      orders: [],
      ordersLoading: false,
      ordersError: null,

      fetchOrders: async () => {
        set({ ordersLoading: true, ordersError: null });
        try {
          const response = await orderService.getAll();
          const data = response.data as Array<Record<string, unknown>>;
          const mapped: Order[] = data.map((o) => ({
            id: String(o.order_number || o.id),
            userId: String(o.user_id || o.userId),
            items: ((o.items || []) as Array<Record<string, unknown>>).map((item) => ({
              product: {
                id: String(item.product_id || item.productId || ''),
                name: (item.product_name || item.productName || '') as string,
                description: '',
                price: Number(item.price || 0),
                category: '',
                tags: [],
                image: (item.product_image || item.productImage || '') as string,
                images: [],
                rating: 0,
                reviewCount: 0,
                stock: 0,
                featured: false,
                createdAt: '',
              },
              quantity: Number(item.quantity || 1),
            })),
            subtotal: Number(o.subtotal || 0),
            tax: Number(o.tax || 0),
            shipping: Number(o.shipping || 0),
            total: Number(o.total_amount || o.total || 0),
            status: (o.status || 'pending') as Order['status'],
            paymentStatus: (o.payment_status || o.paymentStatus || 'pending') as Order['paymentStatus'],
            paymentMethod: (o.payment_method || o.paymentMethod || '') as string,
            createdAt: String(o.created_at || o.createdAt || ''),
            updatedAt: String(o.updated_at || o.updatedAt || ''),
            shippingAddress: (o.shipping_address || o.shippingAddress || {
              street: '', city: '', state: '', zip: '', country: '',
            }) as Order['shippingAddress'],
            trackingNumber: (o.tracking_number || o.trackingNumber) as string | undefined,
          }));
          set({ orders: mapped, ordersLoading: false });
        } catch (err: unknown) {
          if (isConnectionError(err)) {
            const user = get().currentUser;
            const fallback = user
              ? MOCK_ORDERS.filter(o => o.userId === user.id || o.userId === 'u2')
              : [];
            set({ orders: fallback, ordersLoading: false });
          } else {
            const errorMsg = axios.isAxiosError(err) && err.response?.data?.error
              ? err.response.data.error
              : 'Failed to load orders';
            set({ ordersError: errorMsg, ordersLoading: false });
          }
        }
      },

      createOrder: async (data) => {
        set({ ordersLoading: true, ordersError: null });
        try {
          const response = await orderService.create(data);
          set({ ordersLoading: false });
          return { success: true, order: response.data as Record<string, unknown> };
        } catch (err: unknown) {
          set({ ordersLoading: false });
          if (isConnectionError(err)) {
            // Simulate success when backend is down
            return {
              success: true,
              order: { order_number: `ORD-${Math.floor(Math.random() * 90000) + 10000}` },
            };
          }
          const errorMsg = axios.isAxiosError(err) && err.response?.data?.error
            ? err.response.data.error
            : 'Failed to place order';
          set({ ordersError: errorMsg });
          return { success: false, error: errorMsg };
        }
      },

      cancelOrder: async (id: string) => {
        try {
          await orderService.cancel(id);
          set(state => ({
            orders: state.orders.map(o =>
              o.id === id ? { ...o, status: 'cancelled' as const } : o
            ),
          }));
          return { success: true };
        } catch (err: unknown) {
          const errorMsg = axios.isAxiosError(err) && err.response?.data?.error
            ? err.response.data.error
            : 'Failed to cancel order';
          return { success: false, error: errorMsg };
        }
      },

      // WebSocket
      wsConnected: { order: false, notification: false },
      setWsConnected: (service: 'order' | 'notification', connected: boolean) => {
        set(state => ({
          wsConnected: { ...state.wsConnected, [service]: connected },
        }));
      },
      addNotification: (notification: Notification) => {
        set(state => ({
          notifications: [notification, ...state.notifications],
        }));
      },

      // Search
      searchQuery: '',
      setSearchQuery: (query: string) => set({ searchQuery: query }),
    }),
    {
      name: 'shopnova-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        cartItems: state.cartItems,
        wishlist: state.wishlist,
      }),
    }
  )
);
