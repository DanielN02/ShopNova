import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  RefreshCw,
  Headphones,
  Star,
  TrendingUp,
} from "lucide-react";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "../data/mockData";
import { ProductCard } from "../components/ProductCard";
import { motion } from "motion/react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1760565030243-c92ed557e8da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBlLWNvbW1lcmNlJTIwaGVybyUyMHNob3BwaW5nfGVufDF8fHx8MTc3NDQ4NzAyNHww&ixlib=rb-4.1.0&q=80&w=1080";

const FEATURES = [
  {
    icon: Truck,
    title: "Free Shipping",
    desc: "On orders over $50",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    desc: "256-bit SSL encryption",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: RefreshCw,
    title: "Easy Returns",
    desc: "30-day hassle-free returns",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    desc: "Always here to help",
    color: "bg-orange-100 text-orange-600",
  },
];

export function Home() {
  const navigate = useNavigate();
  const featured = MOCK_PRODUCTS.filter((p) => p.featured).slice(0, 4);
  const trending = MOCK_PRODUCTS.slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-900 to-violet-800 text-white">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Hero"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-violet-950/90 via-indigo-900/70 to-transparent" />
        </div>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/20 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-indigo-400/20 rounded-full translate-y-1/2 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4 text-violet-300" />
              New Arrivals — Spring 2026 Collection
            </span>
            <h1 className="text-5xl md:text-6xl font-black leading-tight">
              Shop Smarter,
              <br />
              <span className="text-violet-300">Live Better</span>
            </h1>
            <p className="mt-5 text-lg text-violet-100/80 leading-relaxed max-w-lg">
              Discover thousands of premium products across electronics,
              fashion, sports, and more. Curated for quality, priced for
              everyone.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/catalog")}
                className="flex items-center gap-2 px-7 py-3.5 bg-white text-violet-700 font-semibold rounded-full hover:bg-violet-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
              >
                Shop Now <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-violet-200 mt-0.5">
                  Trusted by <strong>many</strong> customers worldwide
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${f.color}`}
                >
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {f.title}
                  </p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-violet-600 text-sm font-semibold uppercase tracking-wide">
                Browse by
              </p>
              <h2 className="text-3xl font-black text-gray-900 mt-1">
                Category
              </h2>
            </div>
            <Link
              to="/catalog"
              className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {MOCK_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/catalog?category=${cat.name}`}
                  className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-violet-200 transition-all group"
                >
                  <span className="text-4xl group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </span>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 text-sm">
                      {cat.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cat.productCount} products
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-violet-600 text-sm font-semibold uppercase tracking-wide">
                Handpicked
              </p>
              <h2 className="text-3xl font-black text-gray-900 mt-1">
                Featured Products
              </h2>
            </div>
            <Link
              to="/catalog?featured=true"
              className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-8 md:p-12">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-white text-center md:text-left">
                <p className="text-violet-200 text-sm font-semibold uppercase tracking-wide mb-2">
                  Limited Time Offer
                </p>
                <h3 className="text-3xl md:text-4xl font-black">
                  Up to 40% Off
                  <br />
                  Electronics
                </h3>
                <p className="text-violet-100 mt-2">
                  Don't miss out — sale ends March 31st
                </p>
              </div>
              <button
                onClick={() => navigate("/catalog?category=Electronics")}
                className="px-8 py-3.5 bg-white text-violet-700 font-semibold rounded-full hover:bg-violet-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 shrink-0"
              >
                Shop Electronics
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* All Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-violet-600 text-sm font-semibold uppercase tracking-wide">
                Discover
              </p>
              <h2 className="text-3xl font-black text-gray-900 mt-1">
                Trending Now
              </h2>
            </div>
            <Link
              to="/catalog"
              className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trending.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-violet-600 text-white font-semibold rounded-full hover:bg-violet-700 transition-colors shadow-lg"
            >
              Load More Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
