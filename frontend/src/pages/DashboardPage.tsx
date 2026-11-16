import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  MessageSquare,
  Plus,
  ArrowRight,
  Sparkles,
  Search,
  Clock,
  Settings,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  User,
} from "lucide-react";

import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/utils";
import { listNotebooks, updateNotebook, deleteNotebook, type NotebookSummaryResponse } from "@/lib/api";
import { NotebookCard } from "@/features/notebooks/components/NotebookCard";
import { NotebookModal } from "@/features/notebooks/components/NotebookModal";
import { DeleteNotebookDialog } from "@/features/notebooks/components/DeleteNotebookDialog";
import { PublicLandingPage } from "@/pages/PublicLandingPage";
import {
  createChatWorkspace,
  listRecentChats,
  retryConversationCreation,
  ChatCreationError,
  type RecentChatItem,
} from "@/features/chat/chatService";

/**
 * AI Academic Assistant — Primary Chat Landing Page.
 *
 * Provides a clean, chat-first academic entry experience:
 * - Prominent New Chat action (debounced with in-flight Promise).
 * - Instant client-side search across conversation titles and notebooks.
 * - Recent Chats gallery with relative timestamps and source grounding badges.
 * - Robust 2-phase creation failure recovery (preserves created notebook and enables safe retry).
 * - Settings and Account access shortcuts.
 * - Does not create an empty chat automatically upon mount or login.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [recentChats, setRecentChats] = useState<RecentChatItem[]>([]);
  const [recentNotebooks, setRecentNotebooks] = useState<NotebookSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Creation State & Failure Recovery
  const [creatingChat, setCreatingChat] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [failedNotebookId, setFailedNotebookId] = useState<string | null>(null);

  // Workspace Edit & Delete State
  const [editingNotebook, setEditingNotebook] = useState<NotebookSummaryResponse | null>(null);
  const [deletingNotebook, setDeletingNotebook] = useState<NotebookSummaryResponse | null>(null);

  const handleEditSubmit = async (data: { title: string; description?: string }) => {
    if (!editingNotebook) return;
    try {
      const updated = await updateNotebook(editingNotebook.id, data);
      setRecentNotebooks((prev) =>
        prev.map((nb) => (nb.id === updated.id ? { ...nb, ...updated } : nb))
      );
      setRecentChats((prev) =>
        prev.map((c) => (c.notebookId === updated.id ? { ...c, notebookTitle: updated.title } : c))
      );
      toast.success("Workspace Updated", `Updated details for "${updated.title}".`);
      setEditingNotebook(null);
    } catch (err: any) {
      toast.error("Update Failed", err?.message || "Could not update workspace.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingNotebook) return;
    try {
      await deleteNotebook(deletingNotebook.id);
      setRecentNotebooks((prev) => prev.filter((nb) => nb.id !== deletingNotebook.id));
      setRecentChats((prev) => prev.filter((c) => c.notebookId !== deletingNotebook.id));
      toast.success("Workspace Deleted", `"${deletingNotebook.title}" has been removed.`);
      setDeletingNotebook(null);
    } catch (err: any) {
      toast.error("Delete Failed", err?.message || "Could not delete workspace.");
    }
  };

  const fetchRecentChats = useCallback(async () => {
    if (!isAuthenticated) {
      setRecentChats([]);
      setRecentNotebooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [chatsData, notebooksData] = await Promise.all([
        listRecentChats(),
        listNotebooks().catch(() => [] as NotebookSummaryResponse[]),
      ]);
      setRecentChats(chatsData);
      setRecentNotebooks(notebooksData);
    } catch (err: any) {
      setError(err?.message || "Failed to load recent chats.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchRecentChats();
  }, [fetchRecentChats]);

  // Handle New Chat Creation
  const handleNewChat = async () => {
    if (creatingChat) return;
    setCreatingChat(true);
    setCreationError(null);
    setFailedNotebookId(null);

    try {
      const { notebook, conversation } = await createChatWorkspace();
      toast.success("Chat Created", `Workspace "${notebook.title}" is ready.`);
      navigate(`/notebooks/${notebook.id}?conversation=${conversation.id}`);
    } catch (err: any) {
      if (err instanceof ChatCreationError) {
        setFailedNotebookId(err.notebookId);
        setCreationError(
          "Course workspace created, but initial conversation failed to initialize. You can retry safely without creating a duplicate course.",
        );
      } else {
        setCreationError(err?.message || "Failed to start new chat.");
      }
    } finally {
      setCreatingChat(false);
    }
  };

  // Safe Retry Handler (re-uses existing notebook container)
  const handleRetryConversation = async () => {
    if (!failedNotebookId || creatingChat) return;
    setCreatingChat(true);
    setCreationError(null);
    try {
      const conv = await retryConversationCreation(failedNotebookId);
      toast.success("Chat Initialized", "Conversation connected successfully.");
      const notebookId = failedNotebookId;
      setFailedNotebookId(null);
      navigate(`/notebooks/${notebookId}?conversation=${conv.id}`);
    } catch (err: any) {
      setCreationError(err?.message || "Retry failed. Please check network connectivity.");
    } finally {
      setCreatingChat(false);
    }
  };

  // Open Existing Chat
  const handleOpenChat = (item: RecentChatItem) => {
    if (item.conversationId) {
      navigate(`/notebooks/${item.notebookId}?conversation=${item.conversationId}`);
    } else {
      navigate(`/notebooks/${item.notebookId}`);
    }
  };

  // Filtered Chats
  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentChats;
    return recentChats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(q) ||
        chat.notebookTitle.toLowerCase().includes(q),
    );
  }, [recentChats, searchQuery]);

  const greetingName = user?.display_name || (user?.email ? user.email.split("@")[0] : null);
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
  };

  if (!isAuthenticated && !loading) {
    return <PublicLandingPage />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12 max-w-6xl mx-auto px-4 sm:px-6 relative z-10"
    >
      {/* ── Top Hero Welcome Banner ────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-white/10 dark:border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
      >
        <div className="absolute -right-24 -top-24 w-80 h-80 bg-primary/10 dark:bg-primary/[0.08] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-primary/5 dark:bg-primary/[0.04] rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wider">
              <Sparkles size={12} />
              <span>AI Academic Assistant</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {greetingName ? `Welcome back, ${greetingName}` : "AI Academic Assistant"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
              Start an academic discussion, query course sources with grounded citations, or resume a recent conversation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <Button
                onClick={handleNewChat}
                disabled={creatingChat}
                className="gap-2 shrink-0 font-bold px-5 h-11 shadow-sm"
              >
                {creatingChat ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Creating Chat...</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>New Chat</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                className="gap-2 shrink-0 font-bold"
              >
                <Sparkles size={16} />
                <span>Sign In to Chat</span>
              </Button>
            )}

            <Button
              onClick={() => navigate("/settings")}
              variant="outline"
              className="gap-2 shrink-0 text-xs font-semibold h-11"
              aria-label="Settings"
            >
              <Settings size={15} />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Error State / Creation Failure Recovery Banner ─────────── */}
      {creationError && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-start justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Chat Creation Notice</p>
              <p className="text-xs mt-0.5 opacity-90">{creationError}</p>
            </div>
          </div>
          {failedNotebookId && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryConversation}
              disabled={creatingChat}
              className="shrink-0 text-xs gap-1.5"
            >
              <RefreshCw size={12} className={creatingChat ? "animate-spin" : ""} />
              <span>Retry</span>
            </Button>
          )}
        </div>
      )}

      {/* ── Main Chat Area: Search and Recent Chats ─────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Recent Chats</h2>
            <Badge variant="secondary" className="text-xs">
              {recentChats.length}
            </Badge>
          </div>

          {/* Search Chats Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
              aria-label="Search chats"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/60 bg-card p-5 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-1/2 rounded-md" />
                <div className="pt-2 flex justify-between items-center border-t border-border/40">
                  <Skeleton className="h-3 w-20 rounded-md" />
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="rounded-2xl border border-border/80 bg-card p-8 text-center space-y-4">
            <AlertCircle className="size-8 mx-auto text-destructive" />
            <div className="space-y-1">
              <p className="font-bold text-foreground">Unable to Load Recent Chats</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchRecentChats}
              className="gap-1.5 text-xs mx-auto"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </Button>
          </div>
        ) : filteredChats.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-border/80 bg-card p-8 sm:p-12">
            {searchQuery ? (
              <EmptyState
                icon={<Search className="size-8 text-muted-foreground" />}
                title="No matching chats"
                description={`No conversations matched "${searchQuery}". Clear your search or create a new chat.`}
                action={
                  <Button size="sm" variant="outline" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<MessageSquare className="size-8 text-primary" />}
                title="No chats yet"
                description="Start a new chat to begin exploring academic concepts, asking questions, or discussing course materials."
                action={
                  <Button size="sm" onClick={handleNewChat} disabled={creatingChat} className="gap-2 font-bold">
                    <Plus size={16} />
                    <span>New Chat</span>
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          /* Recent Chats Grid */
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChats.map((chat) => (
              <motion.div
                key={chat.conversationId || chat.notebookId}
                whileHover={shouldReduceMotion ? {} : { y: -3, transition: { duration: 0.18 } }}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenChat(chat)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenChat(chat);
                  }
                }}
                className="group relative flex flex-col justify-between rounded-2xl glass-card-interactive p-5 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {chat.title}
                    </h3>
                    <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                      {chat.notebookTitle}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {chat.sourceCount && chat.sourceCount > 0
                      ? `Grounded in ${chat.sourceCount} course ${chat.sourceCount === 1 ? "source" : "sources"}`
                      : "Open discussion workspace"}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>{formatRelativeTime(chat.updatedAt)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground group-hover:text-primary transition-colors">
                    <span>Open</span>
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Optional Quick Resume for Existing Course Workspaces ──── */}
      {recentNotebooks.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Resume Course Workspace
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentNotebooks.slice(0, 3).map((nb) => (
              <NotebookCard
                key={nb.id}
                notebook={nb}
                onOpen={(id) => navigate(`/notebooks/${id}`)}
                onEdit={(item) => setEditingNotebook(item)}
                onDelete={(item) => setDeletingNotebook(item)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Edit Workspace Modal */}
      <NotebookModal
        open={Boolean(editingNotebook)}
        onOpenChange={(open) => !open && setEditingNotebook(null)}
        notebookToEdit={editingNotebook}
        onSubmit={handleEditSubmit}
      />

      {/* Delete Workspace Confirmation Dialog */}
      <DeleteNotebookDialog
        open={Boolean(deletingNotebook)}
        onOpenChange={(open) => !open && setDeletingNotebook(null)}
        notebook={deletingNotebook}
        onConfirm={handleDeleteConfirm}
      />
    </motion.div>
  );
}
