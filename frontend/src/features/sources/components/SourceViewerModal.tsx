import React from "react";
import {
  FileText,
  FileCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Layers,
  Sparkles,
  Copy,
  Check,
  File,
} from "lucide-react";
import type { SourceResponse } from "@/lib/api";
import { formatBytes, formatRelativeTime, getFileExtension } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SourceViewerModalProps {
  source: SourceResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteRequest?: (source: SourceResponse) => void;
}

export function SourceViewerModal({
  source,
  open,
  onOpenChange,
  onDeleteRequest,
}: SourceViewerModalProps) {
  const [copiedHash, setCopiedHash] = React.useState(false);

  if (!source) return null;

  const ext = getFileExtension(source.original_filename || source.display_title);
  const isCompleted = source.processing_status === "completed";
  const isPending = source.processing_status === "pending";
  const isFailed = source.processing_status === "failed";

  const handleCopyHash = () => {
    if (source.content_hash) {
      navigator.clipboard.writeText(source.content_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Course Source Document"
      description="Inspect source metadata, extraction state, and AI grounding availability."
    >
      <div className="space-y-4 text-xs">
        {/* Document Header Card */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-card border border-border/60 text-primary shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground break-words">
                  {source.display_title}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  Original file: {source.original_filename || source.display_title}
                </p>
              </div>
            </div>

            <Badge
              variant={
                isCompleted
                  ? "secondary"
                  : isPending
                  ? "outline"
                  : "destructive"
              }
              className="text-[10px] px-2 py-0.5 uppercase font-bold shrink-0"
            >
              {source.processing_status}
            </Badge>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg border border-border/60 bg-card/50 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Format & Type
            </span>
            <span className="text-xs font-semibold text-foreground uppercase">
              {ext ? ext.replace(".", "") : source.source_type} ({source.mime_type || "document"})
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-border/60 bg-card/50 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              File Size
            </span>
            <span className="text-xs font-semibold text-foreground">
              {formatBytes(source.file_size_bytes)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-border/60 bg-card/50 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Uploaded
            </span>
            <span className="text-xs font-semibold text-foreground" title={source.created_at}>
              {new Date(source.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })} ({formatRelativeTime(source.created_at)})
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-border/60 bg-card/50 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Integrity Hash
            </span>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-mono text-muted-foreground truncate" title={source.content_hash || undefined}>
                {source.content_hash ? `${source.content_hash.slice(0, 12)}...` : "N/A"}
              </span>
              {source.content_hash && (
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Copy full hash"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ingestion & Grounding Status Block */}
        <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <h4 className="text-xs font-bold text-foreground">
              AI Grounding & Knowledge Integration
            </h4>
          </div>

          {isCompleted && (
            <div className="space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
              <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Text extraction and grounding chunks active
              </p>
              <p>
                This document is indexed into semantic chunks. The AI Tutor and Study Studio tools (flashcards, quiz generator, and summaries) will reference this source to answer questions and cite facts.
              </p>
            </div>
          )}

          {isPending && (
            <div className="space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
              <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold animate-pulse">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Processing document content...
              </p>
              <p>
                Text extraction is in progress. Once complete, this document will automatically be ready to ground answers in the workspace.
              </p>
            </div>
          )}

          {isFailed && (
            <div className="space-y-2 text-[11px] leading-relaxed">
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Extraction Failure
                </p>
                <p className="text-[10px]">
                  {source.error_message || "The file could not be parsed or contains an unsupported format."}
                </p>
              </div>
              <p className="text-muted-foreground">
                To resolve, delete this source and re-upload. Ensure the file is not password-protected and is within the 20 MB size limit.
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          {onDeleteRequest ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onDeleteRequest(source);
              }}
              className="text-destructive hover:bg-destructive/10 hover:border-destructive/30 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete Source
            </Button>
          ) : <div />}

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
