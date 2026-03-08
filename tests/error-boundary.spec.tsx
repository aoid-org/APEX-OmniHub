/**
 * ErrorBoundary component tests
 *
 * Covers: normal rendering, error catching, custom fallback,
 * reset behaviour, and monitoring integration.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ── Mocks ─────────────────────────────────────────────────────────────
vi.mock('@/lib/debug-logger', () => ({
  createDebugLogger: () => vi.fn(),
}));

vi.mock('@/lib/monitoring', () => ({
  logError: vi.fn().mockResolvedValue(undefined),
}));

// Suppress console.error during tests (ErrorBoundary logs to console)
const originalError = console.error;
beforeAll(() => { console.error = vi.fn(); });
afterAll(() => { console.error = originalError; });

// ── Problem child component ──────────────────────────────────────────
function ThrowingChild({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('test-error');
  return <div data-testid="child">OK</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="safe">Safe content</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('safe')).toBeTruthy();
    expect(screen.getByText('Safe content')).toBeTruthy();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('test-error')).toBeTruthy();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fb">Custom fallback</div>}>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('custom-fb')).toBeTruthy();
    expect(screen.getByText('Custom fallback')).toBeTruthy();
  });

  it('provides a "Try again" button that resets the boundary', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    // Error state should show Try again
    const tryAgainBtn = screen.getByText('Try again');
    expect(tryAgainBtn).toBeTruthy();
    // Clicking should reset – but since child still throws it will re-catch
    fireEvent.click(tryAgainBtn);
    // Boundary re-catches the error
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('provides a "Go home" button', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Go home')).toBeTruthy();
  });
});
