import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductCard } from "../../app/components/ProductCard";
import { useStore } from "../../app/store/useStore";
import { MOCK_PRODUCTS } from "../../app/data/mockData";

const product = MOCK_PRODUCTS[0];

describe("ProductCard", () => {
  beforeEach(() => {
    useStore.setState({ cartItems: [], wishlist: [] });
  });

  describe("Grid View (default)", () => {
    beforeEach(() => {
      render(<ProductCard product={product} />);
    });

    it("should render the product name", () => {
      expect(screen.getByText(product.name)).toBeInTheDocument();
    });

    it("should render the product category", () => {
      expect(screen.getByText(product.category)).toBeInTheDocument();
    });

    it("should render the product price", () => {
      expect(
        screen.getByText(`$${product.price.toFixed(2)}`),
      ).toBeInTheDocument();
    });

    it("should render the original price if discounted", () => {
      if (product.originalPrice) {
        expect(
          screen.getByText(`$${product.originalPrice.toFixed(2)}`),
        ).toBeInTheDocument();
      }
    });

    it("should render discount badge when product is on sale", () => {
      if (product.originalPrice) {
        const discount = Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        );
        expect(screen.getByText(`-${discount}%`)).toBeInTheDocument();
      }
    });

    it("should render star ratings", () => {
      expect(screen.getByText(`(${product.reviewCount})`)).toBeInTheDocument();
    });

    it("should render the product image", () => {
      const img = screen.getByAltText(product.name);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", product.image);
    });

    it("should link to the product detail page", () => {
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", `/product/${product.id}`);
    });
  });

  describe("List View", () => {
    it("should render the product description in list view", () => {
      render(<ProductCard product={product} view="list" />);
      expect(screen.getByText(product.description)).toBeInTheDocument();
    });

    it("should render Add to Cart button in list view", () => {
      render(<ProductCard product={product} view="list" />);
      expect(screen.getByText("Add to Cart")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should add product to cart when Add to Cart is clicked", () => {
      render(<ProductCard product={product} view="list" />);
      const addBtn = screen.getByText("Add to Cart");
      fireEvent.click(addBtn);
      expect(useStore.getState().cartItems).toHaveLength(1);
      expect(useStore.getState().cartItems[0].product.id).toBe(product.id);
    });

    it("should toggle wishlist when heart button is clicked", () => {
      render(<ProductCard product={product} view="list" />);
      const buttons = screen.getAllByRole("button");
      const heartBtn = buttons[0];
      fireEvent.click(heartBtn);
      expect(useStore.getState().wishlist).toContain(product.id);
      fireEvent.click(heartBtn);
      expect(useStore.getState().wishlist).not.toContain(product.id);
    });
  });

  describe("Edge Cases", () => {
    it("should show Out of Stock for zero stock products", () => {
      const outOfStock = { ...product, stock: 0 };
      render(<ProductCard product={outOfStock} />);
      expect(screen.getByText("Out of Stock")).toBeInTheDocument();
    });

    it("should show Low Stock badge for products with stock < 10", () => {
      const lowStock = { ...product, stock: 5 };
      render(<ProductCard product={lowStock} />);
      expect(screen.getByText("Low Stock")).toBeInTheDocument();
    });

    it("should not show discount badge when no originalPrice", () => {
      const noDiscount = { ...product, originalPrice: undefined };
      render(<ProductCard product={noDiscount} />);
      expect(screen.queryByText(/-%/)).not.toBeInTheDocument();
    });
  });
});
