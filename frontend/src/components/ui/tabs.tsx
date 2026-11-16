import React, { createContext, useContext, useState, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
  variant: "pills" | "underline";
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be rendered within a Tabs provider.");
  }
  return context;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  variant?: "pills" | "underline";
  className?: string;
  children: ReactNode;
}

export function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  variant = "pills",
  className,
  children,
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (newVal: string) => {
    if (!isControlled) {
      setUncontrolledValue(newVal);
    }
    onValueChange?.(newVal);
  };

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange, variant }}>
      <div className={cn("w-full space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}

export function TabsList({ className, children, "aria-label": ariaLabel }: TabsListProps) {
  const { variant } = useTabs();
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') || []);
    if (!tabs.length) return;

    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    let nextIndex = currentIndex;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center",
        variant === "pills" && "p-1 rounded-xl bg-muted/60 border border-border/60 gap-1",
        variant === "underline" && "border-b border-border/80 gap-6 w-full",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  badge?: ReactNode;
}

export function TabsTrigger({ value, disabled = false, className, children, badge }: TabsTriggerProps) {
  const { value: activeValue, onValueChange, variant } = useTabs();
  const isSelected = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isSelected}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all select-none cursor-pointer whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-40",

        variant === "pills" && [
          "px-3 py-1.5 text-xs rounded-lg duration-150",
          isSelected
            ? "bg-card text-foreground shadow-xs border border-border/60 font-bold"
            : "text-muted-foreground hover:text-foreground hover:bg-card/40",
        ],

        variant === "underline" && [
          "py-2.5 text-xs border-b-2 -mb-px duration-150",
          isSelected
            ? "border-primary text-foreground font-bold"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
        ],

        className,
      )}
    >
      <span>{children}</span>
      {badge && <span className="shrink-0">{badge}</span>}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  className?: string;
  children: ReactNode;
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  const { value: activeValue } = useTabs();
  const isSelected = activeValue === value;

  if (!isSelected) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={cn("focus-visible:outline-none animate-fade-in", className)}
    >
      {children}
    </div>
  );
}
