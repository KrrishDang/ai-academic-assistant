import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "lime" | "outline" | "ghost" | "secondary" | "destructive" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  isLoading?: boolean;
};

/** High-performance button component aligned with StudyHub V2 design tokens. */
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
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",

          // Sizes
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-8 px-3 text-[11px] rounded-lg",
          size === "lg" && "h-11 px-6 text-sm rounded-xl font-bold",
          size === "icon" && "h-9 w-9 p-0 rounded-lg",

          // Variants
          variant === "default" &&
            "bg-primary text-primary-foreground hover:opacity-95 shadow-sm shadow-primary/20",
          variant === "lime" &&
            "bg-[#C6F432] text-[#0B0B0C] hover:bg-[#b7e22a] font-bold shadow-sm shadow-[#C6F432]/30 active:bg-[#a5cd22]",
          variant === "outline" &&
            "border border-border bg-card/60 backdrop-blur-sm text-foreground hover:bg-muted/80 hover:border-border/80 shadow-xs",
          variant === "ghost" &&
            "hover:bg-muted text-muted-foreground hover:text-foreground",
          variant === "secondary" &&
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          variant === "destructive" &&
            "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
          variant === "link" &&
            "text-primary underline-offset-4 hover:underline p-0 h-auto font-normal",

          className,
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />}
        {children}
      </Component>
    );
  },
);

Button.displayName = "Button";

export { Button };
