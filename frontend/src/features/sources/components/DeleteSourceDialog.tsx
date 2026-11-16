import React from "react";
import { AlertTriangle } from "lucide-react";
import type { SourceResponse } from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteSourceDialogProps {
  source: SourceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  isDeleting: boolean;
}

export function DeleteSourceDialog({
  source,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteSourceDialogProps) {
  if (!source) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Source Document"
      description="Permanently remove this document source from the notebook workspace."
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3 p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-xs">
              Confirm Source Deletion
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-foreground font-bold">
                {source.display_title}
              </strong>
              ? Its extracted text, grounding chunks, and semantic index will be permanently deleted.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/60 bg-muted/30 text-[11px] text-muted-foreground space-y-1">
          <span className="font-medium text-foreground block">Impact:</span>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>The AI Tutor will no longer reference this document to answer course questions.</li>
            <li>Study Studio study guides, quizzes, and flashcards derived from this source may lose grounded citations.</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            isLoading={isDeleting}
          >
            Delete Source
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
