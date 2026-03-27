import axios from 'axios';

const API_URLS = {
  user: import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:3001/api',
  product: import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:3002/api',
  order: import.meta.env.VITE_ORDER_SERVICE_URL || 'http://localhost:3003/api',
  notification: import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:3004/api',
};

function createClient(baseURL: string) {
  const client = axios.create({ baseURL, timeout: 10000 });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('shopnova-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
      const isNotificationEndpoint = url.includes('/notifications');
      const isUserEndpoint = url.includes('/users/') && !isAuthEndpoint;
      
      // Only redirect to login on 401 for critical endpoints that require valid authentication
      // Skip notifications, user profile endpoints, and any non-critical API calls
      if (error.response?.status === 401 && !isAuthEndpoint && !isNotificationEndpoint && !isUserEndpoint) {
        console.log('401 error detected, redirecting to login for:', url);
        localStorage.removeItem('shopnova-token');
        window.location.href = '/login';
      } else if (error.response?.status === 401) {
        console.log('401 error ignored for:', url);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const userApi = createClient(API_URLS.user);
export const productApi = createClient(API_URLS.product);
export const orderApi = createClient(API_URLS.order);
export const notificationApi = createClient(API_URLS.notification);

export const authService = {
  login: (email: string, password: string) =>
    userApi.post('/auth/login', { email, password }),
  register: (firstName: string, lastName: string, email: string, password: string) =>
    userApi.post('/auth/register', { firstName, lastName, email, password }),
  getProfile: () => userApi.get('/auth/profile'),
  updateProfile: (data: Record<string, string>) =>
    userApi.put('/auth/profile', data),
};

export const productService = {
  getAll: (params?: Record<string, string>) =>
    productApi.get('/products', { params }),
  getById: (id: string) => productApi.get(`/products/${id}`),
  search: (query: string) =>
    productApi.get('/products/search', { params: { q: query } }),
  getCategories: () => productApi.get('/categories'),
  create: (data: FormData) => productApi.post('/products', data),
  update: (id: string, data: FormData) =>
    productApi.put(`/products/${id}`, data),
  delete: (id: string) => productApi.delete(`/products/${id}`),
  uploadImages: (productId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return productApi.post(`/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getReviews: (productId: string) =>
    productApi.get(`/products/${productId}/reviews`),
  addReview: (productId: string, data: { rating: number; comment: string }) =>
    productApi.post(`/products/${productId}/reviews`, data),
};

export const orderService = {
  getAll: () => orderApi.get('/orders'),
  getById: (id: string) => orderApi.get(`/orders/${id}`),
  create: (data: {
    items: Array<{ productId: string; quantity: number; price: number; productName: string }>;
    shippingAddress: Record<string, string>;
    paymentMethod: string;
  }) => orderApi.post('/orders', data),
  cancel: (id: string) => orderApi.put(`/orders/${id}/cancel`),
  getAllAdmin: (params?: Record<string, string>) =>
    orderApi.get('/orders/admin/all', { params }),
  updateStatus: (id: string, status: string) =>
    orderApi.put(`/orders/${id}/status`, { status }),
  getAnalytics: () => orderApi.get('/orders/analytics/summary'),
};

export const notificationService = {
  getAll: () => notificationApi.get('/notifications'),
  markRead: (id: string) =>
    notificationApi.put(`/notifications/${id}/read`),
  markAllRead: () => notificationApi.put('/notifications/read-all'),
  subscribe: (subscription: Record<string, unknown>) =>
    notificationApi.post('/notifications/subscribe', subscription),
};
