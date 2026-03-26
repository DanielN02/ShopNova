import React from 'react';

export const toast = Object.assign(jest.fn(), {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
});

export function Toaster() {
  return <div data-testid="toaster" />;
}
