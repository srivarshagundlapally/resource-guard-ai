import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md rounded-xl border border-surface-border bg-card p-6 text-center">
            <h1 className="font-display text-xl font-bold text-slate-100">
              Something went wrong
            </h1>
            <p className="mt-2 break-words text-sm text-slate-400">
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}