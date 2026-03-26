import React from "react";
import { render, screen } from "@testing-library/react";
import { Layout } from "../../app/components/Layout";

describe("Layout", () => {
  it("should render Navbar, Outlet, and Footer", () => {
    render(<Layout />);
    expect(screen.getAllByText("Shop").length).toBeGreaterThan(0);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.getByText(/ 2026 ShopNova/i)).toBeInTheDocument();
  });

  it("should render the Toaster for notifications", () => {
    render(<Layout />);
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });
});
