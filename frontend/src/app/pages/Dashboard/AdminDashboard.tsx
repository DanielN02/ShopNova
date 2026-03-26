import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp,
  DollarSign, BarChart2, Settings, Plus, Search, ChevronDown,
  Edit2, Trash2, Eye, ArrowUpRight, ArrowDownRight, LogOut, Bell, Loader2, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_USERS, ANALYTICS_DATA } from '../../data/mockData';
import { productService, orderService, userApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import type { Product, Order, User, OrderStatus } from '../../types';
import { AddProductModal } from '../../components/admin/AddProductModal';
import { EditProductModal } from '../../components/admin/EditProductModal';
import { OrderStatusModal } from '../../components/admin/OrderStatusModal';

type AdminView = 'overview' | 'products' | 'orders' | 'customers' | 'analytics';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-purple-100 text-purple-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-amber-100 text-amber-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_PIE_COLORS: Record<string, string> = {
  pending: '#8b5cf6',
  processing: '#3b82f6',
  shipped: '#f59e0b',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  revenueByMonth: { month: string; revenue: number }[];
  ordersByStatus: { status: string; count: number; color?: string }[];
  topProducts: { name: string; image: string; sold: number; revenue: number }[];
  ordersPerUser: { userId?: number; name?: string; orders: number; spent: number }[];
}

export function AdminDashboard() {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<string>('all');

  // Data state
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [analytics, setAnalytics] = useState<AnalyticsData>(ANALYTICS_DATA);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [errorProducts, setErrorProducts] = useState('');
  const [errorOrders, setErrorOrders] = useState('');
  const [errorUsers, setErrorUsers] = useState('');

  // Modal state
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [orderStatusOrder, setOrderStatusOrder] = useState<Order | null>(null);
  const [orderStatusOpen, setOrderStatusOpen] = useState(false);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setErrorProducts('');
    try {
      const res = await productService.getAll();
      const data = res.data;
      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products.map((p: Record<string, unknown>) => ({
          id: (p._id as string) || (p.id as string),
          name: p.name as string,
          description: p.description as string,
          price: p.price as number,
          originalPrice: p.originalPrice as number | undefined,
          category: p.category as string,
          tags: (p.tags as string[]) || [],
          image: p.image as string,
          images: (p.images as string[]) || [],
          rating: (p.rating as number) || 0,
          reviewCount: (p.reviewCount as number) || 0,
          stock: (p.stock as number) || 0,
          featured: (p.featured as boolean) || false,
          createdAt: (p.createdAt as string) || new Date().toISOString(),
        })));
      }
    } catch {
      console.warn('Could not load products from API, using mock data');
      setErrorProducts('Could not load data');
      setProducts(MOCK_PRODUCTS);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Fetch orders (admin endpoint)
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    setErrorOrders('');
    try {
      const res = await orderService.getAllAdmin();
      const data = res.data;
      if (Array.isArray(data)) {
        setOrders(data.map((o: Record<string, unknown>) => ({
          id: String(o.id || o.order_number || o._id),
          userId: String(o.user_id || o.userId),
          items: Array.isArray(o.items) ? o.items : [],
          subtotal: Number(o.subtotal) || 0,
          tax: Number(o.tax) || 0,
          shipping: Number(o.shipping) || 0,
          total: Number(o.total_amount || o.total) || 0,
          status: (o.status as OrderStatus) || 'pending',
          paymentStatus: (o.payment_status || o.paymentStatus || 'pending') as 'pending' | 'paid' | 'failed',
          paymentMethod: (o.payment_method || o.paymentMethod || '') as string,
          createdAt: (o.created_at || o.createdAt || new Date().toISOString()) as string,
          updatedAt: (o.updated_at || o.updatedAt || new Date().toISOString()) as string,
          shippingAddress: (o.shipping_address || o.shippingAddress || {}) as { street: string; city: string; state: string; zip: string; country: string },
          trackingNumber: (o.tracking_number || o.trackingNumber) as string | undefined,
        })));
      }
    } catch {
      console.warn('Could not load orders from API, using mock data');
      setErrorOrders('Could not load data');
      setOrders(MOCK_ORDERS);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setErrorUsers('');
    try {
      const res = await userApi.get('/users');
      const data = res.data;
      if (Array.isArray(data)) {
        setUsers(data.map((u: Record<string, unknown>) => ({
          id: String(u.id || u._id),
          name: (u.name as string) || '',
          email: (u.email as string) || '',
          role: (u.role as 'admin' | 'customer') || 'customer',
          avatar: (u.avatar as string) || '',
          phone: (u.phone as string) || '',
          createdAt: (u.created_at || u.createdAt || new Date().toISOString()) as string,
        })));
      }
    } catch {
      console.warn('Could not load users from API, using mock data');
      setErrorUsers('Could not load data');
      setUsers(MOCK_USERS);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await orderService.getAnalytics();
      const data = res.data;
      setAnalytics({
        totalRevenue: data.totalRevenue ?? ANALYTICS_DATA.totalRevenue,
        totalOrders: data.totalOrders ?? ANALYTICS_DATA.totalOrders,
        totalCustomers: data.totalCustomers ?? ANALYTICS_DATA.totalCustomers,
        revenueByMonth: Array.isArray(data.revenueByMonth) && data.revenueByMonth.length > 0
          ? data.revenueByMonth
          : ANALYTICS_DATA.revenueByMonth,
        ordersByStatus: Array.isArray(data.ordersByStatus) && data.ordersByStatus.length > 0
          ? data.ordersByStatus.map((s: { status: string; count: number }) => ({
              ...s,
              status: s.status.charAt(0).toUpperCase() + s.status.slice(1),
              color: STATUS_PIE_COLORS[s.status] || '#6b7280',
            }))
          : ANALYTICS_DATA.ordersByStatus,
        topProducts: Array.isArray(data.topProducts) && data.topProducts.length > 0
          ? data.topProducts
          : ANALYTICS_DATA.topProducts,
        ordersPerUser: Array.isArray(data.ordersPerUser) && data.ordersPerUser.length > 0
          ? data.ordersPerUser
          : ANALYTICS_DATA.ordersPerUser,
      });
    } catch {
      console.warn('Could not load analytics from API, using mock data');
      setAnalytics(ANALYTICS_DATA);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchUsers();
    fetchAnalytics();
  }, [fetchProducts, fetchOrders, fetchUsers, fetchAnalytics]);

  // Delete product handler
  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    try {
      await productService.delete(product.id);
      toast.success(`"${product.name}" deleted successfully`);
      fetchProducts();
    } catch {
      toast.error('Failed to delete product. Please try again.');
    }
  };

  const { totalRevenue, totalOrders, totalCustomers, revenueByMonth, ordersByStatus, topProducts, ordersPerUser } = analytics;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = orderFilter === 'all'
    ? orders
    : orders.filter(o => o.status === orderFilter);

  const SIDEBAR_ITEMS: { key: AdminView; icon: React.ElementType; label: string }[] = [
    { key: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { key: 'products', icon: Package, label: 'Products' },
    { key: 'orders', icon: ShoppingCart, label: 'Orders' },
    { key: 'customers', icon: Users, label: 'Customers' },
    { key: 'analytics', icon: BarChart2, label: 'Analytics' },
  ];

  const STAT_CARDS = [
    {
      label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, change: '+12.5%', up: true,
      icon: DollarSign, color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Total Orders', value: totalOrders.toLocaleString(), change: '+8.2%', up: true,
      icon: ShoppingCart, color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Customers', value: totalCustomers.toLocaleString(), change: '+15.3%', up: true,
      icon: Users, color: 'bg-violet-100 text-violet-600',
    },
    {
      label: 'Products', value: products.length.toString(), change: '-2.1%', up: false,
      icon: Package, color: 'bg-orange-100 text-orange-600',
    },
  ];

  function ErrorBanner({ message }: { message: string }) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {message} — showing cached data.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-gray-900 shrink-0">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <span className="text-white text-sm font-black">S</span>
            </div>
            <span className="text-white font-black text-sm">ShopNova <span className="text-violet-400">Admin</span></span>
          </div>
        </div>

        <div className="p-3 flex-1">
          {SIDEBAR_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all ${
                activeView === item.key
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <img src={currentUser?.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{currentUser?.name}</p>
              <p className="text-gray-500 text-[10px]">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-black text-gray-900 capitalize">{activeView}</h1>
          <div className="flex items-center gap-3">
            {/* Mobile nav */}
            <div className="flex md:hidden gap-1 overflow-x-auto">
              {SIDEBAR_ITEMS.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveView(item.key)}
                  className={`p-2 rounded-lg ${activeView === item.key ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  <item.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            <button className="p-2 rounded-xl hover:bg-gray-100 relative">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <img src={currentUser?.avatar} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-violet-200" />
          </div>
        </header>

        <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 65px)' }}>
          {/* OVERVIEW */}
          {activeView === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STAT_CARDS.map((card, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                        <card.icon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-semibold flex items-center gap-0.5 ${card.up ? 'text-green-600' : 'text-red-500'}`}>
                        {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {card.change}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-gray-900 mt-3">{card.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Revenue Chart */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-600" /> Revenue (Last 6 Months)
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueByMonth}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5} fill="url(#revenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Two-column: Top Products + Order Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top Products */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900 mb-4">Top Selling Products</h3>
                  <div className="space-y-3">
                    {topProducts.map((p, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-5 h-5 text-xs font-black text-gray-400 shrink-0 text-center">#{i + 1}</span>
                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-gray-50" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.sold} sold</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900 shrink-0">${p.revenue.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Status Pie */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900 mb-4">Orders by Status</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="count" nameKey="status" paddingAngle={3}>
                        {ordersByStatus.map((entry, i) => (
                          <Cell key={i} fill={entry.color || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [v, name]} />
                      <Legend iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">Recent Orders</h3>
                  <button onClick={() => setActiveView('orders')} className="text-xs text-violet-600">View all &rarr;</button>
                </div>
                {errorOrders && <ErrorBanner message={errorOrders} />}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="pb-3 text-left font-medium">Order ID</th>
                        <th className="pb-3 text-left font-medium">Customer</th>
                        <th className="pb-3 text-left font-medium">Total</th>
                        <th className="pb-3 text-left font-medium">Status</th>
                        <th className="pb-3 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.slice(0, 5).map(order => {
                        const user = users.find(u => u.id === order.userId);
                        return (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="py-3 font-mono font-semibold text-gray-800">#{order.id}</td>
                            <td className="py-3 text-gray-600">{user?.name || 'Unknown'}</td>
                            <td className="py-3 font-semibold">${order.total.toFixed(2)}</td>
                            <td className="py-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* PRODUCTS */}
          {activeView === 'products' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-black text-gray-900">Products ({products.length})</h2>
                <button
                  onClick={() => setAddProductOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>

              {errorProducts && <ErrorBanner message={errorProducts} />}

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {loadingProducts ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr className="text-xs text-gray-500">
                        <th className="px-5 py-3.5 text-left font-semibold">Product</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Category</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Price</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Stock</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Rating</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map(product => (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img src={product.image} alt={product.name} className="w-11 h-11 rounded-xl object-cover bg-gray-100" />
                              <div>
                                <p className="font-semibold text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-400">ID: {product.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">{product.category}</span>
                          </td>
                          <td className="px-5 py-4 font-semibold">${product.price.toFixed(2)}</td>
                          <td className="px-5 py-4">
                            <span className={`font-semibold ${product.stock < 10 ? 'text-red-500' : 'text-gray-900'}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="flex items-center gap-1 text-amber-500 font-semibold">
                              &#9733; {product.rating}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => { setEditProduct(product); setEditProductOpen(true); }} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => navigate(`/products/${product.id}`)} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteProduct(product)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </motion.div>
          )}

          {/* ORDERS */}
          {activeView === 'orders' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-black text-gray-900">Orders ({orders.length})</h2>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => setOrderFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        orderFilter === status ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {errorOrders && <ErrorBanner message={errorOrders} />}

              {loadingOrders ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr className="text-xs text-gray-500">
                        <th className="px-5 py-3.5 text-left font-semibold">Order ID</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Customer</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Items</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Total</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Status</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Payment</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Date</th>
                        <th className="px-5 py-3.5 text-left font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredOrders.map(order => {
                        const user = users.find(u => u.id === order.userId);
                        return (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4 font-mono font-semibold text-gray-800 text-xs">#{order.id}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <img src={user?.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                                <span className="text-gray-700">{user?.name || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-gray-600">{order.items.length} items</td>
                            <td className="px-5 py-4 font-bold">${order.total.toFixed(2)}</td>
                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs font-semibold ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                {order.paymentStatus}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                            <td className="px-5 py-4">
                              <div className="flex gap-2">
                                <button onClick={() => toast.info(`Order #${order.id} details`)} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setOrderStatusOrder(order); setOrderStatusOpen(true); }} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </motion.div>
          )}

          {/* CUSTOMERS */}
          {activeView === 'customers' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <h2 className="text-xl font-black text-gray-900">Customers ({users.filter(u => u.role === 'customer').length})</h2>
              {errorUsers && <ErrorBanner message={errorUsers} />}
              {loadingUsers ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-xs text-gray-500">
                      <th className="px-5 py-3.5 text-left font-semibold">Customer</th>
                      <th className="px-5 py-3.5 text-left font-semibold">Role</th>
                      <th className="px-5 py-3.5 text-left font-semibold">Orders</th>
                      <th className="px-5 py-3.5 text-left font-semibold">Total Spent</th>
                      <th className="px-5 py-3.5 text-left font-semibold">Joined</th>
                      <th className="px-5 py-3.5 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(user => {
                      const userOrders = orders.filter(o => o.userId === user.id);
                      const spent = userOrders.reduce((s, o) => s + o.total, 0);
                      return (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                              <div>
                                <p className="font-semibold text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-400">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              user.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-violet-100 text-violet-700'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-gray-900">{userOrders.length}</td>
                          <td className="px-5 py-4 font-semibold text-gray-900">${spent.toFixed(2)}</td>
                          <td className="px-5 py-4 text-gray-500 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => toast.info(`Viewing ${user.name}`)} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg">
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </motion.div>
          )}

          {/* ANALYTICS */}
          {activeView === 'analytics' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-xl font-black text-gray-900">Analytics Overview</h2>

              {loadingAnalytics ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              ) : (
              <>
              {/* Revenue Chart */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-5">Monthly Revenue</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top Products */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900 mb-4">Most Purchased Products</h3>
                  <div className="space-y-4">
                    {topProducts.map((p, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-900">{p.name}</span>
                          <span className="font-bold text-violet-600">{p.sold} sold</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full"
                            style={{ width: `${topProducts[0]?.sold ? (p.sold / topProducts[0].sold) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Orders per User */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900 mb-4">Top Customers by Orders</h3>
                  <div className="space-y-3">
                    {ordersPerUser.map((u, i) => {
                      const displayName = u.name || users.find(usr => usr.id === String(u.userId))?.name || `User ${u.userId}`;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-black text-gray-400 w-4">#{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">{displayName}</span>
                              <span className="text-xs text-gray-500">{u.orders} orders</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${ordersPerUser[0]?.orders ? (u.orders / ordersPerUser[0].orders) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 w-20 text-right">${u.spent.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Order Distribution */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-4">Order Status Distribution</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {ordersByStatus.map((status, i) => (
                    <div key={i} className="text-center p-4 rounded-2xl border-2" style={{ borderColor: `${status.color || '#6b7280'}40`, backgroundColor: `${status.color || '#6b7280'}10` }}>
                      <p className="text-2xl font-black" style={{ color: status.color || '#6b7280' }}>{status.count}</p>
                      <p className="text-xs font-semibold text-gray-600 mt-1">{status.status}</p>
                    </div>
                  ))}
                </div>
              </div>
              </>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddProductModal
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onCreated={fetchProducts}
      />
      <EditProductModal
        open={editProductOpen}
        product={editProduct}
        onClose={() => { setEditProductOpen(false); setEditProduct(null); }}
        onUpdated={fetchProducts}
      />
      <OrderStatusModal
        open={orderStatusOpen}
        order={orderStatusOrder}
        onClose={() => { setOrderStatusOpen(false); setOrderStatusOrder(null); }}
        onUpdated={fetchOrders}
      />
    </div>
  );
}
