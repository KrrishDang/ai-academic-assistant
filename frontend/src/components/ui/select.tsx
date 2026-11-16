import { type SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectSize = "sm" | "default" | "lg";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
  label?: string;
  helperText?: string;
  sizeVariant?: SelectSize;
};

/**
 * Accessible Select component with custom Academic Monolith chevron and surface styling.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      error,
      label,
      helperText,
      sizeVariant = "default",
      id,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold tracking-wide text-foreground/90 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-desc` : undefined
            }
            className={cn(
              "flex w-full appearance-none rounded-xl border bg-card text-xs font-medium text-foreground transition-all duration-150 pr-9 pl-3.5 cursor-pointer",
              "border-border",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-background focus-visible:border-primary/50",
              "disabled:cursor-not-allowed disabled:opacity-50",

              sizeVariant === "sm" && "h-8 py-1 text-[11px]",
              sizeVariant === "default" && "h-10 py-2 text-xs",
              sizeVariant === "lg" && "h-11 py-2.5 text-sm",

              error && "border-destructive focus-visible:ring-destructive/40 text-destructive",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 shrink-0"
            aria-hidden="true"
          />
        </div>

        {error && (
          <p id={`${selectId}-error`} className="text-[11px] font-medium text-destructive mt-1">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-desc`} className="text-[11px] text-muted-foreground mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export { Select };
