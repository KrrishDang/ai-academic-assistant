import {
  BookOpen,
  LayoutDashboard,
  Menu,
  X,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { DocumentLibrary } from "@/features/documents/DocumentLibrary";
import { GlobalSearch } from "@/features/search/GlobalSearch";
import { useDocuments } from "@/features/documents/DocumentContext";
import { cn } from "@/lib/utils";

// ── Navigation items — single Lucide icon each, no emojis ─────────
const navigation = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Documents", to: "/upload", icon: FileText },
  { label: "Settings", to: "/settings", icon: Settings },
];

type NavigationProps = {
  onNavigate?: () => void;
  isCollapsed?: boolean;
};

function Navigation({ onNavigate, isCollapsed = false }: NavigationProps) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-0.5">
      {navigation.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onNavigate}
          title={isCollapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              "relative flex items-center rounded-lg text-[13px] font-semibold transition-all duration-150",
              isCollapsed
                ? "justify-center h-10 w-10 mx-auto"
                : "px-3 py-2 gap-3",
              isActive
                ? "bg-primary/[0.08] text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Thin left accent bar for active state */}
              {isActive && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
              )}
              <Icon
                size={17}
                aria-hidden="true"
                className={cn(
                  "shrink-0 transition-colors duration-150",
                  isActive ? "text-primary" : ""
                )}
              />
              {!isCollapsed && <span>{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const { documents } = useDocuments();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* ── Desktop Sidebar ──────────────────────────────────────── */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="fixed inset-y-0 left-0 hidden border-r border-border/60 bg-card md:flex flex-col z-30"
      >
        {/* Top section */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Logo + collapse toggle */}
          <div
            className={cn(
              "flex items-center shrink-0 border-b border-border/40",
              isCollapsed ? "justify-center px-3 py-5" : "justify-between px-4 py-5"
            )}
          >
            <Link
              to="/"
              className="flex items-center gap-2.5 font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity"
              aria-label="Study Hub home"
            >
              <span className="flex items-center justify-center rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              {!isCollapsed && (
                <span className="font-extrabold text-[15px] whitespace-nowrap">
                  <span className="text-primary">Study</span>{" "}
                  <span className="text-[#b4befe]">Hub</span>
                </span>
              )}
            </Link>

            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft size={15} />
              </button>
            )}
          </div>

          {/* Search */}
          <div className={cn("shrink-0", isCollapsed ? "px-2 py-3" : "px-3 py-3")}>
            {isCollapsed ? (
              <button
                onClick={() => setIsCollapsed(false)}
                className="w-full flex items-center justify-center h-9 rounded-lg border border-input bg-background/40 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                title="Search documents"
              >
                <Search size={15} />
              </button>
            ) : (
              <div className="relative">
                <GlobalSearch />
                {/* Keyboard shortcut hint */}
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/50 pointer-events-none select-none hidden sm:block">
                  Ctrl+K
                </span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className={cn("shrink-0", isCollapsed ? "px-2" : "px-3")}>
            <Navigation isCollapsed={isCollapsed} />
          </div>

          {/* Document Library list */}
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto mt-4 px-3 pb-4">
              <DocumentLibrary />
            </div>
          )}

          {/* Collapsed indicators */}
          {isCollapsed && (
            <div className="flex flex-col items-center gap-3 py-4 mt-4 border-t border-border/30 px-2">
              <button
                onClick={() => setIsCollapsed(false)}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title={`${documents.length} Documents`}
              >
                <FileText size={17} />
                {documents.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#b4befe] text-background text-[7px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full">
                    {documents.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Bottom — expand toggle when collapsed */}
        <div
          className={cn(
            "shrink-0 border-t border-border/30",
            isCollapsed ? "px-2 py-3 flex justify-center" : "px-3 py-3"
          )}
        >
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 font-medium">
              <span>Study Hub v1.0</span>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft size={13} />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── Mobile Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border/60 bg-card px-4 md:hidden">
        <Link to="/" className="flex items-center gap-2 font-bold text-base">
          <span className="flex items-center justify-center rounded-lg bg-primary/10 p-1.5 text-primary">
            <BookOpen size={15} aria-hidden="true" />
          </span>
          <span className="font-extrabold text-sm">
            <span className="text-primary">Study</span>{" "}
            <span className="text-[#b4befe]">Hub</span>
          </span>
        </Link>
        <Button
          variant="ghost"
          className="px-2"
          aria-label="Open navigation menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={20} aria-hidden="true" />
        </Button>
      </header>

      {/* ── Mobile Drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <div
            className="fixed inset-0 z-30 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
              aria-label="Close navigation menu"
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative h-full w-72 bg-card shadow-2xl flex flex-col z-40"
            >
              <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-5 border-b border-border/40">
                  <span className="flex items-center gap-2.5 font-bold text-base">
                    <span className="flex items-center justify-center rounded-lg bg-primary/10 p-2 text-primary">
                      <BookOpen size={16} aria-hidden="true" />
                    </span>
                    <span className="font-extrabold text-sm">
                      <span className="text-primary">Study</span>{" "}
                      <span className="text-[#b4befe]">Hub</span>
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    className="px-2"
                    aria-label="Close navigation menu"
                    onClick={() => setMenuOpen(false)}
                  >
                    <X size={18} aria-hidden="true" />
                  </Button>
                </div>
                <div className="px-3 py-3">
                  <GlobalSearch />
                </div>
                <div className="px-3">
                  <Navigation onNavigate={() => setMenuOpen(false)} />
                </div>
                <div className="mt-4 px-3 pb-4">
                  <DocumentLibrary />
                </div>
              </div>
              <div className="shrink-0 border-t border-border/30 px-4 py-3 text-[10px] text-muted-foreground/50 font-medium">
                Study Hub v1.0
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <motion.main
        animate={{ paddingLeft: isMobile ? 0 : isCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-1 min-h-screen flex flex-col w-full"
      >
        <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-10 lg:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
    </div>
  );
}
