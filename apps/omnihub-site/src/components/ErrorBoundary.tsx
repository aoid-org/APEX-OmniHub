import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

interface State {
  readonly hasError: boolean;
  readonly error: Error | null;
}

/**
 * Route-level ErrorBoundary for the omnihub-site app shell.
 * Catches render errors and shows a recovery UI instead of a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private readonly handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#0f1729', color: '#e5e7eb' }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong</h1>
            <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>{this.state.error?.message ?? 'An unexpected error occurred'}</p>
            <button type="button" onClick={this.handleReset} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #374151', background: 'transparent', color: '#e5e7eb', cursor: 'pointer', marginRight: '0.5rem' }}>
              Try again
            </button>
            <button type="button" onClick={() => { globalThis.location.href = '/'; }} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}>
              Go home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
