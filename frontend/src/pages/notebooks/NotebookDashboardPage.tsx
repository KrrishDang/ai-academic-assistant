import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  MessageSquare,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  FolderOpen,
} from "lucide-react";

import {
  listNotebooks,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  type NotebookSummaryResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export function NotebookDashboardPage() {
  const navigate = useNavigate();

  const [notebooks, setNotebooks] = useState<NotebookSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editNotebook, setEditNotebook] = useState<NotebookSummaryResponse | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<NotebookSummaryResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Active Menu Dropdown Tracker
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchNotebooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listNotebooks();
      setNotebooks(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load notebooks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  // Filter notebooks by search query
  const filteredNotebooks = useMemo(() => {
    if (!searchQuery.trim()) return notebooks;
    const query = searchQuery.toLowerCase();
    return notebooks.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        (n.description && n.description.toLowerCase().includes(query))
    );
  }, [notebooks, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      setCreateError("Title is required.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createNotebook({
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
      });
      setCreateOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      // Add newly created notebook to list or refresh
      setNotebooks((prev) => [created, ...prev]);
      navigate(`/notebooks/${created.id}`);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create notebook.");
    } finally {
      setCreating(false);
    }
  };

  const handleEditOpen = (nb: NotebookSummaryResponse, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveMenuId(null);
    setEditNotebook(nb);
    setEditTitle(nb.title);
    setEditDescription(nb.description || "");
    setEditError(null);
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNotebook) return;
    if (!editTitle.trim()) {
      setEditError("Title cannot be empty.");
      return;
    }
    setUpdating(true);
    setEditError(null);
    try {
      const updated = await updateNotebook(editNotebook.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setNotebooks((prev) =>
        prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
      );
      setEditOpen(false);
      setEditNotebook(null);
    } catch (err: any) {
      setEditError(err?.message || "Failed to update notebook.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOpen = (nb: NotebookSummaryResponse, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveMenuId(null);
    setNotebookToDelete(nb);
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!notebookToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteNotebook(notebookToDelete.id);
      setNotebooks((prev) => prev.filter((n) => n.id !== notebookToDelete.id));
      setDeleteOpen(false);
      setNotebookToDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete notebook.");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="min-h-full p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#C6F432]/10 border border-[#C6F432]/20 text-[#C6F432]">
              <BookOpen className="w-5 h-5 text-[#C6F432]" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Notebooks
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Organize course materials into isolated notebooks with multi-source AI grounding.
          </p>
        </div>

        <Button
          variant="lime"
          size="default"
          onClick={() => {
            setCreateError(null);
            setCreateTitle("");
            setCreateDescription("");
            setCreateOpen(true);
          }}
          className="shadow-md shadow-[#C6F432]/20 shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Notebook
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notebooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="text-xs text-muted-foreground self-end sm:self-center font-medium">
          {notebooks.length} {notebooks.length === 1 ? "notebook" : "notebooks"} total
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchNotebooks}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-4 animate-pulse"
            >
              <div className="h-5 bg-muted rounded-md w-3/4" />
              <div className="h-3 bg-muted/60 rounded-md w-full" />
              <div className="h-3 bg-muted/60 rounded-md w-2/3" />
              <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                <div className="h-4 bg-muted/70 rounded-md w-1/4" />
                <div className="h-4 bg-muted/70 rounded-md w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredNotebooks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-12 text-center max-w-lg mx-auto space-y-4 my-8">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {searchQuery ? "No matching notebooks" : "No notebooks yet"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {searchQuery
                ? `No notebook titles or descriptions match "${searchQuery}".`
                : "Create a notebook to group course documents, study guides, and grounded conversations in one place."}
            </p>
          </div>
          {searchQuery ? (
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
              Clear search filter
            </Button>
          ) : (
            <Button
              variant="lime"
              size="sm"
              onClick={() => {
                setCreateError(null);
                setCreateTitle("");
                setCreateDescription("");
                setCreateOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create your first notebook
            </Button>
          )}
        </div>
      )}

      {/* Notebook Cards Grid */}
      {!loading && !error && filteredNotebooks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotebooks.map((nb) => (
            <Card
              key={nb.id}
              onClick={() => navigate(`/notebooks/${nb.id}`)}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group relative flex flex-col justify-between"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-sm font-bold line-clamp-1 group-hover:text-primary transition-colors">
                    {nb.title}
                  </CardTitle>

                  {/* Context Menu Dropdown */}
                  <div
                    className="relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === nb.id ? null : nb.id);
                    }}
                  >
                    <button
                      type="button"
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Notebook options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === nb.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-border bg-card shadow-lg z-20 py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleEditOpen(nb, e)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted text-left transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          Edit details
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteOpen(nb, e)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 text-left transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <CardDescription className="text-xs line-clamp-2 mt-1.5 min-h-[32px]">
                  {nb.description || "No description provided."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-2">
                    <FileText className="w-3 h-3 mr-1 text-muted-foreground" />
                    {nb.source_count} {nb.source_count === 1 ? "source" : "sources"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-2">
                    <MessageSquare className="w-3 h-3 mr-1 text-muted-foreground" />
                    {nb.conversation_count} {nb.conversation_count === 1 ? "chat" : "chats"}
                  </Badge>
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-3 mt-0 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                  <span>Updated {formatDate(nb.updated_at)}</span>
                </div>
                <span className="text-[#C6F432] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Open &rarr;
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Notebook Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create New Notebook"
        description="A notebook houses documents and grounded AI conversations for a specific topic or class."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Notebook Title"
            placeholder="e.g. Distributed Systems CS401"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="w-full space-y-1.5">
            <label className="block text-xs font-semibold tracking-wide text-foreground/90 select-none">
              Description (Optional)
            </label>
            <textarea
              placeholder="e.g. Lecture notes, lab guides, and exam practice for Fall 2026."
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-xl border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-all duration-150 border-border placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-background resize-none"
            />
          </div>

          {createError && (
            <p className="text-xs text-destructive font-medium">{createError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="lime"
              isLoading={creating}
              disabled={!createTitle.trim()}
            >
              Create Notebook
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit / Rename Notebook Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Notebook"
        description="Update your notebook title or description."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Notebook Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="w-full space-y-1.5">
            <label className="block text-xs font-semibold tracking-wide text-foreground/90 select-none">
              Description (Optional)
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-xl border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-all duration-150 border-border placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-background resize-none"
            />
          </div>

          {editError && (
            <p className="text-xs text-destructive font-medium">{editError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="lime"
              isLoading={updating}
              disabled={!editTitle.trim()}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Notebook"
        description="This action is permanent and cannot be undone."
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to delete{" "}
            <strong className="text-foreground font-bold">
              {notebookToDelete?.title}
            </strong>
            ? All attached documents ({notebookToDelete?.source_count || 0}) and chat conversations ({notebookToDelete?.conversation_count || 0}) will be permanently deleted from the database and storage.
          </p>

          {deleteError && (
            <p className="text-xs text-destructive font-medium">{deleteError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              isLoading={deleting}
            >
              Delete Notebook
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
