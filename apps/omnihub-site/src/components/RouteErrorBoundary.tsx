/**
 * Route-level error boundary for APEX OmniHub.
 *
 * Wraps each page route to prevent cascading failures.
 * A Supabase error, JWT expiry, or Temporal timeout hitting an
 * unguarded component produces a blank white screen in production.
 * This boundary catches it and renders a recoverable error state.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  routeName?: string;
}

interface State {
  hasError:    boolean;
  error:       Error | null;
  errorInfo:   ErrorInfo | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log structured error for observability
    console.error('[RouteErrorBoundary]', {
      route:   this.props.routeName ?? 'unknown',
      message: error.message,
      stack:   error.stack?.slice(0, 500),
    });
  }

  private readonly handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {this.props.routeName
              ? `The ${this.props.routeName} page encountered an error.`
              : 'This page encountered an error.'}
            {' '}Please try refreshing, or contact support if it persists.
          </p>
        </div>

        {isDev && this.state.error && (
          <details className="max-w-xl text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Developer details
            </summary>
            <pre className="mt-2 rounded bg-muted p-3 text-xs overflow-auto">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack?.slice(0, 1000)}
            </pre>
          </details>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={this.handleReset}>
            Try again
          </Button>
          <Button onClick={() => { globalThis.location.href = '/'; }}>
            Go home
          </Button>
        </div>
      </div>
    );
  }
}
