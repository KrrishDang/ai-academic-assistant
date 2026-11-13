import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "lime" | "secondary" | "outline" | "destructive";

export type BadgeProps = HTMLAttributes<HTMLDivElement> & {
  variant?: BadgeVariant;
};

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide transition-colors uppercase",
          variant === "default" && "bg-primary text-primary-foreground",
          variant === "lime" && "bg-[#C6F432]/15 text-[#C6F432] border border-[#C6F432]/30",
          variant === "secondary" && "bg-secondary text-secondary-foreground",
          variant === "outline" && "border border-border text-foreground",
          variant === "destructive" && "bg-destructive/15 text-destructive border border-destructive/25",
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";

export { Badge };
