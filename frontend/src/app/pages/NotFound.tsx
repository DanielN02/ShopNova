import { Link } from 'react-router';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-[120px] font-black text-violet-100 leading-none select-none">404</div>
        <div className="-mt-8">
          <h1 className="text-3xl font-black text-gray-900">Page Not Found</h1>
          <p className="text-gray-500 mt-3">
            Oops! The page you're looking for seems to have gone shopping without us.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white font-semibold rounded-full hover:bg-violet-700 transition-colors"
            >
              <Home className="w-4 h-4" /> Go Home
            </Link>
            <Link
              to="/catalog"
              className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors"
            >
              <Search className="w-4 h-4" /> Browse Products
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
