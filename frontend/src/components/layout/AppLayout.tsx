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
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { DocumentLibrary } from "@/features/documents/DocumentLibrary";
import { GlobalSearch } from "@/features/search/GlobalSearch";
import { useDocuments } from "@/features/documents/DocumentContext";
import { cn } from "@/lib/utils";

// ── Desktop & Mobile Primary Navigation Items ────────────────────────
const navigation = [
  { label: "Home", to: "/", icon: LayoutDashboard },
  { label: "Documents", to: "/documents", icon: FileText },
  { label: "Chat", to: "/workspace", icon: MessageSquare },
  { label: "AI Tools", to: "/tools", icon: Sparkles },
  { label: "Settings", to: "/settings", icon: Settings },
];

type NavigationProps = {
  onNavigate?: () => void;
  isCollapsed?: boolean;
};

function Navigation({ onNavigate, isCollapsed = false }: NavigationProps) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-1">
      {navigation.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onNavigate}
          title={isCollapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              "relative flex items-center rounded-xl text-xs font-bold transition-all duration-200 select-none",
              isCollapsed
                ? "justify-center h-10 w-10 mx-auto"
                : "px-3.5 py-2.5 gap-3",
              isActive
                ? "bg-primary/10 text-primary shadow-sm shadow-primary/5"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />
              )}
              <Icon
                size={17}
                aria-hidden="true"
                className={cn(
                  "shrink-0 transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  const { documents } = useDocuments();
  const location = useLocation();
  const isFocusMode = location.search.includes("focus=true");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row overflow-x-hidden selection:bg-primary/20">
      {/* ── Desktop Sidebar ──────────────────────────────────────── */}
      <motion.aside
        animate={{ width: isFocusMode ? 0 : isCollapsed ? 76 : 260 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="fixed inset-y-0 left-0 hidden lg:flex border-r border-border/60 bg-card flex-col z-30 overflow-hidden"
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header Brand */}
          <div
            className={cn(
              "flex items-center shrink-0 border-b border-border/40",
              isCollapsed ? "justify-center px-3 py-4" : "justify-between px-4 py-4"
            )}
          >
            <Link
              to="/"
              className="flex items-center gap-2.5 font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity"
              aria-label="AI Academic Assistant home"
            >
              <span className="flex items-center justify-center rounded-xl bg-primary/10 p-2 text-primary shrink-0 shadow-inner">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              {!isCollapsed && (
                <span className="font-extrabold text-sm whitespace-nowrap">
                  <span className="text-primary">Study</span>{" "}
                  <span className="text-[#b4befe]">Hub AI</span>
                </span>
              )}
            </Link>

            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>

          {/* Global Search */}
          <div className={cn("shrink-0", isCollapsed ? "px-2 py-3" : "px-3 py-3")}>
            {isCollapsed ? (
              <button
                onClick={() => setIsCollapsed(false)}
                className="w-full flex items-center justify-center h-9 rounded-xl border border-input bg-background/50 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                title="Search documents and chats"
              >
                <Search size={15} />
              </button>
            ) : (
              <div className="relative">
                <GlobalSearch />
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className={cn("shrink-0", isCollapsed ? "px-2" : "px-3")}>
            <Navigation isCollapsed={isCollapsed} />
          </div>

          {/* Document Library list */}
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto mt-4 px-3 pb-4 border-t border-border/30 pt-3">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  My Library ({documents.length})
                </span>
              </div>
              <DocumentLibrary />
            </div>
          )}
        </div>

        {/* Bottom Expand Toggle */}
        <div
          className={cn(
            "shrink-0 border-t border-border/30 bg-card/60 backdrop-blur-sm",
            isCollapsed ? "px-2 py-3 flex justify-center" : "px-4 py-3"
          )}
        >
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Gemini 2.5 Flash
              </span>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── Mobile Top Header ────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border/60 bg-card/95 backdrop-blur-md px-4 lg:hidden shrink-0">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-sm">
          <span className="flex items-center justify-center rounded-xl bg-primary/10 p-1.5 text-primary">
            <BookOpen size={16} aria-hidden="true" />
          </span>
          <span className="font-extrabold text-sm tracking-tight">
            <span className="text-primary">Study</span>{" "}
            <span className="text-[#b4befe]">Hub AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            aria-label="Open search and library menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Search size={18} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* ── Mobile Side Drawer ───────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              aria-label="Close navigation menu"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative h-full w-80 max-w-[85vw] bg-card border-r border-border/60 shadow-2xl flex flex-col z-50"
            >
              <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                  <span className="flex items-center gap-2.5 font-bold">
                    <span className="flex items-center justify-center rounded-xl bg-primary/10 p-2 text-primary">
                      <BookOpen size={16} aria-hidden="true" />
                    </span>
                    <span className="font-extrabold text-sm">
                      <span className="text-primary">Study</span>{" "}
                      <span className="text-[#b4befe]">Hub AI</span>
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Close navigation menu"
                    onClick={() => setDrawerOpen(false)}
                  >
                    <X size={18} aria-hidden="true" />
                  </Button>
                </div>

                <div className="px-4 py-3">
                  <GlobalSearch />
                </div>

                <div className="px-3">
                  <Navigation onNavigate={() => setDrawerOpen(false)} />
                </div>

                <div className="mt-4 px-3 pb-6 border-t border-border/30 pt-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 block mb-2">
                    Library Documents ({documents.length})
                  </span>
                  <DocumentLibrary />
                </div>
              </div>

              <div className="shrink-0 border-t border-border/30 px-5 py-3.5 text-xs text-muted-foreground font-semibold flex items-center justify-between">
                <span>AI Academic Assistant</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  v2.0
                </span>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main Content Container ───────────────────────────────── */}
      <motion.main
        animate={{ paddingLeft: isMobile || isFocusMode ? 0 : isCollapsed ? 76 : 260 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-1 min-h-[calc(100vh-56px)] lg:min-h-screen flex flex-col w-full pb-16 lg:pb-0"
      >
        <div
          className={cn(
            "flex-1 w-full mx-auto transition-all duration-200",
            isFocusMode
              ? "max-w-full p-2 sm:p-4"
              : location.pathname.includes("/workspace") || location.pathname.includes("/chat")
              ? "max-w-[1600px] p-2 sm:p-4 md:p-6"
              : "max-w-6xl p-4 sm:p-6 md:p-8 lg:p-10"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>

      {/* ── Mobile Bottom Navigation Bar ─────────────────────────── */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 inset-x-0 z-30 h-16 border-t border-border/60 bg-card/95 backdrop-blur-lg flex items-center justify-around px-2 lg:hidden shadow-lg"
      >
        {navigation.map(({ label, to, icon: Icon }) => {
          const isActive = location.pathname === to || (to === "/" && location.pathname === "/");
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-full h-full py-1 gap-1 text-[10px] font-extrabold transition-all select-none",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <div className="relative">
                <Icon
                  size={19}
                  className={cn(
                    "transition-transform duration-200",
                    isActive ? "scale-110 text-primary" : ""
                  )}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="truncate max-w-[64px]">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
