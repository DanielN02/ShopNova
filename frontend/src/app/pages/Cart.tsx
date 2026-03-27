import { Link, useNavigate } from "react-router";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Tag,
  X,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

const PROMO_CODES: Record<string, number> = {
  FLASH30: 0.3,
  SAVE10: 0.1,
  NOVA15: 0.15,
};

export function Cart() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal } =
    useStore();
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState("");

  // Helper function to safely get price as number
  const getPrice = (product: any) => {
    return typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price;
  };

  const subtotal = cartTotal();
  const shipping = subtotal >= 50 ? 0 : 9.99;
  const discountAmount = appliedPromo ? subtotal * appliedPromo.discount : 0;
  const tax = (subtotal - discountAmount) * 0.08;
  const total = subtotal - discountAmount + tax + shipping;

  const applyPromo = () => {
    const code = promoCode.toUpperCase();
    if (PROMO_CODES[code]) {
      setAppliedPromo({ code, discount: PROMO_CODES[code] });
      setPromoError("");
      toast.success(
        `Promo code "${code}" applied! ${Math.round(PROMO_CODES[code] * 100)}% off`,
      );
    } else {
      setPromoError("Invalid promo code. Try FLASH30, SAVE10, or NOVA15");
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-violet-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mt-2">
            Looks like you haven't added anything yet. Let's change that!
          </p>
          <Link
            to="/catalog"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 bg-violet-600 text-white font-semibold rounded-full hover:bg-violet-700 transition-colors"
          >
            Browse Products <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-gray-900">
            Shopping Cart
            <span className="ml-2 text-lg font-normal text-gray-400">
              ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)
            </span>
          </h1>
          <button
            onClick={() => {
              clearCart();
              toast("Cart cleared");
            }}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-5"
                >
                  <Link to={`/product/${item.product.id}`} className="shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-24 h-24 rounded-xl object-cover bg-gray-50"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-violet-600 font-medium">
                          {item.product.category}
                        </p>
                        <Link to={`/product/${item.product.id}`}>
                          <h3 className="font-semibold text-gray-900 hover:text-violet-600 transition-colors">
                            {item.product.name}
                          </h3>
                        </Link>
                      </div>
                      <button
                        onClick={() => {
                          removeFromCart(item.product.id);
                          toast("Item removed");
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors"
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          ${(getPrice(item.product) * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">
                          ${getPrice(item.product).toFixed(2)} each
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <Link
              to="/catalog"
              className="flex items-center gap-2 text-sm text-violet-600 font-medium hover:text-violet-700 mt-4"
            >
              ← Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            {/* Promo Code */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-violet-600" /> Promo Code
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoError("");
                  }}
                  placeholder="Enter code"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={applyPromo}
                  className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
                >
                  Apply
                </button>
              </div>
              {promoError && (
                <p className="text-red-500 text-xs mt-2">{promoError}</p>
              )}
              {appliedPromo && (
                <div className="flex items-center justify-between mt-2 px-3 py-2 bg-green-50 rounded-lg">
                  <span className="text-green-700 text-sm font-medium">
                    {appliedPromo.code} —{" "}
                    {Math.round(appliedPromo.discount * 100)}% off applied!
                  </span>
                  <button
                    onClick={() => setAppliedPromo(null)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Try: FLASH30, SAVE10, or NOVA15
              </p>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span
                    className={
                      shipping === 0 ? "text-green-600 font-medium" : ""
                    }
                  >
                    {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-xl">${total.toFixed(2)}</span>
                </div>
              </div>

              {shipping > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                  Add ${(50 - subtotal).toFixed(2)} more for FREE shipping!
                </div>
              )}

              <button
                onClick={() => navigate("/checkout")}
                className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors shadow-lg"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>

              <div className="mt-4 flex justify-center gap-3 opacity-60">
                {["visa", "mc", "amex", "paypal"].map((method) => (
                  <div
                    key={method}
                    className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-500 uppercase"
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
