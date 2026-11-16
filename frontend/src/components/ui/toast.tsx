import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
}

interface ToastContextValue {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    dismiss: (id: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return context.toast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, durationMs = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, durationMs };

      setToasts((prev) => [...prev, newToast]);

      if (durationMs > 0) {
        setTimeout(() => {
          dismiss(id);
        }, durationMs);
      }
    },
    [dismiss],
  );

  const toastMethods = {
    success: (title: string, message?: string) => addToast("success", title, message),
    error: (title: string, message?: string) => addToast("error", title, message, 6000),
    info: (title: string, message?: string) => addToast("info", title, message),
    warning: (title: string, message?: string) => addToast("warning", title, message, 5000),
    dismiss,
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className={cn(
                "pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl border bg-card shadow-lg backdrop-blur-xs",
                "border-border/80 text-foreground",
                t.type === "success" && "border-emerald-500/30",
                t.type === "error" && "border-destructive/40 bg-destructive/5",
                t.type === "warning" && "border-amber-500/30",
                t.type === "info" && "border-primary/30",
              )}
            >
              <div className="flex items-start gap-2.5">
                {t.type === "success" && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
                {t.type === "error" && <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />}
                {t.type === "warning" && <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
                {t.type === "info" && <Info size={16} className="text-primary shrink-0 mt-0.5" />}

                <div className="space-y-0.5">
                  <h5 className="text-xs font-bold leading-tight">{t.title}</h5>
                  {t.message && (
                    <p className="text-[11px] text-muted-foreground leading-normal font-medium">
                      {t.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-0.5 transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
