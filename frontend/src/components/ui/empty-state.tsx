import React, { type ReactNode } from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "compact";
  className?: string;
}

/**
 * Academic Empty State component.
 * Distraction-free placeholder when notebooks, sources, or study materials are empty.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border/80 bg-card/40 transition-all",
        variant === "default" && "p-8 sm:p-12 space-y-4",
        variant === "compact" && "p-6 space-y-3",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground shrink-0 border border-border/60">
        {icon || <FolderOpen size={22} className="stroke-[1.75]" />}
      </div>

      <div className="max-w-sm space-y-1">
        <h4 className="text-sm font-bold text-foreground tracking-tight">{title}</h4>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
