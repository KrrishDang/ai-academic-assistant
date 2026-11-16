import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  label?: string;
  helperText?: string;
  maxLength?: number;
  currentLength?: number;
};

/**
 * Accessible Textarea component (The Academic Monolith).
 * Structured for study prompts, note taking, and exam question formulation.
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error,
      label,
      helperText,
      maxLength,
      currentLength,
      id,
      disabled,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={textareaId}
              className="block text-xs font-semibold tracking-wide text-foreground/90 select-none"
            >
              {label}
            </label>
          )}
          {maxLength !== undefined && (
            <span
              className={cn(
                "text-[10px] font-mono font-medium",
                currentLength && currentLength > maxLength * 0.9
                  ? "text-amber-500 font-bold"
                  : "text-muted-foreground/70",
              )}
            >
              {currentLength ?? 0}/{maxLength}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-desc` : undefined
          }
          className={cn(
            "flex w-full rounded-xl border bg-card px-3.5 py-2.5 text-xs font-medium text-foreground transition-all duration-150 resize-y",
            "border-border placeholder:text-muted-foreground/60 leading-relaxed",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-background focus-visible:border-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive/40 text-destructive",
            className,
          )}
          {...props}
        />

        {error && (
          <p id={`${textareaId}-error`} className="text-[11px] font-medium text-destructive mt-1">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${textareaId}-desc`} className="text-[11px] text-muted-foreground mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
