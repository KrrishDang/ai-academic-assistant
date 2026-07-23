import { useState, useRef } from "react";
import { useDocuments } from "./DocumentContext";
import { useConversations } from "@/features/conversations/ConversationContext";
import { 
  FileText, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Check, 
  X, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export function DocumentLibrary() {
  const { 
    documents, 
    activeDocument, 
    loading, 
    error, 
    selectDocument, 
    renameDoc, 
    deleteDoc, 
    replaceDoc 
  } = useDocuments();

  const { conversations, selectConversation, createNewConversation } = useConversations();

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for actions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replaceProgress, setReplaceProgress] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSelect = async (doc: any) => {
    selectDocument(doc);
    const existing = conversations.find((c) => c.document_id === doc.id);
    if (existing) {
      await selectConversation(existing);
    } else {
      await createNewConversation(doc.id, doc.filename);
    }
    navigate("/workspace");
  };

  const startRename = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(name.replace(/\.pdf$/i, ""));
  };

  const saveRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    
    const fullName = editName.trim() + ".pdf";
    setActionLoading(`rename-${id}`);
    try {
      await renameDoc(id, fullName);
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
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    
    setActionLoading(`delete-${id}`);
    try {
      await deleteDoc(id);
    } catch {
      // error handled in context
    } finally {
      setActionLoading(null);
    }
  };

  const triggerReplace = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setReplacingId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingId) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are accepted.");
      setReplacingId(null);
      return;
    }

    setActionLoading(`replace-${replacingId}`);
    setReplaceProgress(0);
    try {
      await replaceDoc(replacingId, file, (progress) => {
        setReplaceProgress(progress);
      });
      setReplacingId(null);
    } catch (err) {
      const error = err as Error;
      alert(error.message ?? "Failed to replace document.");
      setReplacingId(null);
    } finally {
      setActionLoading(null);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">Document Library</h3>
        {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
          <AlertCircle size={14} className="shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Hidden file input for file version replacement */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
      />

      <div className="space-y-1 overflow-y-auto max-h-[220px] pr-1">
        <AnimatePresence initial={false}>
          {documents.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground font-medium">
              {!loading && "No documents uploaded yet."}
            </div>
          ) : (
            documents.map((doc) => {
              const isActive = activeDocument?.id === doc.id;
              const isEditing = editingId === doc.id;
              const isReplacing = replacingId === doc.id;
              const isDeleting = actionLoading === `delete-${doc.id}`;
              const isRenaming = actionLoading === `rename-${doc.id}`;

              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => !isEditing && !isReplacing && handleSelect(doc)}
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
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex h-7 w-full rounded border border-input bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        autoFocus
                      />
                      <button
                        disabled={isRenaming}
                        onClick={(e) => saveRename(e, doc.id)}
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
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-start gap-2 min-w-0 pr-12">
                        <FileText size={15} className={`shrink-0 mt-0.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold truncate leading-tight">
                            {doc.filename}
                          </span>
                          <span className="text-[9px] text-muted-foreground/80 font-semibold mt-0.5">
                            {doc.page_count} {doc.page_count === 1 ? "page" : "pages"} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                          </span>
                          {doc.lastOpened && (
                            <span className="text-[8px] text-muted-foreground/60 font-semibold mt-0.5">
                              Opened: {new Date(doc.lastOpened).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline upload progress for replacement */}
                  {isReplacing && actionLoading === `replace-${doc.id}` && (
                    <div className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                        <span>Replacing file...</span>
                        <span>{replaceProgress}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded bg-muted">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-violet-600 rounded transition-all duration-200"
                          style={{ width: `${replaceProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Hover Action Buttons */}
                  {!isEditing && !isReplacing && !isDeleting && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-card/90 backdrop-blur-sm pl-2 py-1 rounded transition-opacity duration-150">
                      <button
                        onClick={(e) => startRename(e, doc.id, doc.filename)}
                        title="Rename document"
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => triggerReplace(e, doc.id)}
                        title="Replace file version"
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, doc.id)}
                        title="Delete document"
                        className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  {/* Loading indicator for deletion */}
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
