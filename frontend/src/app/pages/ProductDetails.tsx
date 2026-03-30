import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  Star,
  Heart,
  ShoppingCart,
  Truck,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  Plus,
  Minus,
  Share2,
  Tag,
  Check,
} from "lucide-react";
import { MOCK_PRODUCTS, MOCK_REVIEWS } from "../data/mockData";
import { useStore } from "../store/useStore";
import { ProductCard } from "../components/ProductCard";
import { toast } from "sonner";
import { motion } from "motion/react";

export function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, wishlist, products } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">(
    "description",
  );

  // Try to find product in store products first, then fall back to mock data
  const product =
    products.find((p) => p.id === id) || MOCK_PRODUCTS.find((p) => p.id === id);
  const reviews = MOCK_REVIEWS.filter((r) => r.productId === id);
  const related =
    products
      .filter((p) => p.id !== id && p.category === product?.category)
      .slice(0, 4) ||
    MOCK_PRODUCTS.filter(
      (p) => p.id !== id && p.category === product?.category,
    ).slice(0, 4);
  const isWishlisted = product ? wishlist.includes(product.id) : false;

  // Ensure prices are numbers
  const price = product
    ? typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price
    : 0;
  const originalPrice = product?.originalPrice
    ? typeof product.originalPrice === "string"
      ? parseFloat(product.originalPrice)
      : product.originalPrice
    : null;

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Product not found</h2>
        <button
          onClick={() => navigate("/catalog")}
          className="px-6 py-3 bg-violet-600 text-white rounded-full"
        >
          Back to Catalog
        </button>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : 0;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigate("/cart");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-violet-600 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link
              to="/catalog"
              className="hover:text-violet-600 transition-colors"
            >
              Catalog
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link
              to={`/catalog?category=${product.category}`}
              className="hover:text-violet-600 transition-colors"
            >
              {product.category}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image */}
            <div className="relative bg-gray-50 aspect-square lg:aspect-auto lg:min-h-[480px] overflow-hidden">
              <motion.img
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {discount > 0 && (
                <div className="absolute top-6 left-6 bg-red-500 text-white font-bold px-3 py-1.5 rounded-xl">
                  -{discount}% OFF
                </div>
              )}
              <button
                onClick={() => {
                  toggleWishlist(product.id);
                  toast(
                    isWishlisted
                      ? "Removed from wishlist"
                      : "Added to wishlist",
                  );
                }}
                className={`absolute top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  isWishlisted
                    ? "bg-pink-500 text-white"
                    : "bg-white text-gray-500 hover:bg-pink-50 hover:text-pink-500"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${isWishlisted ? "fill-white" : ""}`}
                />
              </button>
            </div>

            {/* Details */}
            <div className="p-8 lg:p-10 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold">
                  {product.category}
                </span>
                {product.stock !== undefined && product.stock > 0 ? (
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    <Check className="w-3 h-3" />
                    In Stock
                  </div>
                ) : (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    Out of Stock
                  </span>
                )}
                {product.stock !== undefined &&
                  product.stock < 10 &&
                  product.stock > 0 && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                      Only {product.stock} left!
                    </span>
                  )}
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-gray-900">
                  {product.rating}
                </span>
                <span className="text-gray-400 text-sm">
                  ({product.reviewCount} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="mt-5 flex items-end gap-3">
                <span className="text-4xl font-black text-gray-900">
                  ${price.toFixed(2)}
                </span>
                {originalPrice && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      ${originalPrice.toFixed(2)}
                    </span>
                    <span className="text-green-600 font-semibold text-sm">
                      Save ${(originalPrice - price).toFixed(2)}
                    </span>
                  </>
                )}
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2 flex-wrap mt-4">
                <Tag className="w-4 h-4 text-gray-400" />
                {product.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/catalog?tag=${tag}`}
                    className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-violet-100 hover:text-violet-700 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>

              {/* Quantity */}
              <div className="mt-6">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold text-gray-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity((q) => Math.min(product.stock, q + 1))
                      }
                      className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">
                    {product.stock} in stock
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-violet-600 text-violet-600 font-semibold rounded-xl hover:bg-violet-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="flex-1 py-3.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
                <button
                  onClick={() =>
                    navigator.clipboard
                      .writeText(window.location.href)
                      .then(() => toast.success("Link copied!"))
                  }
                  className="w-12 h-12 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Guarantees */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { icon: Truck, label: "Free Shipping", sub: "Orders $50+" },
                  { icon: ShieldCheck, label: "Secure", sub: "256-bit SSL" },
                  {
                    icon: RefreshCw,
                    label: "30-Day Returns",
                    sub: "No questions",
                  },
                ].map((g, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl text-center"
                  >
                    <g.icon className="w-5 h-5 text-violet-600" />
                    <p className="text-xs font-semibold text-gray-800">
                      {g.label}
                    </p>
                    <p className="text-[10px] text-gray-500">{g.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(["description", "reviews"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 font-semibold text-sm transition-colors capitalize relative ${
                  activeTab === tab
                    ? "text-violet-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab} {tab === "reviews" && `(${reviews.length})`}
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="p-8">
            {activeTab === "description" && (
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 leading-relaxed">
                  {product.description}
                </p>
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Category", value: product.category },
                    { label: "Rating", value: `${product.rating}/5.0` },
                    {
                      label: "Reviews",
                      value: (product.reviewCount || 0).toString(),
                    },
                    { label: "In Stock", value: `${product.stock} units` },
                    { label: "SKU", value: `SN-${product.id.toUpperCase()}` },
                  ].map((item) => (
                    <div key={item.label} className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                        {item.label}
                      </p>
                      <p className="font-semibold text-gray-900 mt-1">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                {/* Rating Summary */}
                <div className="flex items-center gap-8 p-6 bg-gray-50 rounded-2xl mb-6">
                  <div className="text-center">
                    <p className="text-6xl font-black text-gray-900">
                      {product.rating}
                    </p>
                    <div className="flex justify-center gap-0.5 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {product.reviewCount} reviews
                    </p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-6">
                          {star}★
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{
                              width: `${star === 5 ? 65 : star === 4 ? 20 : star === 3 ? 10 : 5}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No reviews yet. Be the first to review!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-5 border border-gray-100 rounded-2xl"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={review.userAvatar}
                            alt={review.userName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-gray-900">
                                {review.userName}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(
                                  review.createdAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-0.5 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
                                />
                              ))}
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              {review.comment}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-black text-gray-900 mb-6">
              Related Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
