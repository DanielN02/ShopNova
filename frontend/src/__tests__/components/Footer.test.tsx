import React from "react";
import { render, screen } from "@testing-library/react";
import { Footer } from "../../app/components/Footer";

describe("Footer", () => {
  beforeEach(() => {
    render(<Footer />);
  });

  it("should render the ShopNova brand name", () => {
    expect(screen.getByText("Shop")).toBeInTheDocument();
    expect(screen.getByText("Nova")).toBeInTheDocument();
  });

  it("should render the brand description", () => {
    expect(screen.getByText(/Your one-stop destination/i)).toBeInTheDocument();
  });

  it("should render Quick Links section", () => {
    expect(screen.getByText("Quick Links")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Product Catalog")).toBeInTheDocument();
    expect(screen.getByText("My Account")).toBeInTheDocument();
    expect(screen.getByText("Shopping Cart")).toBeInTheDocument();
  });

  it("should render Categories section", () => {
    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Fashion")).toBeInTheDocument();
    expect(screen.getByText("Sports")).toBeInTheDocument();
  });

  it("should render Contact Us section", () => {
    expect(screen.getByText("Contact Us")).toBeInTheDocument();
    expect(screen.getByText(/123 Commerce Ave/i)).toBeInTheDocument();
    expect(screen.getByText(/support@shopnova.com/i)).toBeInTheDocument();
  });

  it("should render the newsletter input", () => {
    expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("should render the copyright notice", () => {
    expect(screen.getByText(/© 2026 ShopNova/i)).toBeInTheDocument();
  });

  it("should render legal links", () => {
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Cookie Policy")).toBeInTheDocument();
  });

  it("should render category links with correct hrefs", () => {
    const electronicsLink = screen.getByRole("link", { name: "Electronics" });
    expect(electronicsLink).toHaveAttribute(
      "href",
      "/catalog?category=Electronics",
    );
  });

  it("should render navigation links with correct hrefs", () => {
    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).toHaveAttribute("href", "/");
    const catalogLink = screen.getByRole("link", { name: "Product Catalog" });
    expect(catalogLink).toHaveAttribute("href", "/catalog");
  });
});
