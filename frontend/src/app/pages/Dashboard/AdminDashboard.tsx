import { useState } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp,
  DollarSign, BarChart2, Settings, Plus, Search, ChevronDown,
  Edit2, Trash2, Eye, ArrowUpRight, ArrowDownRight, LogOut, Bell
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_USERS, ANALYTICS_DATA } from '../../data/mockData';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import type { OrderStatus } from '../../types';

type AdminView = 'overview' | 'products' | 'orders' | 'customers' | 'analytics';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-purple-100 text-purple-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-amber-100 text-amber-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function AdminDashboard() {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [productSearch, setProductSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<string>('all');

  const { totalRevenue, totalOrders, totalCustomers, revenueByMonth, ordersByStatus, topProducts, ordersPerUser } = ANALYTICS_DATA;

  const filteredProducts = MOCK_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = orderFilter === 'all'
    ? MOCK_ORDERS
    : MOCK_ORDERS.filter(o => o.status === orderFilter);

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
      label: 'Products', value: MOCK_PRODUCTS.length.toString(), change: '-2.1%', up: false,
      icon: Package, color: 'bg-orange-100 text-orange-600',
    },
  ];

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
                          <Cell key={i} fill={entry.color} />
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
                  <button onClick={() => setActiveView('orders')} className="text-xs text-violet-600">View all →</button>
                </div>
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
                      {MOCK_ORDERS.slice(0, 5).map(order => {
                        const user = MOCK_USERS.find(u => u.id === order.userId);
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
                <h2 className="text-xl font-black text-gray-900">Products ({MOCK_PRODUCTS.length})</h2>
                <button
                  onClick={() => toast.success('Add product form coming soon!')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>

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
                              ★ {product.rating}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => toast.info('Edit product')} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => toast.info(`Viewing ${product.name}`)} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => toast.error('Delete product?')} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
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
            </motion.div>
          )}

          {/* ORDERS */}
          {activeView === 'orders' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-black text-gray-900">Orders ({MOCK_ORDERS.length})</h2>
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
                        const user = MOCK_USERS.find(u => u.id === order.userId);
                        return (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4 font-mono font-semibold text-gray-800 text-xs">#{order.id}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <img src={user?.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                                <span className="text-gray-700">{user?.name}</span>
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
                                <button onClick={() => toast.info(`Viewing order #${order.id}`)} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={() => toast.success(`Order status updated!`)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg">
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
            </motion.div>
          )}

          {/* CUSTOMERS */}
          {activeView === 'customers' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <h2 className="text-xl font-black text-gray-900">Customers ({MOCK_USERS.filter(u => u.role === 'customer').length + 428})</h2>
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
                    {MOCK_USERS.map(user => {
                      const orders = MOCK_ORDERS.filter(o => o.userId === user.id);
                      const spent = orders.reduce((s, o) => s + o.total, 0);
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
                          <td className="px-5 py-4 font-semibold text-gray-900">{orders.length}</td>
                          <td className="px-5 py-4 font-semibold text-gray-900">${spent.toFixed(2)}</td>
                          <td className="px-5 py-4 text-gray-500 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => toast.info(`Viewing ${user.name}`)} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => toast.error(`Remove ${user.name}?`)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ANALYTICS */}
          {activeView === 'analytics' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-xl font-black text-gray-900">Analytics Overview</h2>

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
                            style={{ width: `${(p.sold / topProducts[0].sold) * 100}%` }}
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
                    {ordersPerUser.map((u, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-400 w-4">#{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{u.name}</span>
                            <span className="text-xs text-gray-500">{u.orders} orders</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${(u.orders / ordersPerUser[0].orders) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-20 text-right">${u.spent.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Distribution */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-4">Order Status Distribution</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {ordersByStatus.map((status, i) => (
                    <div key={i} className="text-center p-4 rounded-2xl border-2" style={{ borderColor: `${status.color}40`, backgroundColor: `${status.color}10` }}>
                      <p className="text-2xl font-black" style={{ color: status.color }}>{status.count}</p>
                      <p className="text-xs font-semibold text-gray-600 mt-1">{status.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
