import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Optional: render something specific when an error occurs in this subtree */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ background: '#0A0A0A' }}
      >
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">⚠</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </Button>
            <Button variant="gold" onClick={() => (window.location.href = '/')}>
              Go home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
