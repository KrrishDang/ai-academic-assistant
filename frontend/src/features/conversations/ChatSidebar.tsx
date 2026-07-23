import { useState } from "react";
import { useConversations } from "./ConversationContext";
import { useDocuments } from "@/features/documents/DocumentContext";
import { 
  MessageSquare, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Loader2 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export function ChatSidebar() {
  const { 
    conversations, 
    activeConversation, 
    loading, 
    createNewConversation, 
    renameConv, 
    deleteConv, 
    selectConversation 
  } = useConversations();

  const { activeDocument } = useDocuments();
  const navigate = useNavigate();

  // Local state for action states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleNewChat = async () => {
    try {
      const docId = activeDocument ? activeDocument.id : null;
      const title = activeDocument 
        ? `Chat about ${activeDocument.filename.replace(/\.pdf$/i, "")}` 
        : "New Chat Session";
      
      await createNewConversation(docId, title);
      navigate("/dashboard");
    } catch {
      alert("Failed to start a new chat.");
    }
  };

  const handleSelect = async (conv: import("@/lib/api").ConversationResponse) => {
    await selectConversation(conv);
    navigate("/dashboard");
  };

  const startRename = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const saveRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;

    setActionLoading(`rename-${id}`);
    try {
      await renameConv(id, editTitle.trim());
      setEditingId(null);
    } catch {
      // error handled in context
    } finally {
      setActionLoading(null);
    }
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat session?")) return;

    setActionLoading(`delete-${id}`);
    try {
      await deleteConv(id);
    } catch {
      // error handled in context
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Recent Chats</h3>
        {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
      </div>

      <Button 
        onClick={handleNewChat}
        className="w-full flex items-center justify-center gap-2 font-bold h-9 bg-primary text-primary-foreground hover:bg-primary/95 text-xs tracking-wide uppercase transition-all active:scale-[0.98]"
      >
        <Plus size={14} />
        New Chat
      </Button>

      <div className="space-y-1 overflow-y-auto max-h-[220px] pr-1">
        <AnimatePresence initial={false}>
          {conversations.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground font-medium">
              {!loading && "No chat sessions yet."}
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConversation?.id === conv.id;
              const isEditing = editingId === conv.id;
              const isDeleting = actionLoading === `delete-${conv.id}`;
              const isRenaming = actionLoading === `rename-${conv.id}`;

              return (
                <motion.div
                  key={conv.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => !isEditing && handleSelect(conv)}
                  className={`group relative flex flex-col rounded-lg p-2.5 transition-all duration-200 cursor-pointer border text-left ${
                    isActive
                      ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                      : "border-transparent hover:bg-muted hover:border-muted-foreground/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex h-7 w-full rounded border border-input bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        autoFocus
                      />
                      <button
                        disabled={isRenaming}
                        onClick={(e) => saveRename(e, conv.id)}
                        className="rounded p-1 text-green-600 hover:bg-green-500/10"
                      >
                        {isRenaming ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                      <button
                        onClick={cancelRename}
                        className="rounded p-1 text-destructive hover:bg-destructive/10"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0 pr-12">
                      <MessageSquare size={15} className={`shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold truncate leading-normal">
                        {conv.title}
                      </span>
                    </div>
                  )}

                  {/* Hover Action Buttons */}
                  {!isEditing && !isDeleting && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-card/90 backdrop-blur-sm pl-2 py-1 rounded transition-opacity duration-150">
                      <button
                        onClick={(e) => startRename(e, conv.id, conv.title)}
                        title="Rename chat"
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, conv.id)}
                        title="Delete chat"
                        className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  {/* Deleting Spinner */}
                  {isDeleting && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                      <Loader2 size={14} className="animate-spin text-destructive" />
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
