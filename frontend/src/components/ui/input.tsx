import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label?: string;
  helperText?: string;
};

/** Accessible text input component following the StudyHub V2 design token system. */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, label, helperText, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold tracking-wide text-foreground/90 select-none"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-desc` : undefined}
          className={cn(
            "flex h-10 w-full rounded-xl border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-all duration-150",
            "border-border placeholder:text-muted-foreground/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-background focus-visible:border-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive/40 text-destructive",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-[11px] font-medium text-destructive mt-1">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-desc`} className="text-[11px] text-muted-foreground mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
