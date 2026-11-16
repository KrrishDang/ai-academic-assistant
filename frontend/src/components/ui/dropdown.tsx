import React, { useState, useRef, useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: (DropdownItem | "separator")[];
  placement?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  placement = "bottom-right",
  className,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const actionableItems = items.filter((item): item is DropdownItem => item !== "separator" && !item.disabled);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setFocusedIndex(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % actionableItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + actionableItems.length) % actionableItems.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < actionableItems.length) {
        actionableItems[focusedIndex].onClick();
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
  };

  const placementStyles: Record<string, string> = {
    "bottom-right": "top-full right-0 mt-1",
    "bottom-left": "top-full left-0 mt-1",
    "top-right": "bottom-full right-0 mb-1",
    "top-left": "bottom-full left-0 mb-1",
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block text-left"
      onKeyDown={handleKeyDown}
    >
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex cursor-pointer"
      >
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -2 }}
            transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
              "absolute z-50 min-w-[160px] rounded-xl border border-border/80 bg-card p-1 shadow-lg backdrop-blur-xs",
              placementStyles[placement],
              className,
            )}
          >
            {items.map((item, index) => {
              if (item === "separator") {
                return <div key={`sep-${index}`} className="my-1 h-px bg-border/60" />;
              }

              const isActionable = !item.disabled;
              const actionableIdx = isActionable ? actionableItems.indexOf(item) : -1;
              const isFocused = actionableIdx === focusedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors select-none text-left",
                    item.destructive
                      ? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
                      : "text-foreground hover:bg-muted focus:bg-muted",
                    isFocused && (item.destructive ? "bg-destructive/10" : "bg-muted"),
                    item.disabled && "cursor-not-allowed opacity-40 pointer-events-none",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {item.icon && <span className="shrink-0 text-muted-foreground">{item.icon}</span>}
                    <span>{item.label}</span>
                  </div>
                  {item.shortcut && (
                    <span className="text-[10px] font-mono text-muted-foreground ml-3">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
