import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Register } from "../../app/pages/Auth/Register";
import { useStore } from "../../app/store/useStore";
import { mockNavigate } from "../../__mocks__/react-router";

describe("Register Page", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useStore.setState({ currentUser: null, isAuthenticated: false });
    render(<Register />);
  });

  it("should render the page heading", () => {
    expect(screen.getByText("Create your account")).toBeInTheDocument();
  });

  it("should render the subheading", () => {
    expect(screen.getByText(/Join 50,000\+ shoppers/i)).toBeInTheDocument();
  });

  it("should render name input", () => {
    expect(screen.getByPlaceholderText("Jane Cooper")).toBeInTheDocument();
  });

  it("should render email input", () => {
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("should render password input", () => {
    expect(
      screen.getByPlaceholderText("Min. 6 characters"),
    ).toBeInTheDocument();
  });

  it("should render confirm password input", () => {
    expect(
      screen.getByPlaceholderText("Re-enter password"),
    ).toBeInTheDocument();
  });

  it("should render Create Account button", () => {
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("should render Terms of Service checkbox", () => {
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("should render Sign in link", () => {
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("should show error when passwords do not match", async () => {
    fireEvent.change(screen.getByPlaceholderText("Jane Cooper"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Min. 6 characters"), {
      target: { value: "password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
      target: { value: "password2" },
    });
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    fireEvent.submit(screen.getByText("Create Account").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument();
    });
  });

  it("should show error when Terms not agreed", async () => {
    fireEvent.change(screen.getByPlaceholderText("Jane Cooper"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Min. 6 characters"), {
      target: { value: "password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
      target: { value: "password1" },
    });
    fireEvent.submit(screen.getByText("Create Account").closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/agree to the Terms/i)).toBeInTheDocument();
    });
  });

  it("should show error for duplicate email", async () => {
    fireEvent.change(screen.getByPlaceholderText("Jane Cooper"), {
      target: { value: "Admin" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "admin@shopnova.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Min. 6 characters"), {
      target: { value: "password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
      target: { value: "password1" },
    });
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    fireEvent.submit(screen.getByText("Create Account").closest("form")!);
    await waitFor(
      () => {
        expect(screen.getByText(/already in use/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should navigate to dashboard on successful registration", async () => {
    fireEvent.change(screen.getByPlaceholderText("Jane Cooper"), {
      target: { value: "New User" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "newuser@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Min. 6 characters"), {
      target: { value: "password1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter password"), {
      target: { value: "password1" },
    });
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    fireEvent.submit(screen.getByText("Create Account").closest("form")!);
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      },
      { timeout: 3000 },
    );
  });
});
