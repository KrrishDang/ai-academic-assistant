import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "default"
  | "lime"
  | "outline"
  | "ghost"
  | "secondary"
  | "destructive"
  | "link";

export type ButtonSize = "xs" | "sm" | "default" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  isLoading?: boolean;
};

/**
 * Tactile Button Component (The Academic Monolith):
 * - Specific property transitions (transform, background-color, border-color, color)
 * - Snappy :active press state (scale: 0.975)
 * - Strong custom ease-out curve (0.23, 1, 0.32, 1)
 * - Visible focus-visible ring for keyboard navigation
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      type = "button",
      asChild = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Component = asChild ? Slot : "button";

    return (
      <Component
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold tracking-normal select-none cursor-pointer",
          "transition-all duration-150 ease-out active:scale-[0.975]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",

          // Sizes
          size === "xs" && "h-6 px-2 text-[10px] rounded-md gap-1",
          size === "sm" && "h-7 px-2.5 text-[11px] rounded-lg gap-1.5",
          size === "default" && "h-9 px-3.5 py-1.5 rounded-xl gap-2",
          size === "lg" && "h-10 px-5 text-xs font-bold rounded-xl gap-2.5",
          size === "icon" && "h-8 w-8 p-0 rounded-lg shrink-0",

          // Variants
          variant === "default" &&
            "bg-primary text-primary-foreground hover:opacity-95 shadow-xs shadow-primary/20",
          variant === "lime" &&
            "bg-[#C6F432] text-[#0B0B0C] hover:bg-[#bceb2c] font-bold shadow-xs active:bg-[#a8d423]",
          variant === "outline" &&
            "border border-border/80 bg-card/60 backdrop-blur-xs text-foreground hover:bg-muted/80 hover:border-border shadow-xs",
          variant === "ghost" &&
            "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          variant === "secondary" &&
            "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40",
          variant === "destructive" &&
            "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
          variant === "link" &&
            "text-primary underline-offset-4 hover:underline p-0 h-auto font-medium",

          className,
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
            <span>{typeof children === "string" ? "Loading..." : children}</span>
          </>
        ) : (
          children
        )}
      </Component>
    );
  },
);

Button.displayName = "Button";

export { Button };
