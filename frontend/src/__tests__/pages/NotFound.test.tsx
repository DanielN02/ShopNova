import React from "react";
import { render, screen } from "@testing-library/react";
import { NotFound } from "../../app/pages/NotFound";

describe("NotFound Page", () => {
  beforeEach(() => {
    render(<NotFound />);
  });

  it("should render 404 text", () => {
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("should render Page Not Found heading", () => {
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
  });

  it("should render descriptive message", () => {
    expect(screen.getByText(/gone shopping without us/i)).toBeInTheDocument();
  });

  it("should render Go Home link", () => {
    const homeLink = screen.getByText("Go Home");
    expect(homeLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("should render Browse Products link", () => {
    const browseLink = screen.getByText("Browse Products");
    expect(browseLink.closest("a")).toHaveAttribute("href", "/catalog");
  });
});
