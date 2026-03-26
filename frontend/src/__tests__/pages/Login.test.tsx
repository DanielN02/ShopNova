import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Login } from "../../app/pages/Auth/Login";
import { useStore } from "../../app/store/useStore";
import { mockNavigate } from "../../__mocks__/react-router";

describe("Login Page", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useStore.setState({ currentUser: null, isAuthenticated: false });
    render(<Login />);
  });

  it("should render the ShopNova brand", () => {
    expect(screen.getByText("Shop")).toBeInTheDocument();
  });

  it("should render Welcome back heading", () => {
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("should render email input", () => {
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("should render password input", () => {
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("should render Sign In button", () => {
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("should render Sign up link", () => {
    expect(screen.getByText("Sign up for free")).toBeInTheDocument();
  });

  it("should render quick demo login buttons", () => {
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Customer/)).toBeInTheDocument();
  });

  it("should render Forgot password link", () => {
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });

  it("should fill admin credentials on quick login click", () => {
    const adminBtn = screen.getByText(/Admin/);
    fireEvent.click(adminBtn);
    const emailInput = screen.getByPlaceholderText(
      "you@example.com",
    ) as HTMLInputElement;
    expect(emailInput.value).toBe("admin@shopnova.com");
  });

  it("should fill customer credentials on quick login click", () => {
    const customerBtn = screen.getByText(/Customer/);
    fireEvent.click(customerBtn);
    const emailInput = screen.getByPlaceholderText(
      "you@example.com",
    ) as HTMLInputElement;
    expect(emailInput.value).toBe("jane@example.com");
  });

  it("should toggle password visibility", () => {
    const passwordInput = screen.getByPlaceholderText(
      "••••••••",
    ) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");
    const toggleButtons = screen.getAllByRole("button");
    const toggleBtn = toggleButtons.find(
      (btn) => btn.querySelector("svg") && btn.closest(".relative"),
    );
    if (toggleBtn) {
      fireEvent.click(toggleBtn);
    }
  });

  it("should show error for invalid login", async () => {
    const emailInput = screen.getByPlaceholderText("you@example.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(emailInput, { target: { value: "wrong@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await waitFor(
      () => {
        expect(
          screen.getByText(/Invalid email or password/i),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("should navigate to dashboard on successful login", async () => {
    const emailInput = screen.getByPlaceholderText("you@example.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(emailInput, { target: { value: "admin@shopnova.com" } });
    fireEvent.change(passwordInput, { target: { value: "admin123" } });
    fireEvent.submit(screen.getByText("Sign In").closest("form")!);
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      },
      { timeout: 2000 },
    );
  });
});
