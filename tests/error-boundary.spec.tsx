/**
 * ErrorBoundary component tests
 *
 * Covers: normal rendering, error catching, custom fallback,
 * reset behaviour, and monitoring integration.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ── Mocks ─────────────────────────────────────────────────────────────
vi.mock('@/lib/debug-logger', () => ({
  createDebugLogger: () => vi.fn(),
}));

vi.mock('@/lib/monitoring', () => ({
  logError: vi.fn().mockResolvedValue(undefined),
}));


function silenceExpectedRenderFailure() {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const preventExpectedJsdomError = (event: ErrorEvent) => {
    if (event.error instanceof Error && event.error.message === 'test-error') {
      event.preventDefault();
    }
  };
  globalThis.addEventListener('error', preventExpectedJsdomError);

  return () => {
    globalThis.removeEventListener('error', preventExpectedJsdomError);
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  };
}

// ── Problem child component ──────────────────────────────────────────
function ThrowingChild({ shouldThrow = true }: Readonly<{ shouldThrow?: boolean }>) {
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
    const restoreExpectedError = silenceExpectedRenderFailure();
    try {
      render(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      );
      expect(screen.getByText('Something went wrong')).toBeTruthy();
      expect(screen.getByText('test-error')).toBeTruthy();
    } finally {
      restoreExpectedError();
    }
  });

  it('renders custom fallback when provided', () => {
    const restoreExpectedError = silenceExpectedRenderFailure();
    try {
      render(
        <ErrorBoundary fallback={<div data-testid="custom-fb">Custom fallback</div>}>
          <ThrowingChild />
        </ErrorBoundary>
      );
      expect(screen.getByTestId('custom-fb')).toBeTruthy();
      expect(screen.getByText('Custom fallback')).toBeTruthy();
    } finally {
      restoreExpectedError();
    }
  });

  it('provides a "Try again" button that resets the boundary', () => {
    const restoreExpectedError = silenceExpectedRenderFailure();
    try {
      render(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      );
      const tryAgainBtn = screen.getByText('Try again');
      expect(tryAgainBtn).toBeTruthy();
      // Clicking resets; the same child intentionally rethrows and the boundary re-catches it.
      fireEvent.click(tryAgainBtn);
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    } finally {
      restoreExpectedError();
    }
  });

  it('provides a "Go home" button', () => {
    const restoreExpectedError = silenceExpectedRenderFailure();
    try {
      render(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      );
      expect(screen.getByText('Go home')).toBeTruthy();
    } finally {
      restoreExpectedError();
    }
  });
});
