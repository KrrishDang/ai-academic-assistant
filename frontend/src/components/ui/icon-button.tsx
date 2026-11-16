import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonVariant } from "./button";

export type IconButtonSize = "xs" | "sm" | "default" | "lg";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Mandatory accessibility label for screen readers. */
  "aria-label": string;
  variant?: ButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
};

/**
 * Accessible Icon-Only Button component.
 * Ensures keyboard navigation, high-contrast states, and strict ARIA compliance.
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "default",
      type = "button",
      isLoading = false,
      disabled,
      children,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-lg select-none cursor-pointer shrink-0",
          "transition-all duration-150 ease-out active:scale-[0.95]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed",

          // Sizing
          size === "xs" && "h-6 w-6 p-0 text-[12px] rounded-md",
          size === "sm" && "h-7 w-7 p-0 text-[14px] rounded-md",
          size === "default" && "h-8 w-8 p-0 text-[16px] rounded-lg",
          size === "lg" && "h-10 w-10 p-0 text-[18px] rounded-xl",

          // Variants
          variant === "default" &&
            "bg-primary text-primary-foreground hover:opacity-95 shadow-xs shadow-primary/20",
          variant === "lime" &&
            "bg-[#C6F432] text-[#0B0B0C] hover:bg-[#bceb2c] active:bg-[#a8d423] shadow-xs",
          variant === "outline" &&
            "border border-border/80 bg-card/60 backdrop-blur-xs text-foreground hover:bg-muted/80 hover:border-border shadow-xs",
          variant === "ghost" &&
            "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          variant === "secondary" &&
            "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40",
          variant === "destructive" &&
            "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/20",

          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          children
        )}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export { IconButton };
