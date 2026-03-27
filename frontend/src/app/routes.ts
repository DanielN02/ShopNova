import { createBrowserRouter } from 'react-router';
import { lazy } from 'react';
import { Layout } from './components/Layout';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const ProductCatalog = lazy(() => import('./pages/ProductCatalog').then(m => ({ default: m.ProductCatalog })));
const ProductDetails = lazy(() => import('./pages/ProductDetails').then(m => ({ default: m.ProductDetails })));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation').then(m => ({ default: m.OrderConfirmation })));
const Login = lazy(() => import('./pages/Auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth/Register').then(m => ({ default: m.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'catalog', Component: ProductCatalog },
      { path: 'product/:id', Component: ProductDetails },
      { path: 'cart', Component: Cart },
      { path: 'checkout', Component: Checkout },
      { path: 'order-confirmation', Component: OrderConfirmation },
      { path: 'login', Component: Login },
      { path: 'register', Component: Register },
      { path: 'dashboard', Component: Dashboard },
      { path: 'dashboard/:section', Component: Dashboard },
      { path: '*', Component: NotFound },
    ],
  },
]);
