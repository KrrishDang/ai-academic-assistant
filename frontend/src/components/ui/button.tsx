import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
};

/** Base button primitive following the shadcn/ui composition style with premium styling. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : "button";

    return (
      <Component
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          size === "default" && "h-10 px-4",
          size === "sm" && "h-8 px-3 text-[11px]",
          size === "lg" && "h-11 px-6 text-sm",
          size === "icon" && "h-9 w-9 p-0",
          variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30",
          variant === "outline" && "border border-border/80 bg-card/60 backdrop-blur-sm text-foreground hover:bg-muted/60 hover:border-border shadow-sm",
          variant === "ghost" && "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
          variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };
