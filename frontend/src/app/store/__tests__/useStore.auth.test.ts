import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../useStore';

// Mock the API services - simulate connection errors to trigger mock data fallback
vi.mock('../../services/api', () => {
  const connectionError = () => {
    const err = new Error('Network Error');
    (err as any).code = 'ERR_NETWORK';
    (err as any).isAxiosError = true;
    return Promise.reject(err);
  };

  return {
    authService: {
      login: vi.fn().mockImplementation(() => connectionError()),
      register: vi.fn().mockImplementation(() => connectionError()),
      getProfile: vi.fn().mockImplementation(() => connectionError()),
    },
    productService: {
      getAll: vi.fn().mockImplementation(() => connectionError()),
      getById: vi.fn().mockImplementation(() => connectionError()),
      search: vi.fn().mockImplementation(() => connectionError()),
      getCategories: vi.fn().mockImplementation(() => connectionError()),
    },
    orderService: {
      getAll: vi.fn().mockImplementation(() => connectionError()),
      create: vi.fn().mockImplementation(() => connectionError()),
      cancel: vi.fn().mockImplementation(() => connectionError()),
    },
    notificationService: {
      getAll: vi.fn().mockImplementation(() => connectionError()),
      markRead: vi.fn().mockImplementation(() => connectionError()),
      markAllRead: vi.fn().mockImplementation(() => connectionError()),
    },
  };
});

// Mock axios.isAxiosError
vi.mock('axios', () => ({
  default: {
    isAxiosError: (err: any) => err?.isAxiosError === true,
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
  isAxiosError: (err: any) => err?.isAxiosError === true,
}));

describe('useStore - Auth', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      currentUser: null,
      isAuthenticated: false,
      authLoading: false,
      authError: null,
      cartItems: [],
      wishlist: [],
      notifications: [],
      orders: [],
    });
  });

  it('should start with no authenticated user', () => {
    const { currentUser, isAuthenticated } = useStore.getState();
    expect(currentUser).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('should login with a valid mock user email (fallback)', async () => {
    const result = await useStore.getState().login('admin@shopnova.com', 'admin123');
    expect(result.success).toBe(true);
    const { currentUser, isAuthenticated } = useStore.getState();
    expect(isAuthenticated).toBe(true);
    expect(currentUser).not.toBeNull();
    expect(currentUser!.email).toBe('admin@shopnova.com');
    expect(currentUser!.role).toBe('admin');
  });

  it('should login with a customer email (fallback)', async () => {
    const result = await useStore.getState().login('jane@example.com', 'password');
    expect(result.success).toBe(true);
    const { currentUser } = useStore.getState();
    expect(currentUser!.name).toBe('Jane Cooper');
    expect(currentUser!.role).toBe('customer');
  });

  it('should fail login with an invalid email', async () => {
    const result = await useStore.getState().login('nonexistent@example.com', 'password');
    expect(result.success).toBe(false);
    expect(useStore.getState().isAuthenticated).toBe(false);
  });

  it('should logout and clear state', async () => {
    await useStore.getState().login('admin@shopnova.com', 'admin123');
    expect(useStore.getState().isAuthenticated).toBe(true);

    useStore.getState().logout();
    const { currentUser, isAuthenticated, cartItems, notifications } = useStore.getState();
    expect(currentUser).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(cartItems).toEqual([]);
    expect(notifications).toEqual([]);
  });

  it('should register a new user (fallback)', async () => {
    const result = await useStore.getState().register('New User', 'newuser@example.com', 'pass123');
    expect(result.success).toBe(true);
    const { currentUser, isAuthenticated } = useStore.getState();
    expect(isAuthenticated).toBe(true);
    expect(currentUser).not.toBeNull();
    expect(currentUser!.name).toBe('New User');
    expect(currentUser!.email).toBe('newuser@example.com');
    expect(currentUser!.role).toBe('customer');
  });

  it('should fail registration with an existing email (fallback)', async () => {
    const result = await useStore.getState().register('Admin', 'admin@shopnova.com', 'pass123');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Email already in use');
    expect(useStore.getState().isAuthenticated).toBe(false);
  });
});
