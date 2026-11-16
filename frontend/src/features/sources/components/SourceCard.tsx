import React from "react";
import {
  FileText,
  FileCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
  File,
} from "lucide-react";
import type { SourceResponse } from "@/lib/api";
import { formatBytes, formatRelativeTime, getFileExtension } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SourceCardProps {
  source: SourceResponse;
  isHighlighted?: boolean;
  onView: (source: SourceResponse) => void;
  onDelete: (source: SourceResponse) => void;
  disabled?: boolean;
}

export function SourceCard({
  source,
  isHighlighted = false,
  onView,
  onDelete,
  disabled = false,
}: SourceCardProps) {
  const ext = getFileExtension(source.original_filename || source.display_title);

  // Helper for file type icon and color styling
  const renderFileIcon = () => {
    switch (ext) {
      case ".pdf":
        return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
      case ".docx":
      case ".doc":
        return <FileText className="w-4 h-4 text-sky-500 shrink-0" />;
      case ".pptx":
      case ".ppt":
        return <FileText className="w-4 h-4 text-amber-500 shrink-0" />;
      case ".txt":
        return <FileCode className="w-4 h-4 text-emerald-500 shrink-0" />;
      default:
        return <File className="w-4 h-4 text-muted-foreground shrink-0" />;
    }
  };

  const isPending = source.processing_status === "pending";
  const isFailed = source.processing_status === "failed";
  const isCompleted = source.processing_status === "completed";

  return (
    <div
      role="article"
      aria-label={`Source: ${source.display_title}`}
      className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
        isHighlighted
          ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs"
          : "border-border/70 bg-card/70 hover:border-border hover:bg-card hover:shadow-xs"
      }`}
      onClick={() => onView(source)}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="mt-0.5 p-1.5 rounded-lg bg-muted/60 border border-border/40 shrink-0">
            {renderFileIcon()}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors"
              title={source.display_title}
            >
              {source.display_title}
            </h4>

            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground flex-wrap">
              <span>{formatBytes(source.file_size_bytes)}</span>
              <span>&bull;</span>
              <span className="uppercase text-[10px] font-medium tracking-wide">
                {ext ? ext.replace(".", "") : source.source_type}
              </span>
              <span>&bull;</span>
              <span className="text-[10px]">{formatRelativeTime(source.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onView(source)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Inspect source document"
            aria-label={`View details for ${source.display_title}`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(source)}
            disabled={disabled}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
            title="Delete source"
            aria-label={`Delete ${source.display_title}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Processing Status Footer */}
      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
        {isCompleted && (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Ready for grounding</span>
          </span>
        )}

        {isPending && (
          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium animate-pulse">
            <Clock className="w-3 h-3 shrink-0" />
            <span>Extracting text...</span>
          </span>
        )}

        {isFailed && (
          <span
            className="inline-flex items-center gap-1.5 text-destructive font-medium truncate max-w-full"
            title={source.error_message || "Processing failed"}
          >
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {source.error_message ? `Failed: ${source.error_message}` : "Processing failed"}
            </span>
          </span>
        )}

        {source.processing_status && (
          <Badge
            variant={
              isCompleted
                ? "secondary"
                : isPending
                ? "outline"
                : "destructive"
            }
            className="text-[9px] px-1.5 py-0 uppercase font-semibold tracking-wider ml-auto"
          >
            {source.processing_status}
          </Badge>
        )}
      </div>
    </div>
  );
}
