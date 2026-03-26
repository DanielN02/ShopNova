import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Cart } from "../../app/pages/Cart";
import { useStore } from "../../app/store/useStore";
import { MOCK_PRODUCTS } from "../../app/data/mockData";
import { mockNavigate } from "../../__mocks__/react-router";

describe("Cart Page", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe("Empty Cart", () => {
    beforeEach(() => {
      useStore.setState({ cartItems: [] });
      render(<Cart />);
    });

    it("should show empty cart message", () => {
      expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    });

    it("should show a helpful description", () => {
      expect(
        screen.getByText(/haven't added anything yet/i),
      ).toBeInTheDocument();
    });

    it("should show Browse Products link", () => {
      expect(screen.getByText("Browse Products")).toBeInTheDocument();
    });
  });

  describe("Cart with Items", () => {
    const product = MOCK_PRODUCTS[0];

    beforeEach(() => {
      useStore.setState({
        cartItems: [{ product, quantity: 2 }],
      });
      render(<Cart />);
    });

    it("should render the cart heading with item count", () => {
      expect(screen.getByText("Shopping Cart")).toBeInTheDocument();
      expect(screen.getByText("(2 items)")).toBeInTheDocument();
    });

    it("should render the product name", () => {
      expect(screen.getAllByText(product.name).length).toBeGreaterThan(0);
    });

    it("should render the product category", () => {
      expect(screen.getByText(product.category)).toBeInTheDocument();
    });

    it("should render the item total price", () => {
      expect(
        screen.getAllByText(`$${(product.price * 2).toFixed(2)}`).length,
      ).toBeGreaterThan(0);
    });

    it("should render per-item price", () => {
      expect(
        screen.getByText(`$${product.price.toFixed(2)} each`),
      ).toBeInTheDocument();
    });

    it("should render quantity display", () => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should render Order Summary section", () => {
      expect(screen.getByText("Order Summary")).toBeInTheDocument();
      expect(screen.getByText("Subtotal")).toBeInTheDocument();
      expect(screen.getByText("Tax (8%)")).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
    });

    it("should render Promo Code section", () => {
      expect(screen.getByText("Promo Code")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter code")).toBeInTheDocument();
      expect(screen.getByText("Apply")).toBeInTheDocument();
    });

    it("should render Continue Shopping link", () => {
      expect(screen.getByText(/Continue Shopping/)).toBeInTheDocument();
    });

    it("should render Proceed to Checkout button", () => {
      expect(screen.getByText("Proceed to Checkout")).toBeInTheDocument();
    });

    it("should render Clear Cart button", () => {
      expect(screen.getByText("Clear Cart")).toBeInTheDocument();
    });

    it("should render promo code hints", () => {
      expect(
        screen.getByText(/FLASH30, SAVE10, or NOVA15/i),
      ).toBeInTheDocument();
    });

    it("should render payment method badges", () => {
      expect(screen.getByText("visa")).toBeInTheDocument();
      expect(screen.getByText("mc")).toBeInTheDocument();
      expect(screen.getByText("paypal")).toBeInTheDocument();
    });
  });

  describe("Promo Code", () => {
    beforeEach(() => {
      useStore.setState({
        cartItems: [{ product: MOCK_PRODUCTS[0], quantity: 1 }],
      });
      render(<Cart />);
    });

    it("should apply a valid promo code", () => {
      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "FLASH30" } });
      fireEvent.click(screen.getByText("Apply"));
      expect(
        screen.getByText(/FLASH30 — 30% off applied!/),
      ).toBeInTheDocument();
    });

    it("should show error for invalid promo code", () => {
      const input = screen.getByPlaceholderText("Enter code");
      fireEvent.change(input, { target: { value: "INVALID" } });
      fireEvent.click(screen.getByText("Apply"));
      expect(screen.getByText(/Invalid promo code/)).toBeInTheDocument();
    });
  });

  describe("Shipping", () => {
    it("should show free shipping for orders over $50", () => {
      useStore.setState({
        cartItems: [{ product: MOCK_PRODUCTS[0], quantity: 1 }],
      });
      render(<Cart />);
      expect(screen.getByText("FREE")).toBeInTheDocument();
    });

    it("should show shipping cost for orders under $50", () => {
      const cheapProduct = { ...MOCK_PRODUCTS[0], price: 10 };
      useStore.setState({
        cartItems: [{ product: cheapProduct, quantity: 1 }],
      });
      render(<Cart />);
      expect(screen.getByText("$9.99")).toBeInTheDocument();
    });
  });
});
