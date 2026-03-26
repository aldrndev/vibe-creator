import { AlertCircle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Card, CardBody } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  requestId?: string;
}

/**
 * Error Boundary component for route-level error catching
 * Per Digitesia Frontend Standards §Error Handling
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Extract requestId if available from error
    const requestId =
      'requestId' in error
        ? (error as unknown as { requestId: string }).requestId
        : crypto.randomUUID();

    this.setState({
      error,
      errorInfo,
      requestId,
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      requestId: undefined,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardBody className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Something went wrong</h2>
                  <p className="text-sm text-muted-foreground">
                    We encountered an unexpected error
                  </p>
                </div>
              </div>

              {this.state.requestId && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Request ID (for support):</p>
                  <code className="text-xs font-mono select-all">{this.state.requestId}</code>
                </div>
              )}

              {import.meta.env.DEV && this.state.error && (
                <details className="bg-muted p-3 rounded-lg">
                  <summary className="text-xs font-medium cursor-pointer mb-2">
                    Error Details (dev only)
                  </summary>
                  <pre className="text-xs overflow-auto max-h-64">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => (window.location.href = '/')}
                >
                  Go Home
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
