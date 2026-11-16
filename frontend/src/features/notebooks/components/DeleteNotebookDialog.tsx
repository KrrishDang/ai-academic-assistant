import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { NotebookSummaryResponse } from "@/lib/api";

export interface DeleteNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebook?: NotebookSummaryResponse | null;
  onConfirm: () => Promise<void>;
}

/**
 * Accessible confirmation dialog for deleting a Course Notebook.
 * Warns about associated study materials, conversation history, and notes.
 */
export function DeleteNotebookDialog({
  open,
  onOpenChange,
  notebook,
  onConfirm,
}: DeleteNotebookDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!notebook) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Failed to delete notebook. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!loading) {
          setError(null);
          onOpenChange(val);
        }
      }}
      title="Delete Course Notebook?"
      description="This action permanently deletes this course notebook and its references."
    >
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-foreground">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle size={15} />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-destructive">Warning: Permanent Action</p>
            <p className="text-muted-foreground leading-relaxed">
              You are about to delete <span className="font-semibold text-foreground">"{notebook.title}"</span>.
              {notebook.source_count && notebook.source_count > 0 ? (
                <> This notebook is currently linked to <span className="font-semibold">{notebook.source_count} study source(s)</span>.</>
              ) : null}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            isLoading={loading}
          >
            Delete Course
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
