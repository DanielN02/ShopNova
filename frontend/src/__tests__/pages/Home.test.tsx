import React from "react";
import { render, screen } from "@testing-library/react";
import { Home } from "../../app/pages/Home";
import { mockNavigate } from "../../__mocks__/react-router";

describe("Home Page", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    render(<Home />);
  });

  it("should render the hero section", () => {
    expect(screen.getByText(/Shop Smarter,/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Better/i)).toBeInTheDocument();
  });

  it("should render the hero description", () => {
    expect(
      screen.getByText(/Discover thousands of premium products/i),
    ).toBeInTheDocument();
  });

  it("should render Shop Now button", () => {
    expect(screen.getByText("Shop Now")).toBeInTheDocument();
  });

  it("should render View Deals button", () => {
    expect(screen.getByText("View Deals")).toBeInTheDocument();
  });

  it("should render feature cards", () => {
    expect(screen.getByText("Free Shipping")).toBeInTheDocument();
    expect(screen.getByText("Secure Payments")).toBeInTheDocument();
    expect(screen.getByText("Easy Returns")).toBeInTheDocument();
    expect(screen.getByText("24/7 Support")).toBeInTheDocument();
  });

  it("should render feature descriptions", () => {
    expect(screen.getByText("On orders over $50")).toBeInTheDocument();
    expect(screen.getByText("256-bit SSL encryption")).toBeInTheDocument();
    expect(screen.getByText("30-day hassle-free returns")).toBeInTheDocument();
  });

  it("should render Categories section", () => {
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getAllByText("Electronics").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fashion").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sports").length).toBeGreaterThan(0);
  });

  it("should render Featured Products section", () => {
    expect(screen.getByText("Featured Products")).toBeInTheDocument();
  });

  it("should render Trending Now section", () => {
    expect(screen.getByText("Trending Now")).toBeInTheDocument();
  });

  it("should render the promo banner", () => {
    expect(screen.getByText(/Up to 40% Off/i)).toBeInTheDocument();
    expect(screen.getByText("Shop Electronics")).toBeInTheDocument();
  });

  it("should render Load More Products link", () => {
    expect(screen.getByText("Load More Products")).toBeInTheDocument();
  });

  it("should render the new arrivals badge", () => {
    expect(screen.getByText(/New Arrivals/i)).toBeInTheDocument();
  });
});
