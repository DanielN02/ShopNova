import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, CartItem, Product, Notification } from '../types';
import { MOCK_USERS, MOCK_NOTIFICATIONS } from '../data/mockData';

interface StoreState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  register: (name: string, email: string, password: string) => { success: boolean; error?: string };

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
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: () => number;

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

      login: (email: string, _password: string) => {
        const user = MOCK_USERS.find(u => u.email === email);
        if (user) {
          set({ currentUser: user, isAuthenticated: true });
          const userNotifications = MOCK_NOTIFICATIONS.filter(n => n.userId === user.id);
          set({ notifications: userNotifications });
          return { success: true };
        }
        return { success: false, error: 'Invalid email or password' };
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false, cartItems: [], notifications: [] });
      },

      register: (name: string, email: string, _password: string) => {
        const exists = MOCK_USERS.find(u => u.email === email);
        if (exists) {
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
        set({ currentUser: newUser, isAuthenticated: true, notifications: [] });
        return { success: true };
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

      markNotificationRead: (id: string) => {
        set(state => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        }));
      },

      markAllRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
        }));
      },

      unreadCount: () => get().notifications.filter(n => !n.read).length,

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
