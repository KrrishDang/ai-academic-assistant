import React, { useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Menu, Search, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface WorkspaceHeaderProps {
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
  onOpenMobileDrawer: () => void;
  onOpenSearch: () => void;
  className?: string;
}

/**
 * Reusable contextual header for AI Academic Assistant (The Academic Monolith).
 * Standardizes page titles, breadcrumbs, search triggers, and responsive layout toggles.
 */
export function WorkspaceHeader({
  title: customTitle,
  breadcrumbs: customBreadcrumbs,
  actions,
  onOpenMobileDrawer,
  onOpenSearch,
  className,
}: WorkspaceHeaderProps) {
  const location = useLocation();

  // Dynamic automatic page title and breadcrumbs fallback
  const autoMeta = useMemo(() => {
    const path = location.pathname;
    if (path === "/" || path === "/notebooks") {
      return { title: "Course Notebooks", breadcrumbs: ["Academic Workspace", "Courses"] };
    }
    if (path.startsWith("/notebooks/")) {
      return { title: "Course Workspace", breadcrumbs: ["Workspace", "Active Course"] };
    }
    if (path === "/documents" || path === "/upload") {
      return { title: "Source Documents", breadcrumbs: ["Library", "Documents"] };
    }
    if (path === "/tools") {
      return { title: "AI Study Tools", breadcrumbs: ["Library", "AI Studio"] };
    }
    if (path === "/workspace" || path === "/chat") {
      return { title: "Interactive Chat", breadcrumbs: ["Workspace", "Chat"] };
    }
    if (path === "/settings") {
      return { title: "Account & Settings", breadcrumbs: ["System", "Preferences"] };
    }
    if (path === "/design-system") {
      return { title: "Design System Primitives", breadcrumbs: ["System", "Showcase"] };
    }
    return { title: "AI Academic Assistant", breadcrumbs: ["Workspace"] };
  }, [location.pathname]);

  const displayTitle = customTitle || autoMeta.title;
  const displayBreadcrumbs = customBreadcrumbs
    ? customBreadcrumbs.map((b) => b.label)
    : autoMeta.breadcrumbs;

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between h-14 px-4 sm:px-6",
        "border-b border-border/80 bg-card/85 backdrop-blur-md select-none transition-colors",
        className,
      )}
    >
      {/* ─── Left Section: Hamburger + Title + Breadcrumbs ─────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <div className="lg:hidden">
          <IconButton
            aria-label="Open navigation menu"
            variant="ghost"
            size="sm"
            onClick={onOpenMobileDrawer}
            className="text-muted-foreground hover:text-foreground -ml-1.5"
          >
            <Menu size={18} />
          </IconButton>
        </div>

        {/* Title & Breadcrumbs */}
        <div className="flex flex-col min-w-0">
          {displayBreadcrumbs.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-muted-foreground/75 leading-none mb-0.5">
              {displayBreadcrumbs.slice(0, -1).map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span>{crumb}</span>
                  <ChevronRight size={10} className="text-muted-foreground/50 shrink-0" />
                </React.Fragment>
              ))}
            </div>
          )}

          <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate leading-tight">
            {displayTitle}
          </h1>
        </div>
      </div>

      {/* ─── Right Section: Search Trigger + Theme Toggle + Actions ─── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Global Search Shortcut Button */}
        <Tooltip content="Search (Ctrl+K)">
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden sm:flex items-center gap-2 h-8 px-2.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors cursor-pointer"
          >
            <Search size={13} />
            <span className="text-[11px]">Search...</span>
            <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-card border border-border/60">
              ⌘K
            </kbd>
          </button>
        </Tooltip>

        {/* Mobile Search Icon Only */}
        <div className="sm:hidden">
          <IconButton
            aria-label="Search notes"
            variant="ghost"
            size="sm"
            onClick={onOpenSearch}
          >
            <Search size={16} />
          </IconButton>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Contextual Actions Slot */}
        {actions && <div className="flex items-center gap-2 pl-1 border-l border-border/60">{actions}</div>}
      </div>
    </header>
  );
}
