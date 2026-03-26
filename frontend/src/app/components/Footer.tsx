import { Link } from 'react-router';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-sm font-black">S</span>
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                Shop<span className="text-violet-400">Nova</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              Your one-stop destination for premium products across electronics, fashion, sports, and more. Quality you can trust, delivered fast.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <button key={i} className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-violet-600 transition-colors">
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', path: '/' },
                { label: 'Product Catalog', path: '/catalog' },
                { label: 'My Account', path: '/dashboard' },
                { label: 'Shopping Cart', path: '/cart' },
              ].map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-gray-400 hover:text-violet-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-semibold mb-4">Categories</h4>
            <ul className="space-y-2.5">
              {['Electronics', 'Fashion', 'Sports', 'Home & Kitchen', 'Beauty', 'Books'].map(cat => (
                <li key={cat}>
                  <Link to={`/catalog?category=${cat}`} className="text-sm text-gray-400 hover:text-violet-400 transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                123 Commerce Ave, San Francisco, CA 94107
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Phone className="w-4 h-4 text-violet-400 shrink-0" />
                +1 (800) SHOPNOVA
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Mail className="w-4 h-4 text-violet-400 shrink-0" />
                support@shopnova.com
              </li>
            </ul>
            <div className="mt-5 p-3 bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Subscribe to our newsletter</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
                <button className="px-3 py-1.5 bg-violet-600 rounded-lg text-xs text-white font-medium hover:bg-violet-700 transition-colors">
                  Go
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">© 2026 ShopNova. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(item => (
              <button key={item} className="text-xs text-gray-500 hover:text-gray-400 transition-colors">{item}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
