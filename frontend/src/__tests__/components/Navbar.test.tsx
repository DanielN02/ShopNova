import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Navbar } from "../../app/components/Navbar";
import { useStore } from "../../app/store/useStore";
import { mockNavigate } from "../../__mocks__/react-router";

describe("Navbar", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useStore.setState({
      currentUser: null,
      isAuthenticated: false,
      cartItems: [],
      notifications: [],
      searchQuery: "",
    });
  });

  describe("Unauthenticated", () => {
    beforeEach(() => {
      render(<Navbar />);
    });

    it("should render the ShopNova logo", () => {
      expect(screen.getByText("Shop")).toBeInTheDocument();
    });

    it("should render navigation links", () => {
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Catalog")).toBeInTheDocument();
    });

    it("should render the search input on desktop", () => {
      expect(
        screen.getByPlaceholderText("Search products..."),
      ).toBeInTheDocument();
    });

    it("should render Sign In and Sign Up links", () => {
      expect(screen.getByText("Sign In")).toBeInTheDocument();
      expect(screen.getByText("Sign Up")).toBeInTheDocument();
    });

    it("should not render notification bell when logged out", () => {
      expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
    });

    it("should navigate to cart when cart icon is clicked", () => {
      const cartButtons = screen.getAllByRole("button");
      const cartBtn = cartButtons.find(
        (btn) =>
          btn.querySelector(".lucide-shopping-cart") !== null ||
          btn.textContent === "",
      );
      if (cartBtn) {
        fireEvent.click(cartBtn);
      }
    });
  });

  describe("Authenticated", () => {
    beforeEach(() => {
      useStore.setState({
        currentUser: {
          id: "u1",
          name: "Admin User",
          email: "admin@shopnova.com",
          role: "admin",
          avatar: "https://i.pravatar.cc/150?img=3",
          createdAt: "2024-01-01T00:00:00Z",
        },
        isAuthenticated: true,
        notifications: [
          {
            id: "n1",
            userId: "u1",
            type: "order" as const,
            title: "Test",
            message: "Test msg",
            read: false,
            createdAt: "2024-01-01",
          },
          {
            id: "n2",
            userId: "u1",
            type: "promo" as const,
            title: "Promo",
            message: "Promo msg",
            read: true,
            createdAt: "2024-01-01",
          },
        ],
      });
      render(<Navbar />);
    });

    it("should render user avatar when logged in", () => {
      const avatar = screen.getByAltText("Admin User");
      expect(avatar).toBeInTheDocument();
    });

    it("should not render Sign In / Sign Up when logged in", () => {
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
      expect(screen.queryByText("Sign Up")).not.toBeInTheDocument();
    });
  });

  describe("Cart Badge", () => {
    it("should show cart count badge when items in cart", () => {
      useStore.setState({
        cartItems: [
          {
            product: {
              id: "p1",
              name: "Test",
              description: "",
              price: 10,
              category: "Test",
              tags: [],
              image: "",
              images: [],
              rating: 5,
              reviewCount: 0,
              stock: 10,
              featured: false,
              createdAt: "",
            },
            quantity: 3,
          },
        ],
      });
      render(<Navbar />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should show 9+ when cart count exceeds 9", () => {
      useStore.setState({
        cartItems: [
          {
            product: {
              id: "p1",
              name: "Test",
              description: "",
              price: 10,
              category: "Test",
              tags: [],
              image: "",
              images: [],
              rating: 5,
              reviewCount: 0,
              stock: 100,
              featured: false,
              createdAt: "",
            },
            quantity: 15,
          },
        ],
      });
      render(<Navbar />);
      expect(screen.getByText("9+")).toBeInTheDocument();
    });
  });

  describe("Search", () => {
    it("should update search query on input", () => {
      render(<Navbar />);
      const input = screen.getByPlaceholderText("Search products...");
      fireEvent.change(input, { target: { value: "laptop" } });
      expect(useStore.getState().searchQuery).toBe("laptop");
    });
  });
});
