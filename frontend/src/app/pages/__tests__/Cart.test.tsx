import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import { Cart } from '../Cart';
import { useStore } from '../../store/useStore';
import type { Product } from '../../types';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock motion/react to render plain elements
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      return ({ children, initial, animate, exit, whileHover, whileTap, layout, ...rest }: any) => {
        const Tag = prop as string;
        return <Tag {...rest}>{children}</Tag>;
      };
    },
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Test Widget',
  description: 'A test product',
  price: 29.99,
  category: 'Electronics',
  tags: ['test'],
  image: 'https://example.com/img.jpg',
  images: ['https://example.com/img.jpg'],
  rating: 4.5,
  reviewCount: 10,
  stock: 50,
  featured: false,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('Cart Page', () => {
  beforeEach(() => {
    useStore.setState({ cartItems: [], wishlist: [], currentUser: null, isAuthenticated: false });
  });

  it('should render empty cart message when cart is empty', () => {
    render(<Cart />);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('should render browse products link when cart is empty', () => {
    render(<Cart />);
    expect(screen.getByText(/Browse Products/i)).toBeInTheDocument();
  });

  it('should render cart items when cart has products', () => {
    useStore.setState({
      cartItems: [
        { product: makeProduct({ id: 'p1', name: 'Widget A', price: 19.99 }), quantity: 2 },
        { product: makeProduct({ id: 'p2', name: 'Widget B', price: 39.99 }), quantity: 1 },
      ],
    });
    render(<Cart />);
    expect(screen.getByText('Widget A')).toBeInTheDocument();
    expect(screen.getByText('Widget B')).toBeInTheDocument();
  });

  it('should display the Shopping Cart heading with item count', () => {
    useStore.setState({
      cartItems: [
        { product: makeProduct({ id: 'p1' }), quantity: 3 },
      ],
    });
    render(<Cart />);
    expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
    expect(screen.getByText('(3 items)')).toBeInTheDocument();
  });

  it('should show product price', () => {
    useStore.setState({
      cartItems: [
        { product: makeProduct({ id: 'p1', price: 29.99 }), quantity: 1 },
      ],
    });
    render(<Cart />);
    expect(screen.getByText('$29.99 each')).toBeInTheDocument();
  });

  it('should show the Order Summary section', () => {
    useStore.setState({
      cartItems: [
        { product: makeProduct({ id: 'p1', price: 10 }), quantity: 1 },
      ],
    });
    render(<Cart />);
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
  });
});
