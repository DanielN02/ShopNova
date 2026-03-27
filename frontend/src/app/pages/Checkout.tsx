import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import {
  CreditCard,
  Lock,
  CheckCircle,
  Package,
  Truck,
  MapPin,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

type Step = "shipping" | "payment" | "review" | "confirmation";

interface ShippingForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface PaymentForm {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "shipping", label: "Shipping", icon: MapPin },
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "review", label: "Review", icon: Package },
];

export function Checkout() {
  const navigate = useNavigate();
  const {
    cartItems,
    cartTotal,
    clearCart,
    currentUser,
    createOrder,
    ordersLoading,
  } = useStore();
  const [step, setStep] = useState<Step>("shipping");
  const [shippingData, setShippingData] = useState<ShippingForm | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");
  const [orderError, setOrderError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const shippingForm = useForm<ShippingForm>({
    defaultValues: {
      firstName: currentUser?.name ? currentUser.name.split(" ")[0] : "",
      lastName: currentUser?.name
        ? currentUser.name.split(" ").slice(1).join(" ")
        : "",
      email: currentUser?.email || "",
    },
  });
  const paymentForm = useForm<PaymentForm>({
    defaultValues: {
      cardNumber: "4242 4242 4242 4242",
      expiry: "12/28",
      cvv: "123",
      cardName: currentUser?.name || "",
    },
  });

  // Helper function to safely get price as number
  const getPrice = (product: any) => {
    return typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price;
  };

  const subtotal = cartItems.reduce(
    (acc, item) => acc + getPrice(item.product) * item.quantity,
    0,
  );
  const shipping = subtotal >= 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + tax + shipping;

  const currentStepIdx = ["shipping", "payment", "review"].indexOf(step);

  const onShippingSubmit = (data: ShippingForm) => {
    setShippingData(data);
    setStep("payment");
  };

  const onPaymentSubmit = () => {
    setStep("review");
  };

  const placeOrder = async () => {
    setOrderError("");
    const orderItems = cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
      productName: item.product.name,
    }));

    const shippingAddress: Record<string, string> = shippingData
      ? {
          street: shippingData.street,
          city: shippingData.city,
          state: shippingData.state,
          zip: shippingData.zip,
          country: shippingData.country,
        }
      : {};

    const result = await createOrder({
      items: orderItems,
      shippingAddress,
      paymentMethod: paymentMethod === "card" ? "Visa **** 4242" : "PayPal",
    });

    if (result.success) {
      const orderId = (result.order?.id ||
        result.order?.order_number ||
        result.order?.orderNumber ||
        `ORD-${Math.floor(Math.random() * 90000) + 10000}`) as string;
      clearCart();
      toast.success("Order placed successfully!");
      navigate(`/order-confirmation?orderId=${orderId}`);
    } else {
      setOrderError(result.error || "Failed to place order");
      toast.error(result.error || "Failed to place order");
    }
  };

  if (cartItems.length === 0 && step !== "confirmation") {
    navigate("/cart");
    return null;
  }

  if (step === "confirmation") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 max-w-lg w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-green-500" />
          </motion.div>
          <h2 className="text-3xl font-black text-gray-900">Order Placed!</h2>
          <p className="text-gray-500 mt-3">
            Thank you for your purchase! Your order{" "}
            <strong>#{orderNumber}</strong> has been confirmed and is being
            processed.
          </p>
          <div className="mt-6 p-4 bg-gray-50 rounded-2xl text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Charged</span>
              <span className="font-bold text-gray-900">
                ${total.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated Delivery</span>
              <span className="font-semibold text-gray-900">
                3-5 Business Days
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Confirmation Email</span>
              <span className="font-semibold text-gray-900">
                {shippingData?.email || currentUser?.email}
              </span>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => navigate("/dashboard/orders")}
              className="w-full py-3.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors"
            >
              Track Your Order
            </button>
            <button
              onClick={() => navigate("/catalog")}
              className="w-full py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-black text-gray-900 mb-8">Checkout</h1>

        {/* Step Progress */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className="flex items-center flex-1 last:flex-none"
            >
              <div
                className={`flex items-center gap-2 ${currentStepIdx >= i ? "text-violet-600" : "text-gray-300"}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    currentStepIdx > i
                      ? "bg-violet-600 border-violet-600"
                      : currentStepIdx === i
                        ? "border-violet-600 bg-violet-50"
                        : "border-gray-200 bg-white"
                  }`}
                >
                  {currentStepIdx > i ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <s.icon
                      className={`w-4 h-4 ${currentStepIdx === i ? "text-violet-600" : "text-gray-300"}`}
                    />
                  )}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${currentStepIdx >= i ? "text-gray-900" : "text-gray-400"}`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 rounded-full ${currentStepIdx > i ? "bg-violet-600" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === "shipping" && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
                >
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
                    <MapPin className="w-5 h-5 text-violet-600" /> Shipping
                    Information
                  </h2>
                  <form
                    onSubmit={shippingForm.handleSubmit(onShippingSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          {...shippingForm.register("firstName", {
                            required: true,
                          })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          {...shippingForm.register("lastName", {
                            required: true,
                          })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        {...shippingForm.register("email", { required: true })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        {...shippingForm.register("phone")}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address
                      </label>
                      <input
                        {...shippingForm.register("street", { required: true })}
                        placeholder="123 Main St"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          {...shippingForm.register("city", { required: true })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <input
                          {...shippingForm.register("state", {
                            required: true,
                          })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code
                        </label>
                        <input
                          {...shippingForm.register("zip", { required: true })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        <select
                          {...shippingForm.register("country", {
                            required: true,
                          })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="USA">United States</option>
                          <option value="CA">Canada</option>
                          <option value="UK">United Kingdom</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors"
                    >
                      Continue to Payment
                    </button>
                  </form>
                </motion.div>
              )}

              {step === "payment" && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
                >
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
                    <CreditCard className="w-5 h-5 text-violet-600" /> Payment
                    Method
                  </h2>

                  {/* Method Selector */}
                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 rounded-xl text-sm font-medium transition-all ${
                        paymentMethod === "card"
                          ? "border-violet-600 bg-violet-50 text-violet-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" /> Credit / Debit Card
                    </button>
                    <button
                      onClick={() => setPaymentMethod("paypal")}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 rounded-xl text-sm font-medium transition-all ${
                        paymentMethod === "paypal"
                          ? "border-violet-600 bg-violet-50 text-violet-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-black text-blue-600">Pay</span>
                      <span className="font-black text-blue-400">Pal</span>
                    </button>
                  </div>

                  {paymentMethod === "card" ? (
                    <form
                      onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cardholder Name
                        </label>
                        <input
                          {...paymentForm.register("cardName", {
                            required: true,
                          })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Card Number
                        </label>
                        <div className="relative">
                          <input
                            {...paymentForm.register("cardNumber", {
                              required: true,
                            })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 pr-12"
                          />
                          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Use 4242 4242 4242 4242 for testing
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiry Date
                          </label>
                          <input
                            {...paymentForm.register("expiry", {
                              required: true,
                            })}
                            placeholder="MM/YY"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CVV
                          </label>
                          <input
                            {...paymentForm.register("cvv", { required: true })}
                            placeholder="123"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                        <Lock className="w-3.5 h-3.5 text-green-500" />
                        Your payment information is encrypted and secure
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setStep("shipping")}
                          className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors"
                        >
                          Review Order
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl font-black text-blue-600">
                          P
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-6">
                        You will be redirected to PayPal to complete payment.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setStep("shipping")}
                          className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => setStep("review")}
                          className="flex-1 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                          Continue with PayPal
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {step === "review" && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Shipping Summary */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-violet-600" /> Shipping
                        To
                      </h3>
                      <button
                        onClick={() => setStep("shipping")}
                        className="text-xs text-violet-600 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    {shippingData && (
                      <p className="text-sm text-gray-600">
                        {shippingData.firstName} {shippingData.lastName} -{" "}
                        {shippingData.street}, {shippingData.city},{" "}
                        {shippingData.state} {shippingData.zip}
                      </p>
                    )}
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-violet-600" />{" "}
                        Payment
                      </h3>
                      <button
                        onClick={() => setStep("payment")}
                        className="text-xs text-violet-600 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      {paymentMethod === "card" ? "Visa **** 4242" : "PayPal"}
                    </p>
                  </div>

                  {/* Order Items */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Items ({cartItems.length})
                    </h3>
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex gap-3 items-center"
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-12 h-12 rounded-lg object-cover bg-gray-50"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm">
                            $
                            {(getPrice(item.product) * item.quantity).toFixed(
                              2,
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {orderError && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                      {orderError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep("payment")}
                      className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={placeOrder}
                      disabled={ordersLoading}
                      className="flex-1 py-3.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-75 flex items-center justify-center gap-2"
                    >
                      {ordersLoading ? (
                        <>
                          <svg
                            className="animate-spin w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="opacity-25"
                            />
                            <path
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              className="opacity-75"
                            />
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" /> Place Order - $
                          {total.toFixed(2)}
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
              <h3 className="font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>
              <div className="space-y-2 mb-4">
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-600 truncate flex-1 pr-2">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="text-gray-900 shrink-0">
                      ${(getPrice(item.product) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
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
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
