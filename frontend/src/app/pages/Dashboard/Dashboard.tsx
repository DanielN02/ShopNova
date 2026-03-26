import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../../store/useStore';
import { CustomerDashboard } from './CustomerDashboard';
import { AdminDashboard } from './AdminDashboard';

export function Dashboard() {
  const { isAuthenticated, currentUser } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !currentUser) return null;

  return currentUser.role === 'admin' ? <AdminDashboard /> : <CustomerDashboard />;
}
