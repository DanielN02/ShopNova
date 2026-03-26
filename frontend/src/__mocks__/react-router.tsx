import React from 'react';

const mockNavigate = jest.fn();
const mockLocation = { pathname: '/', search: '', hash: '', state: null, key: 'default' };

export const useNavigate = () => mockNavigate;
export const useLocation = () => mockLocation;
export const useParams = () => ({});
export const useSearchParams = () => [new URLSearchParams(), jest.fn()];

export function Link({ to, children, ...props }: any) {
  return <a href={to} {...props}>{children}</a>;
}

export function Outlet() {
  return <div data-testid="outlet" />;
}

export { mockNavigate, mockLocation };
