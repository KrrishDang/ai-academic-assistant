import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "rect" | "circle" | "text";
}

/**
 * Accessible Skeleton loader with subtle Academic Monolith pulse animation.
 */
export function Skeleton({ className, variant = "rect", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-muted/70 dark:bg-muted/40",
        variant === "rect" && "rounded-xl",
        variant === "circle" && "rounded-full shrink-0",
        variant === "text" && "h-3.5 w-full rounded-md",
        className,
      )}
      {...props}
    />
  );
}
