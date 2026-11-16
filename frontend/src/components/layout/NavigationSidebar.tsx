import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  MessageSquare,
  FileText,
  FolderOpen,
  LogOut,
  LogIn,
  Search,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/AuthContext";
import { listNotebooks, type NotebookSummaryResponse } from "@/lib/api";
import {
  createChatWorkspace,
  listRecentChats,
  type RecentChatItem,
} from "@/features/chat/chatService";
import { cn } from "@/lib/utils";

export interface NavigationSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenSearch: () => void;
  onOpenNewNotebook: () => void;
}

interface NavItemDef {
  id: string;
  label: string;
  to: string;
  icon: typeof BookOpen;
  badge?: string;
  matchPrefix?: string;
}

export function NavigationSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile,
  onOpenSearch,
  onOpenNewNotebook,
}: NavigationSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [recentChats, setRecentChats] = useState<RecentChatItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentOpen, setRecentOpen] = useState(true);
  const [creatingChat, setCreatingChat] = useState(false);

  // Fetch recent chats across user workspaces
  useEffect(() => {
    if (isAuthenticated) {
      setRecentLoading(true);
      listRecentChats()
        .then((data) => setRecentChats(data.slice(0, 5)))
        .catch(() => setRecentChats([]))
        .finally(() => setRecentLoading(false));
    } else {
      setRecentChats([]);
    }
  }, [isAuthenticated, location.pathname]);

  const handleCreateNewChat = async () => {
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const { notebook, conversation } = await createChatWorkspace();
      navigate(`/notebooks/${notebook.id}?conversation=${conversation.id}`);
      if (isMobile && onCloseMobile) {
        onCloseMobile();
      }
    } catch {
      navigate("/");
    } finally {
      setCreatingChat(false);
    }
  };

  // Primary Navigation destinations: Chat-first
  const primaryNavItems: NavItemDef[] = [
    {
      id: "workspace",
      label: "New Chat",
      to: "/",
      icon: MessageSquare,
      matchPrefix: "/",
    },
  ];

  const settingsNavItem: NavItemDef = {
    id: "settings",
    label: "Settings",
    to: "/settings",
    icon: Settings,
    matchPrefix: "/settings",
  };

  const userInitials = useMemo(() => {
    if (user?.display_name) {
      return user.display_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "G";
  }, [user]);

  const handleNavClick = (to: string) => {
    navigate(to);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const isRouteActive = (item: NavItemDef) => {
    if (item.id === "workspace") {
      return location.pathname === "/" || location.pathname.startsWith("/notebooks");
    }
    return location.pathname.startsWith(item.to);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full glass-panel border-r border-border/70 select-none transition-all duration-200 ease-out",
        isCollapsed && !isMobile ? "w-[68px]" : "w-[240px]",
      )}
    >
      {/* ─── Product Branding & Header ─────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-border/60 shrink-0",
          isCollapsed && !isMobile ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <Link
          to="/"
          onClick={() => isMobile && onCloseMobile?.()}
          className="flex items-center gap-2.5 font-extrabold tracking-tight text-foreground hover:opacity-90 transition-opacity"
          aria-label="AI Academic Assistant Home"
        >
          <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-xs shrink-0">
            <Sparkles size={15} className="text-primary" aria-hidden="true" />
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-extrabold tracking-tight text-foreground truncate">
                AI Academic <span className="text-primary font-black">Assistant</span>
              </span>
            </div>
          )}
        </Link>

        {isMobile ? (
          <IconButton
            aria-label="Close navigation drawer"
            variant="ghost"
            size="sm"
            onClick={onCloseMobile}
          >
            <X size={16} />
          </IconButton>
        ) : (
          !isCollapsed && (
            <IconButton
              aria-label="Collapse sidebar (Ctrl+B)"
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={15} />
            </IconButton>
          )
        )}
      </div>

      {/* ─── Search & New Notebook Quick Bar ─────────────────────── */}
      <div className={cn("p-3 space-y-2 shrink-0 border-b border-border/40", isCollapsed && !isMobile && "px-2")}>
        {isCollapsed && !isMobile ? (
          <div className="flex flex-col items-center gap-2">
            <Tooltip content="Quick Search (Ctrl+K)" placement="right">
              <IconButton
                aria-label="Quick search"
                variant="outline"
                size="default"
                onClick={onOpenSearch}
              >
                <Search size={15} />
              </IconButton>
            </Tooltip>

            {isAuthenticated && (
              <Tooltip content="New Chat" placement="right">
                <IconButton
                  aria-label="New chat"
                  variant="lime"
                  size="default"
                  onClick={handleCreateNewChat}
                  disabled={creatingChat}
                >
                  <Plus size={15} className={creatingChat ? "animate-spin" : ""} />
                </IconButton>
              </Tooltip>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between h-9 px-3 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs font-medium transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search size={14} />
                <span>Search chats...</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card border border-border/60">
                ⌘K
              </kbd>
            </button>

            {isAuthenticated && (
              <Button
                variant="lime"
                size="sm"
                onClick={handleCreateNewChat}
                disabled={creatingChat}
                className="w-full h-8 justify-start px-3 text-xs font-bold gap-2"
              >
                <Plus size={14} className={creatingChat ? "animate-spin" : ""} />
                <span>{creatingChat ? "Creating..." : "New Chat"}</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── Scrollable Navigation Body ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5 custom-scroll">
        {/* Primary Destinations */}
        <div className="space-y-1">
          {(!isCollapsed || isMobile) && (
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 select-none block mb-1">
              Workspace
            </span>
          )}

          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item);

            if (isCollapsed && !isMobile) {
              return (
                <div key={item.id} className="flex justify-center">
                  <Tooltip content={item.label} placement="right">
                    <button
                      type="button"
                      aria-label={item.label}
                      onClick={() => handleNavClick(item.to)}
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                        active
                          ? "bg-primary text-primary-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                      )}
                    >
                      <Icon size={16} />
                    </button>
                  </Tooltip>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.to)}
                className={cn(
                  "w-full flex items-center justify-between h-9 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left",
                  active
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className="shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant="lime" className="text-[9px] px-1 py-0 h-4">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Recent Chats Section ─────────────────────────── */}
        {(!isCollapsed || isMobile) && (
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => setRecentOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 select-none hover:text-foreground transition-colors cursor-pointer mb-1"
            >
              <div className="flex items-center gap-1.5">
                <Clock size={12} />
                <span>Recent Chats</span>
              </div>
              <ChevronDown
                size={12}
                className={cn("transition-transform duration-150", !recentOpen && "-rotate-90")}
              />
            </button>

            {recentOpen && (
              <div className="space-y-0.5">
                {recentLoading ? (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground/60 italic">
                    Loading chats...
                  </div>
                ) : recentChats.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground/60 leading-relaxed font-medium">
                    {isAuthenticated
                      ? "No recent chats yet."
                      : "Sign in to track your conversations."}
                  </div>
                ) : (
                  recentChats.map((chat) => {
                    const isCurrent =
                      chat.conversationId && location.search.includes(chat.conversationId);
                    return (
                      <button
                        key={chat.conversationId || chat.notebookId}
                        type="button"
                        onClick={() => {
                          if (chat.conversationId) {
                            handleNavClick(`/notebooks/${chat.notebookId}?conversation=${chat.conversationId}`);
                          } else {
                            handleNavClick(`/notebooks/${chat.notebookId}`);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center justify-between h-8 px-3 rounded-lg text-xs font-medium transition-colors text-left truncate cursor-pointer",
                          isCurrent
                            ? "bg-muted text-foreground font-bold border-l-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <MessageSquare size={13} className="shrink-0 text-muted-foreground/80" />
                          <span className="truncate">{chat.title}</span>
                        </div>
                        {chat.sourceCount !== undefined && chat.sourceCount > 0 && (
                          <span className="text-[10px] text-muted-foreground/70 shrink-0 font-mono">
                            {chat.sourceCount} {chat.sourceCount === 1 ? "src" : "srcs"}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Settings Navigation ────────────────────────── */}
        {(!isCollapsed || isMobile) ? (
          <div className="pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={() => handleNavClick(settingsNavItem.to)}
              className={cn(
                "w-full flex items-center justify-between h-9 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left",
                location.pathname.startsWith("/settings")
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              <div className="flex items-center gap-2.5">
                <Settings size={16} className="shrink-0" />
                <span>Settings</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex justify-center pt-2 border-t border-border/40">
            <Tooltip content="Settings" placement="right">
              <button
                type="button"
                aria-label="Settings"
                onClick={() => handleNavClick(settingsNavItem.to)}
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                  location.pathname.startsWith("/settings")
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                )}
              >
                <Settings size={16} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* ─── User Profile & Auth Footer ─────────────────────────── */}
      <div className="p-3 border-t border-border/60 shrink-0 bg-muted/20">
        {isCollapsed && !isMobile ? (
          <div className="flex flex-col items-center gap-2">
            <Tooltip content={user?.email || "Guest Scholar"} placement="right">
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold">
                {userInitials}
              </div>
            </Tooltip>

            {isAuthenticated ? (
              <Tooltip content="Log out" placement="right">
                <IconButton
                  aria-label="Log out"
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut size={14} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip content="Sign in" placement="right">
                <IconButton
                  aria-label="Sign in"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavClick("/login")}
                >
                  <LogIn size={14} />
                </IconButton>
              </Tooltip>
            )}

            <IconButton
              aria-label="Expand sidebar (Ctrl+B)"
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronRight size={14} />
            </IconButton>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-foreground truncate">
                  {user?.display_name || (user?.email ? user.email.split("@")[0] : "Guest Scholar")}
                </div>
                <div className="text-[10px] text-muted-foreground truncate font-mono">
                  {user?.email || "Local Session"}
                </div>
              </div>
            </div>

            {isAuthenticated ? (
              <IconButton
                aria-label="Log out"
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut size={15} />
              </IconButton>
            ) : (
              <IconButton
                aria-label="Sign in"
                variant="ghost"
                size="sm"
                onClick={() => handleNavClick("/login")}
              >
                <LogIn size={15} />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
