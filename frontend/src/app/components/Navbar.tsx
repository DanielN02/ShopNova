import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import {
  ShoppingCart,
  Search,
  Heart,
  Bell,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  Package,
  LayoutDashboard,
  ChevronDown,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { useDebounce } from "../hooks/useDebounce";
import { motion, AnimatePresence } from "motion/react";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isAuthenticated,
    currentUser,
    logout,
    cartItems,
    notifications,
    markAllRead,
    setSearchQuery,
    searchQuery,
  } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Navigate to catalog on debounced search when on a non-catalog page
  const navigateToCatalog = useCallback(
    (query: string) => {
      if (query.trim()) {
        navigate(`/catalog?search=${encodeURIComponent(query.trim())}`);
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (debouncedSearch.trim() && location.pathname !== "/catalog") {
      navigateToCatalog(debouncedSearch);
    }
  }, [debouncedSearch, location.pathname, navigateToCatalog]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate("/");
  };

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Catalog", path: "/catalog" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-black">S</span>
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">
              Shop<span className="text-violet-600">Nova</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? "text-violet-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search Bar Desktop */}
          <div className="hidden md:flex flex-1 max-w-sm mx-6">
            <form onSubmit={handleSearch} className="w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Mobile Search Toggle */}
            <button
              className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>

            {/* Wishlist */}
            <button
              className="hidden sm:flex p-2 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() =>
                navigate(isAuthenticated ? "/dashboard/wishlist" : "/login")
              }
            >
              <Heart className="w-5 h-5 text-gray-600" />
            </button>

            {/* Notifications */}
            {isAuthenticated && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setProfileOpen(false);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <span className="font-semibold text-gray-900">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-violet-600 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-sm text-gray-500 text-center">
                            No notifications
                          </p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-4 border-b border-gray-50 last:border-0 ${!n.read ? "bg-violet-50" : ""}`}
                            >
                              <div className="flex gap-2 items-start">
                                <div
                                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-violet-500" : "bg-gray-300"}`}
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {n.title}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {n.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Cart */}
            <button
              onClick={() => navigate("/cart")}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
            >
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            {/* Profile / Auth */}
            {isAuthenticated ? (
              <div className="relative ml-1" ref={profileRef}>
                <button
                  onClick={() => {
                    setProfileOpen(!profileOpen);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <img
                    src="/assets/images/faceless_profile.jpeg"
                    alt={currentUser?.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-violet-200"
                  />
                  <ChevronDown className="w-3 h-3 text-gray-500 hidden sm:block" />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-100">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {currentUser?.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {currentUser?.email}
                        </p>
                        <span
                          className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                            currentUser?.role === "admin"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-violet-100 text-violet-700"
                          }`}
                        >
                          {currentUser?.role}
                        </span>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            navigate("/dashboard");
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </button>
                        <button
                          onClick={() => {
                            navigate("/dashboard/orders");
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Package className="w-4 h-4" />
                          My Orders
                        </button>
                        <button
                          onClick={() => {
                            navigate("/dashboard/settings");
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>
                        <div className="border-t border-gray-100 mt-2 pt-2">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 ml-2">
                <Link
                  to="/login"
                  className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm font-medium text-white bg-violet-600 rounded-full hover:bg-violet-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-full hover:bg-gray-100 ml-1"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-3"
            >
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-100 py-3 space-y-1"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User className="w-4 h-4 mr-2" /> Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-violet-600"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User className="w-4 h-4 mr-2" /> Sign Up
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
