/**
 * ErrorBoundary — Chaos Battery Tests
 *
 * Lightweight test file with NO Wagmi/Supabase mock overhead.
 * Extracted from walletconnect.chaos.spec.tsx to prevent Vitest OOM crashes.
 *
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ---------------------------------------------------------------------------
// Test helper components
// ---------------------------------------------------------------------------

function ThrowingComponent({ error }: { error: Error }): React.ReactNode {
  throw error;
}

function SafeComponent() {
  return <div data-testid="safe-content">Everything is fine</div>;
}

// ---------------------------------------------------------------------------
// SUITE: ErrorBoundary — Resilience Tests
// ---------------------------------------------------------------------------

describe('ErrorBoundary — Resilience Tests', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('catches_thrown_error_and_renders_fallback_ui', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Test explosion')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test explosion')).toBeInTheDocument();
  });

  it('shows_custom_fallback_when_provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
        <ThrowingComponent error={new Error('Boom')} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('renders_try_again_and_go_home_buttons', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Crash')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Go home')).toBeInTheDocument();
  });

  it('renders_children_when_no_error', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('safe-content')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('shows_generic_message_when_error_has_no_message', () => {
    const errorNoMsg = new Error('Unknown error');
    errorNoMsg.message = '';
    render(
      <ErrorBoundary>
        <ThrowingComponent error={errorNoMsg} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });
});
