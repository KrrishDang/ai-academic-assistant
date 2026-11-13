import {
  BookOpen,
  LayoutDashboard,
  Menu,
  X,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Sparkles,
  FolderKanban,
  LogOut,
  LogIn,
  User as UserIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DocumentLibrary } from "@/features/documents/DocumentLibrary";
import { GlobalSearch } from "@/features/search/GlobalSearch";
import { useDocuments } from "@/features/documents/DocumentContext";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";

// ─── Primary Navigation Items ────────────────────────────────────────────────
const navigation = [
  { label: "Home", to: "/", icon: LayoutDashboard },
  { label: "Notebooks", to: "/notebooks", icon: FolderKanban, badge: "V2" },
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
      {navigation.map(({ label, to, icon: Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onNavigate}
          title={isCollapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              "relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 select-none",
              isCollapsed
                ? "justify-center h-10 w-10 mx-auto"
                : "px-3.5 py-2.5 gap-3",
              isActive
                ? "bg-[#C6F432]/15 text-[#C6F432] dark:text-[#C6F432] font-bold shadow-xs"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#C6F432]" />
              )}
              <Icon
                size={17}
                aria-hidden="true"
                className={cn(
                  "shrink-0 transition-colors duration-150",
                  isActive ? "text-[#C6F432]" : "text-muted-foreground",
                )}
              />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{label}</span>
                  {badge && (
                    <Badge variant="lime" className="text-[9px] px-1.5 py-0 h-4">
                      {badge}
                    </Badge>
                  )}
                </div>
              )}
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
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );

  const { documents } = useDocuments();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const isFocusMode = location.search.includes("focus=true");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute initials for avatar
  const initials = user?.display_name
    ? user.display_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row overflow-x-hidden selection:bg-[#C6F432]/30">
      {/* ─── Desktop Sidebar ──────────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: isFocusMode ? 0 : isCollapsed ? 76 : 260 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="fixed inset-y-0 left-0 hidden lg:flex border-r border-border/80 bg-card flex-col z-30 overflow-hidden shadow-xs"
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header Brand */}
          <div
            className={cn(
              "flex items-center shrink-0 border-b border-border/60",
              isCollapsed ? "justify-center px-3 py-4" : "justify-between px-4 py-4",
            )}
          >
            <Link
              to="/"
              className="flex items-center gap-2.5 font-extrabold tracking-tight text-foreground hover:opacity-90 transition-opacity"
              aria-label="StudyHub V2 home"
            >
              <div className="h-8 w-8 rounded-xl bg-[#0B0B0C] border border-[#C6F432]/40 flex items-center justify-center text-[#C6F432] shadow-xs">
                <Sparkles size={16} className="text-[#C6F432]" aria-hidden="true" />
              </div>
              {!isCollapsed && (
                <span className="text-sm font-extrabold tracking-tight">
                  Study<span className="text-[#C6F432]">Hub</span>{" "}
                  <span className="text-[10px] text-muted-foreground font-semibold">V2</span>
                </span>
              )}
            </Link>

            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsCollapsed(true)}
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>

          {isCollapsed && (
            <div className="flex flex-col items-center py-2 border-b border-border/40 gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setIsCollapsed(false)}
                aria-label="Expand sidebar"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </div>
          )}

          {/* Search bar */}
          {!isCollapsed && (
            <div className="px-3 pt-3 pb-2">
              <GlobalSearch />
            </div>
          )}

          {/* Navigation Links */}
          <div className={cn("flex-1 overflow-y-auto py-2", isCollapsed ? "px-2" : "px-3")}>
            <Navigation isCollapsed={isCollapsed} />

            {/* Document Library (V1 Legacy Support) */}
            {!isCollapsed && (
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Documents ({documents.length})
                  </span>
                </div>
                <DocumentLibrary />
              </div>
            )}
          </div>

          {/* User Profile / Menu Area */}
          <div className="border-t border-border/80 p-3 shrink-0 bg-card/60">
            {isAuthenticated ? (
              <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "justify-between")}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-[#C6F432]/15 text-[#C6F432] border border-[#C6F432]/30 flex items-center justify-center font-bold text-xs shrink-0">
                    {initials}
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {user?.display_name || user?.email.split("@")[0]}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={logout}
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut size={15} aria-hidden="true" />
                  </Button>
                )}
              </div>
            ) : (
              <div className={cn("w-full", isCollapsed ? "flex justify-center" : "")}>
                {isCollapsed ? (
                  <Link to="/login" title="Sign In">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                      <LogIn size={16} aria-hidden="true" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/login" className="w-full block">
                    <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-2">
                      <LogIn size={14} aria-hidden="true" />
                      <span>Sign In</span>
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ─── Mobile Header ────────────────────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 inset-x-0 z-30 h-14 border-b border-border/80 bg-card/95 backdrop-blur-md flex items-center justify-between px-4 shadow-xs">
        <Link
          to="/"
          className="flex items-center gap-2 font-extrabold text-sm tracking-tight text-foreground"
          aria-label="StudyHub V2 home"
        >
          <div className="h-7 w-7 rounded-lg bg-[#0B0B0C] border border-[#C6F432]/40 flex items-center justify-center text-[#C6F432]">
            <Sparkles size={14} className="text-[#C6F432]" aria-hidden="true" />
          </div>
          <span>
            Study<span className="text-[#C6F432]">Hub</span>{" "}
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#C6F432]/15 text-[#C6F432] border border-[#C6F432]/30 font-bold ml-1">
              V2
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Toggle navigation menu"
            onClick={() => setDrawerOpen((prev) => !prev)}
          >
            {drawerOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </Button>
        </div>
      </header>

      {/* ─── Mobile Drawer ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border shadow-xl flex flex-col justify-between z-50 overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between px-4 py-4 border-b border-border/60">
                  <span className="flex items-center gap-2 font-extrabold text-sm text-foreground">
                    <Sparkles size={16} className="text-[#C6F432]" aria-hidden="true" />
                    <span>
                      Study<span className="text-[#C6F432]">Hub</span> V2
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

                <div className="mt-4 px-3 pb-6 border-t border-border/50 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 block mb-2">
                    Library Documents ({documents.length})
                  </span>
                  <DocumentLibrary />
                </div>
              </div>

              {/* User Profile in Drawer */}
              <div className="border-t border-border/80 p-4 bg-card/60">
                {isAuthenticated ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-[#C6F432]/15 text-[#C6F432] border border-[#C6F432]/30 flex items-center justify-center font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {user?.display_name || user?.email.split("@")[0]}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        logout();
                        setDrawerOpen(false);
                      }}
                      title="Sign out"
                      aria-label="Sign out"
                    >
                      <LogOut size={15} aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full block"
                  >
                    <Button variant="lime" size="sm" className="w-full text-xs font-bold gap-2">
                      <LogIn size={14} aria-hidden="true" />
                      <span>Sign In</span>
                    </Button>
                  </Link>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Main Content Container ─────────────────────────────────────────────────── */}
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
              : "max-w-6xl p-4 sm:p-6 md:p-8 lg:p-10",
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

      {/* ─── Mobile Bottom Navigation Bar ─────────────────────────────────────────── */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 inset-x-0 z-30 h-16 border-t border-border/80 bg-card/95 backdrop-blur-lg flex items-center justify-around px-2 lg:hidden shadow-lg"
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
                  "flex flex-col items-center justify-center w-full h-full py-1 gap-1 text-[10px] font-bold transition-all select-none",
                  isActive ? "text-[#C6F432]" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <div className="relative">
                <Icon
                  size={19}
                  className={cn(
                    "transition-transform duration-200",
                    isActive ? "scale-110 text-[#C6F432]" : "",
                  )}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#C6F432]" />
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
