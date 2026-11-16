import { type InputHTMLAttributes, forwardRef, useEffect, useRef } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  label?: string;
  description?: string;
  indeterminate?: boolean;
};

/**
 * Accessible Checkbox component (The Academic Monolith).
 * Supports standard checked, unchecked, and indeterminate states.
 */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, checked, indeterminate = false, disabled, id, onChange, ...props }, ref) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const resolvedRef = (ref || internalRef) as React.MutableRefObject<HTMLInputElement>;
    const checkboxId = id || (label ? `chk-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

    useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate, resolvedRef]);

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "inline-flex items-start gap-2.5 select-none cursor-pointer group",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={resolvedRef}
            id={checkboxId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              "h-4 w-4 rounded-md border transition-all duration-150 flex items-center justify-center shrink-0",
              "border-border bg-card",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-background",
              "group-hover:border-primary/60",
              (checked || indeterminate) && "bg-primary border-primary text-primary-foreground",
              disabled && "peer-checked:bg-muted peer-checked:border-border text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {checked && !indeterminate && <Check size={11} strokeWidth={3} />}
            {indeterminate && <Minus size={11} strokeWidth={3} />}
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-xs font-semibold text-foreground tracking-normal group-hover:text-foreground/90">
                {label}
              </span>
            )}
            {description && (
              <span className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
