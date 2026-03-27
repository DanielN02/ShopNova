import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function OrderConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    // If no order ID, redirect to home
    if (!orderId) {
      navigate("/");
    }
  }, [orderId, navigate]);

  if (!orderId) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </motion.div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for your purchase. Your order has been confirmed and is being processed.
          </p>

          {/* Order Number */}
          <div className="bg-violet-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Order Number</p>
            <p className="text-xl font-bold text-violet-600">#{orderId}</p>
          </div>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-violet-600" />
              What's Next?
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-violet-600 mt-0.5">•</span>
                <span>You'll receive an email confirmation shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-600 mt-0.5">•</span>
                <span>Track your order status in your dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-600 mt-0.5">•</span>
                <span>Estimated delivery: 3-5 business days</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate("/dashboard/orders")}
              className="w-full px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
            >
              View My Orders
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact us at{" "}
          <a href="mailto:support@shopnova.com" className="text-violet-600 hover:underline">
            support@shopnova.com
          </a>
        </p>
      </motion.div>
    </div>
  );
}
