import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  Package,
  Heart,
  Bell,
  Settings,
  User,
  ShoppingBag,
  ChevronRight,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  MapPin,
  CreditCard,
  LogOut,
  Loader2,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import type { OrderStatus } from "../../types";
import { motion } from "motion/react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<
  OrderStatus,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: "text-purple-600",
    bg: "bg-purple-100",
    label: "Pending",
  },
  processing: {
    icon: RefreshCw,
    color: "text-blue-600",
    bg: "bg-blue-100",
    label: "Processing",
  },
  shipped: {
    icon: Truck,
    color: "text-amber-600",
    bg: "bg-amber-100",
    label: "Shipped",
  },
  delivered: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100",
    label: "Delivered",
  },
  cancelled: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100",
    label: "Cancelled",
  },
};

type View = "overview" | "orders" | "wishlist" | "settings";

export function CustomerDashboard() {
  const {
    currentUser,
    logout,
    wishlist,
    notifications,
    markNotificationRead,
    orders,
    ordersLoading,
    fetchOrders,
    fetchNotifications,
    products,
    fetchProducts,
  } = useStore();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<View>("overview");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Fetch real data on mount
  useEffect(() => {
    fetchOrders();
    fetchNotifications();
    if (products.length === 0) {
      fetchProducts();
    }
  }, [fetchOrders, fetchNotifications, fetchProducts, products.length]);

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const SIDEBAR_ITEMS = [
    { key: "overview" as View, icon: ShoppingBag, label: "Overview" },
    {
      key: "orders" as View,
      icon: Package,
      label: "My Orders",
      badge: orders.length,
    },
    {
      key: "wishlist" as View,
      icon: Heart,
      label: "Wishlist",
      badge: wishlistProducts.length,
    },
    { key: "settings" as View, icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-60 shrink-0 gap-2">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center mb-2">
              <img
                src="https://picsum.photos/seed/default-profile/150/150.jpg"
                alt={currentUser?.name}
                className="w-16 h-16 rounded-full mx-auto object-cover border-4 border-violet-100"
                onError={(e) => {
                  e.currentTarget.src = `https://picsum.photos/seed/default-profile/150/150.jpg`;
                }}
              />
              <p className="font-bold text-gray-900 mt-3">
                {currentUser?.name}
              </p>
              <p className="text-xs text-gray-500">{currentUser?.email}</p>
              <span className="mt-2 inline-block px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold">
                Customer
              </span>
            </div>

            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeView === item.key
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-white hover:shadow-sm"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                      activeView === item.key
                        ? "bg-white/20 text-white"
                        : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            ))}

            <button
              onClick={() => {
                logout();
                navigate("/");
                toast("Signed out");
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 mt-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </aside>

          {/* Mobile Nav */}
          <div className="md:hidden w-full">
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
              {SIDEBAR_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveView(item.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    activeView === item.key
                      ? "bg-violet-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Overview */}
            {activeView === "overview" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-black text-gray-900">
                    Welcome back, {currentUser?.name?.split(" ")[0]}!
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">
                    Here's your shopping summary
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Orders",
                      value: orders.length,
                      icon: Package,
                      color: "bg-blue-100 text-blue-600",
                    },
                    {
                      label: "Delivered",
                      value: orders.filter((o) => o.status === "delivered")
                        .length,
                      icon: CheckCircle,
                      color: "bg-green-100 text-green-600",
                    },
                    {
                      label: "Wishlist",
                      value: wishlistProducts.length,
                      icon: Heart,
                      color: "bg-pink-100 text-pink-600",
                    },
                    {
                      label: "Notifications",
                      value: unreadNotifications,
                      icon: Bell,
                      color: "bg-violet-100 text-violet-600",
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-gray-100 p-4"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}
                      >
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-black text-gray-900">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900">Recent Orders</h2>
                    <button
                      onClick={() => setActiveView("orders")}
                      className="text-xs text-violet-600 flex items-center gap-1"
                    >
                      View all <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {ordersLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No orders yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 3).map((order) => {
                        const status = STATUS_CONFIG[order.status];
                        return (
                          <div
                            key={order.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                          >
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center ${status.bg}`}
                            >
                              <status.icon
                                className={`w-4 h-4 ${status.color}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">
                                #{order.id}
                              </p>
                              <p className="text-xs text-gray-500">
                                {order.items.length} items - $
                                {order.total.toFixed(2)}
                              </p>
                            </div>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-lg ${status.bg} ${status.color}`}
                            >
                              {status.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notifications */}
                {notifications.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h2 className="font-bold text-gray-900 mb-4">
                      Notifications
                    </h2>
                    <div className="space-y-3">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-colors ${!n.read ? "bg-violet-50" : "bg-gray-50 hover:bg-gray-100"}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? "bg-violet-500" : "bg-gray-300"}`}
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Orders */}
            {activeView === "orders" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
                {ordersLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No orders yet</p>
                    <Link
                      to="/catalog"
                      className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-full text-sm font-medium"
                    >
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  orders.map((order) => {
                    const status = STATUS_CONFIG[order.status];
                    const isExpanded = expandedOrder === order.id;
                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                      >
                        <div
                          className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() =>
                            setExpandedOrder(isExpanded ? null : order.id)
                          }
                        >
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${status.bg}`}
                              >
                                <status.icon
                                  className={`w-5 h-5 ${status.color}`}
                                />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">
                                  #{order.id}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(
                                    order.createdAt,
                                  ).toLocaleDateString()}{" "}
                                  - {order.items.length} items
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}
                              >
                                {status.label}
                              </span>
                              <span className="font-bold text-gray-900">
                                ${order.total.toFixed(2)}
                              </span>
                              <ChevronRight
                                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              />
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-100 p-5 bg-gray-50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              {order.trackingNumber && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Truck className="w-4 h-4 text-violet-600" />
                                  <span className="text-gray-500">
                                    Tracking:
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {order.trackingNumber}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm">
                                <CreditCard className="w-4 h-4 text-violet-600" />
                                <span className="text-gray-500">Payment:</span>
                                <span className="font-semibold text-gray-900">
                                  {order.paymentMethod}
                                </span>
                              </div>
                              {order.shippingAddress &&
                                order.shippingAddress.street && (
                                  <div className="flex items-start gap-2 text-sm">
                                    <MapPin className="w-4 h-4 text-violet-600 mt-0.5" />
                                    <span className="text-gray-600">
                                      {order.shippingAddress.street},{" "}
                                      {order.shippingAddress.city},{" "}
                                      {order.shippingAddress.state}
                                    </span>
                                  </div>
                                )}
                            </div>
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3"
                                >
                                  {item.product.image && (
                                    <img
                                      src={item.product.image}
                                      alt={item.product.name}
                                      className="w-12 h-12 rounded-lg object-cover bg-white"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {item.product.name || "Product"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Qty: {item.quantity} x $
                                      {item.product.price.toFixed(2)}
                                    </p>
                                  </div>
                                  <p className="font-semibold text-gray-900 text-sm">
                                    $
                                    {(
                                      item.product.price * item.quantity
                                    ).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}

            {/* Wishlist */}
            {activeView === "wishlist" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-2xl font-black text-gray-900 mb-6">
                  My Wishlist
                </h1>
                {wishlistProducts.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Your wishlist is empty</p>
                    <Link
                      to="/catalog"
                      className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-full text-sm font-medium"
                    >
                      Browse Products
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wishlistProducts.map((product) => (
                      <div
                        key={product.id}
                        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full aspect-video object-cover"
                        />
                        <div className="p-4">
                          <p className="text-xs text-violet-600 font-medium">
                            {product.category}
                          </p>
                          <h3 className="font-semibold text-gray-900 mt-0.5">
                            {product.name}
                          </h3>
                          <p className="font-bold text-gray-900 mt-2">
                            ${product.price.toFixed(2)}
                          </p>
                          <Link
                            to={`/product/${product.id}`}
                            className="mt-3 block text-center py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
                          >
                            View Product
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Settings */}
            {activeView === "settings" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <h1 className="text-2xl font-black text-gray-900">
                  Account Settings
                </h1>
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <User className="w-4 h-4 text-violet-600" /> Profile
                    Information
                  </h2>
                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src="https://picsum.photos/seed/default-profile/150/150.jpg"
                      alt=""
                      className="w-20 h-20 rounded-full object-cover border-4 border-violet-100"
                      onError={(e) => {
                        e.currentTarget.src = `https://picsum.photos/seed/default-profile/150/150.jpg`;
                      }}
                    />
                    <button className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                      Change Photo
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        label: "Full Name",
                        value: currentUser?.name,
                        type: "text",
                      },
                      {
                        label: "Email",
                        value: currentUser?.email,
                        type: "email",
                      },
                      {
                        label: "Phone",
                        value: currentUser?.phone || "",
                        type: "tel",
                      },
                    ].map((field) => (
                      <div
                        key={field.label}
                        className={
                          field.label === "Email" ? "sm:col-span-2" : ""
                        }
                      >
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          defaultValue={field.value}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => toast.success("Profile updated!")}
                    className="mt-5 px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-violet-600" /> Notification
                    Preferences
                  </h2>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Order updates",
                        desc: "Get notified when your order status changes",
                      },
                      {
                        label: "Promotions & deals",
                        desc: "Receive exclusive offers and sale alerts",
                      },
                      {
                        label: "Newsletter",
                        desc: "Weekly curated product picks",
                      },
                    ].map((pref) => (
                      <label
                        key={pref.label}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {pref.label}
                          </p>
                          <p className="text-xs text-gray-500">{pref.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="accent-violet-600 w-4 h-4"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
