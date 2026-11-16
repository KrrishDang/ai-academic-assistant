import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, BookOpen, X, RefreshCw } from "lucide-react";

import {
  listNotebooks,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  type NotebookSummaryResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/components/ui/toast";

import { NotebookCard } from "@/features/notebooks/components/NotebookCard";
import { NotebookModal } from "@/features/notebooks/components/NotebookModal";
import { DeleteNotebookDialog } from "@/features/notebooks/components/DeleteNotebookDialog";

type SortOption = "updated" | "title_asc" | "sources" | "created";

/**
 * Course Notebooks Hub Page (The Academic Monolith).
 * Reconstructed student landing experience for browsing, searching, and managing course workspaces.
 */
export function NotebookDashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [notebooks, setNotebooks] = useState<NotebookSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated");

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<NotebookSummaryResponse | null>(null);
  const [deletingNotebook, setDeletingNotebook] = useState<NotebookSummaryResponse | null>(null);

  const fetchNotebooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listNotebooks();
      setNotebooks(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load course notebooks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  // Filtered and sorted notebooks
  const processedNotebooks = useMemo(() => {
    let list = [...notebooks];

    // Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (nb) =>
          nb.title.toLowerCase().includes(q) ||
          (nb.description && nb.description.toLowerCase().includes(q)),
      );
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "sources":
          return (b.source_count ?? 0) - (a.source_count ?? 0);
        case "created": {
          const dateA = new Date(a.created_at).getTime() || 0;
          const dateB = new Date(b.created_at).getTime() || 0;
          return dateB - dateA;
        }
        case "updated":
        default: {
          const dateA = new Date(a.updated_at || a.created_at).getTime() || 0;
          const dateB = new Date(b.updated_at || b.created_at).getTime() || 0;
          return dateB - dateA;
        }
      }
    });

    return list;
  }, [notebooks, searchQuery, sortBy]);

  // Handle Create
  const handleCreateSubmit = async (data: { title: string; description?: string }) => {
    const created = await createNotebook(data);
    setNotebooks((prev) => [created, ...prev]);
    toast.success("Course Created", `"${created.title}" is ready.`);
    navigate(`/notebooks/${created.id}`);
  };

  // Handle Edit
  const handleEditSubmit = async (data: { title: string; description?: string }) => {
    if (!editingNotebook) return;
    const updated = await updateNotebook(editingNotebook.id, data);
    setNotebooks((prev) =>
      prev.map((nb) => (nb.id === updated.id ? { ...nb, ...updated } : nb)),
    );
    toast.success("Course Updated", `Updated details for "${updated.title}".`);
    setEditingNotebook(null);
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingNotebook) return;
    await deleteNotebook(deletingNotebook.id);
    setNotebooks((prev) => prev.filter((nb) => nb.id !== deletingNotebook.id));
    toast.success("Course Deleted", `"${deletingNotebook.title}" has been removed.`);
    setDeletingNotebook(null);
  };

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Course Notebooks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dedicated academic workspaces organized by subject, syllabus, and research materials.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Course</span>
        </Button>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by course title or syllabus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 hidden sm:inline-block">
            Sort by:
          </span>
          <div className="w-48">
            <Select
              sizeVariant="sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort course notebooks"
            >
              <option value="updated">Recently Updated</option>
              <option value="title_asc">Title (A–Z)</option>
              <option value="sources">Most Sources</option>
              <option value="created">Newest Created</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/40">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load courses"
          message={error}
          onRetry={fetchNotebooks}
        />
      ) : notebooks.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} className="stroke-[1.75]" />}
          title="No Course Notebooks Yet"
          description="Create your first course notebook to start organizing lecture slides, syllabus documents, and AI study sessions."
          action={
            <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
              <Plus size={15} />
              <span>Create Your First Course</span>
            </Button>
          }
        />
      ) : processedNotebooks.length === 0 ? (
        <EmptyState
          icon={<Search size={24} className="stroke-[1.75]" />}
          title="No matching courses found"
          description={`No courses matched "${searchQuery}". Try searching for another subject or clear your filter.`}
          action={
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>
              Showing {processedNotebooks.length}{" "}
              {processedNotebooks.length === 1 ? "course" : "courses"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {processedNotebooks.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                notebook={notebook}
                onOpen={(id) => navigate(`/notebooks/${id}`)}
                onEdit={(nb) => setEditingNotebook(nb)}
                onDelete={(nb) => setDeletingNotebook(nb)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      <NotebookModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateSubmit}
      />

      {/* Edit Modal */}
      <NotebookModal
        open={Boolean(editingNotebook)}
        onOpenChange={(open) => !open && setEditingNotebook(null)}
        notebookToEdit={editingNotebook}
        onSubmit={handleEditSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteNotebookDialog
        open={Boolean(deletingNotebook)}
        onOpenChange={(open) => !open && setDeletingNotebook(null)}
        notebook={deletingNotebook}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
export default NotebookDashboardPage;
