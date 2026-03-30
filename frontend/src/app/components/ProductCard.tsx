import { Link } from "react-router";
import { Heart, ShoppingCart, Star, Check } from "lucide-react";
import { useStore } from "../store/useStore";
import { toast } from "sonner";
import type { Product } from "../types";
import { motion } from "motion/react";

interface ProductCardProps {
  product: Product;
  view?: "grid" | "list";
}

export function ProductCard({ product, view = "grid" }: ProductCardProps) {
  const { addToCart, toggleWishlist, wishlist } = useStore();
  const isWishlisted = wishlist.includes(product.id);

  // Ensure prices are numbers
  const price =
    typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price;
  const originalPrice = product.originalPrice
    ? typeof product.originalPrice === "string"
      ? parseFloat(product.originalPrice)
      : product.originalPrice
    : null;

  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleWishlist(product.id);
    toast(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
  };

  if (view === "list") {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
      >
        <Link to={`/product/${product.id}`} className="flex gap-4 p-4">
          <div className="relative w-32 h-32 shrink-0 rounded-xl overflow-hidden bg-gray-50">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {discount > 0 && (
              <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                -{discount}%
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-violet-600 font-medium">
              {product.category}
            </p>
            <h3 className="font-semibold text-gray-900 mt-0.5 truncate">
              {product.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {product.description}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-gray-700">
                {product.rating}
              </span>
              <span className="text-xs text-gray-400">
                ({product.reviewCount})
              </span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">
                  ${price.toFixed(2)}
                </span>
                {originalPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    ${originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleWishlist}
                  className={`p-2 rounded-lg border ${isWishlisted ? "border-pink-200 bg-pink-50 text-pink-500" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <Heart
                    className={`w-4 h-4 ${isWishlisted ? "fill-pink-500" : ""}`}
                  />
                </button>
                <button
                  onClick={handleAddToCart}
                  className="flex items-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {discount > 0 && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
              -{discount}%
            </span>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
            <button
              onClick={handleWishlist}
              className={`w-9 h-9 rounded-full shadow-lg flex items-center justify-center ${
                isWishlisted
                  ? "bg-pink-500 text-white"
                  : "bg-white text-gray-700"
              } hover:scale-110 transition-transform`}
            >
              <Heart
                className={`w-4 h-4 ${isWishlisted ? "fill-white" : ""}`}
              />
            </button>
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-full shadow-lg hover:bg-violet-700 hover:scale-105 transition-all"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Add to Cart
            </button>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-violet-600 font-medium">
            {product.category}
          </p>
          <h3 className="font-semibold text-gray-900 mt-0.5 truncate">
            {product.name}
          </h3>
          <div className="flex items-center gap-1 mt-1.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${i < Math.floor(product.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">
              ({product.reviewCount})
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="font-bold text-gray-900">
                ${price.toFixed(2)}
              </span>
              {originalPrice && (
                <span className="text-sm text-gray-400 line-through ml-2">
                  ${originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
