import React, { useState, type ReactNode } from "react";
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  variant?: "card" | "banner";
  className?: string;
}

/**
 * Resilient Error State component.
 * Displays network or generation failures with clear error messaging and retry actions.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  details,
  onRetry,
  isRetrying = false,
  variant = "card",
  className,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (variant === "banner") {
    return (
      <div
        role="alert"
        className={cn(
          "flex items-start justify-between gap-3 p-3.5 rounded-xl border border-destructive/25 bg-destructive/10 text-destructive text-xs font-medium",
          className,
        )}
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-foreground">{title}:</span> <span>{message}</span>
          </div>
        </div>
        {onRetry && (
          <Button
            size="xs"
            variant="outline"
            onClick={onRetry}
            isLoading={isRetrying}
            className="border-destructive/30 text-destructive hover:bg-destructive/15 shrink-0"
          >
            <RefreshCw size={11} className="mr-1" />
            <span>Retry</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-4",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/15 text-destructive shrink-0">
        <AlertCircle size={22} />
      </div>

      <div className="max-w-md space-y-1">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
      </div>

      {details && (
        <div className="w-full max-w-sm">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{showDetails ? "Hide technical details" : "Show technical details"}</span>
            {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showDetails && (
            <pre className="mt-2 text-left p-3 rounded-lg bg-card border border-border/80 text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
              {details}
            </pre>
          )}
        </div>
      )}

      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          isLoading={isRetrying}
          className="gap-2 text-xs font-semibold"
        >
          <RefreshCw size={13} />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
}
