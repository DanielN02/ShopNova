import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../../test/utils';
import { Login } from '../Login';

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
      // Return a forwardRef component that renders the HTML element
      return ({ children, initial, animate, exit, whileHover, whileTap, ...rest }: any) => {
        const Tag = prop as string;
        return <Tag {...rest}>{children}</Tag>;
      };
    },
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Login Page', () => {
  it('should render the login form', () => {
    render(<Login />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to continue shopping')).toBeInTheDocument();
  });

  it('should render email and password inputs', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('should render the sign in button', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('should render the email label', () => {
    render(<Login />);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('should render the password label', () => {
    render(<Login />);
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('should render the sign up link', () => {
    render(<Login />);
    expect(screen.getByText('Sign up for free')).toBeInTheDocument();
  });

  it('should render quick demo login buttons', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Customer/i })).toBeInTheDocument();
  });
});
