import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { NotebookSummaryResponse } from "@/lib/api";

export interface NotebookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookToEdit?: NotebookSummaryResponse | null;
  onSubmit: (data: { title: string; description?: string }) => Promise<void>;
}

/**
 * Accessible Modal for creating or editing a Course Notebook.
 */
export function NotebookModal({
  open,
  onOpenChange,
  notebookToEdit,
  onSubmit,
}: NotebookModalProps) {
  const isEditing = Boolean(notebookToEdit);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (notebookToEdit) {
        setTitle(notebookToEdit.title);
        setDescription(notebookToEdit.description || "");
      } else {
        setTitle("");
        setDescription("");
      }
      setError(null);
    }
  }, [open, notebookToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Course title is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        title: cleanTitle,
        description: description.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Failed to save course notebook.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Course Notebook" : "Create Course Notebook"}
      description={
        isEditing
          ? "Update course metadata, syllabus description, and title."
          : "Create a dedicated academic workspace for lecture notes, problem sets, and AI study tools."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Course Notebook Title"
          placeholder="e.g. Linear Algebra & Vector Calculus"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          error={error || undefined}
          autoFocus
          disabled={loading}
        />

        <Textarea
          label="Syllabus & Course Scope (Optional)"
          placeholder="Outline main topics, exam dates, textbook references, or professor notes."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={300}
          currentLength={description.length}
          disabled={loading}
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="lime"
            isLoading={loading}
          >
            {isEditing ? "Save Changes" : "Create Notebook"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
