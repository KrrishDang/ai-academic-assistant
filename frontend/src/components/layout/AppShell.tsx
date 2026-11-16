import React, { useState, useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { NavigationSidebar } from "./NavigationSidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/features/search/GlobalSearch";
import { useAuth } from "@/features/auth/AuthContext";
import { createNotebook } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  children?: ReactNode;
}

/**
 * Master Application Shell (The Academic Monolith).
 * Integrates persistent desktop sidebar, mobile responsive drawer, contextual header,
 * global keyboard shortcuts, and search palette.
 */
export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // New Notebook Quick Modal State
  const [newNotebookOpen, setNewNotebookOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Check viewport on mount and resize
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K / Cmd+K for Search, Ctrl+B / Cmd+B for Sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError("Title is required.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createNotebook({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
      });
      setNewNotebookOpen(false);
      setNewTitle("");
      setNewDesc("");
      navigate(`/notebooks/${created.id}`);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create notebook.");
    } finally {
      setCreating(false);
    }
  };

  const { isAuthenticated } = useAuth();
  const isPublicLanding =
    (location.pathname === "/" && !isAuthenticated) ||
    location.pathname === "/landing" ||
    location.pathname === "/welcome";

  if (isPublicLanding) {
    return <div className="min-h-screen bg-[#0B0B0C] text-[#FAFAFA]">{children}</div>;
  }

  const isEdgeToEdgeWorkspace =
    location.pathname.startsWith("/notebooks/") && location.pathname !== "/notebooks";

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden selection:bg-[#C6F432]/30 selection:text-[#0B0B0C] dark:selection:text-[#C6F432]">
      {/* ─── 1. Desktop Persistent Sidebar (>= 1024px) ────────────────── */}
      <div
        className={cn(
          "hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-150 ease-out",
          isCollapsed ? "w-[68px]" : "w-[240px]",
        )}
      >
        <NavigationSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenNewNotebook={() => setNewNotebookOpen(true)}
        />
      </div>

      {/* ─── 2. Mobile Drawer (< 1024px) ─────────────────────────────── */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="fixed inset-0 bg-background/80 backdrop-blur-xs"
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Sliding Drawer Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="relative z-50 w-[260px] max-w-[85vw] h-full shadow-2xl"
            >
              <NavigationSidebar
                isCollapsed={false}
                isMobile={true}
                onCloseMobile={() => setMobileDrawerOpen(false)}
                onToggleCollapse={() => {}}
                onOpenSearch={() => {
                  setMobileDrawerOpen(false);
                  setSearchModalOpen(true);
                }}
                onOpenNewNotebook={() => {
                  setMobileDrawerOpen(false);
                  setNewNotebookOpen(true);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── 3. Main Application Stage ───────────────────────────────── */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-150 ease-out",
          !isMobile && (isCollapsed ? "lg:pl-[68px]" : "lg:pl-[240px]"),
        )}
      >
        {/* Universal Contextual Workspace Header */}
        <WorkspaceHeader
          onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
          onOpenSearch={() => setSearchModalOpen(true)}
        />

        {/* Dynamic Route Content */}
        <main
          className={cn(
            "flex-1",
            isEdgeToEdgeWorkspace
              ? "p-0 overflow-hidden"
              : "p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full",
          )}
        >
          {children}
        </main>
      </div>

      {/* ─── 4. Global Search Modal (Ctrl+K / Cmd+K) ─────────────────── */}
      <Dialog
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        title="Global Search & Jump"
        description="Search course notes, documents, and previous study conversations."
        className="max-w-xl p-4 sm:p-6"
      >
        <div className="pt-2">
          <GlobalSearch />
        </div>
      </Dialog>

      {/* ─── 5. Quick Create Course Modal ────────────────────────────── */}
      <Dialog
        open={newNotebookOpen}
        onOpenChange={setNewNotebookOpen}
        title="Create Course Notebook"
        description="Create a dedicated academic workspace for lecture notes and study materials."
      >
        <form onSubmit={handleCreateNotebook} className="space-y-4 pt-2">
          <Input
            label="Course Title"
            placeholder="e.g. Thermodynamics & Fluid Mechanics"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            error={createError || undefined}
            autoFocus
          />

          <Textarea
            label="Course Description (Optional)"
            placeholder="Semester notes, reference textbook chapters, and exam scope."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={3}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setNewNotebookOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="lime" isLoading={creating}>
              Create Course
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
