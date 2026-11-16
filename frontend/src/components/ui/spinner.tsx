import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SpinnerSize = "xs" | "sm" | "default" | "lg" | "xl";
export type SpinnerColor = "primary" | "current" | "muted" | "lime";

export interface SpinnerProps extends HTMLAttributes<SVGSVGElement> {
  size?: SpinnerSize;
  color?: SpinnerColor;
  label?: string;
}

/**
 * Accessible SVG Spinner component for asynchronous operations.
 */
export function Spinner({
  size = "default",
  color = "primary",
  label = "Loading",
  className,
  ...props
}: SpinnerProps) {
  const sizeMap: Record<SpinnerSize, string> = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  };

  const colorMap: Record<SpinnerColor, string> = {
    primary: "text-primary",
    current: "text-current",
    muted: "text-muted-foreground",
    lime: "text-[#C6F432]",
  };

  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin shrink-0", sizeMap[size], colorMap[color], className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" className="opacity-20" />
      <path d="M12 2a10 10 0 0 1 10 10" className="opacity-90" />
    </svg>
  );
}
