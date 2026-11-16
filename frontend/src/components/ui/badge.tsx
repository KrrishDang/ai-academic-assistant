import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "lime"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning"
  | "sky";

export type BadgeProps = HTMLAttributes<HTMLDivElement> & {
  variant?: BadgeVariant;
};

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide transition-colors select-none",
          variant === "default" && "bg-primary text-primary-foreground",
          variant === "lime" && "bg-primary/10 text-primary border border-primary/25 font-bold",
          variant === "secondary" && "bg-secondary text-secondary-foreground border border-border/40",
          variant === "outline" && "border border-border/80 text-foreground",
          variant === "destructive" && "bg-destructive/15 text-destructive border border-destructive/25",
          variant === "success" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25",
          variant === "warning" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25",
          variant === "sky" && "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25",
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";

export { Badge };
