import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useStore } from "../../store/useStore";
import CustomerDashboard from "./CustomerDashboard";
import { AdminDashboard } from "./AdminDashboard";

export function Dashboard() {
  const { isAuthenticated, currentUser } = useStore();
  const navigate = useNavigate();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand persist to hydrate
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      navigate("/login");
    }
  }, [isHydrated, isAuthenticated, navigate]);

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) return null;

  return currentUser.role === "admin" ? (
    <AdminDashboard />
  ) : (
    <CustomerDashboard />
  );
}
