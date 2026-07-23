import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary";
  asChild?: boolean;
};

/** Base button primitive following the shadcn/ui composition style with premium styling. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", asChild = false, ...props }, ref) => {
    const Component = asChild ? Slot : "button";

    return (
      <Component
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30",
          variant === "outline" && "border border-border bg-background/50 backdrop-blur-sm text-foreground hover:bg-muted hover:border-muted-foreground/35 shadow-sm",
          variant === "ghost" && "hover:bg-muted text-muted-foreground hover:text-foreground",
          variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };
