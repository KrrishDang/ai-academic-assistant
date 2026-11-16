import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime application error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border/80 rounded-2xl p-6 text-center shadow-lg space-y-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">Something went wrong</h2>
              <p className="text-xs text-muted-foreground">
                An unexpected interface error occurred. You can reload the application workspace below.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="p-3 bg-muted/60 text-muted-foreground text-[11px] rounded-lg text-left overflow-x-auto font-mono">
                {this.state.error.message}
              </pre>
            )}
            <Button variant="lime" size="sm" onClick={this.handleReset} className="w-full">
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              Reload Workspace
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
