import React, { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Search,
  Loader2,
  X,
  FileUp,
} from "lucide-react";
import type { SourceResponse, ConversationResponse } from "@/lib/api";
import { SourceCard } from "./SourceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SourcesRailProps {
  sources: SourceResponse[];
  highlightedSourceId: string | null;
  uploadProgress: number | null;
  uploadError: string | null;
  onDismissUploadError: () => void;
  onUploadFile: (files: FileList | null) => Promise<void> | void;
  onViewSource: (source: SourceResponse) => void;
  onDeleteSource: (source: SourceResponse) => void;
  // Conversations integration (optional for backward compatibility)
  conversations?: ConversationResponse[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onCreateConversation?: () => Promise<void> | void;
  onDeleteConversation?: (conv: ConversationResponse) => void;
  isCreatingChat?: boolean;
  className?: string;
}

export function SourcesRail({
  sources,
  highlightedSourceId,
  uploadProgress,
  uploadError,
  onDismissUploadError,
  onUploadFile,
  onViewSource,
  onDeleteSource,
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  isCreatingChat,
  className = "",
}: SourcesRailProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check if any source is currently being processed
  const hasPendingSources = sources.some((s) => s.processing_status === "pending");

  // Filter sources based on search query
  const filteredSources = sources.filter((src) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      src.display_title.toLowerCase().includes(q) ||
      (src.original_filename && src.original_filename.toLowerCase().includes(q))
    );
  });

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFile(e.dataTransfer.files);
    }
  };

  return (
    <aside
      className={`w-full lg:w-80 shrink-0 border-r border-border/80 flex flex-col bg-card/25 overflow-hidden ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ─── Sources Section (Top / Flex-1) ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-border/60">
        {/* Sources Header */}
        <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-border/40 shrink-0 bg-card/40">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-primary/10 text-primary">
              <FileText className="w-4 h-4 text-primary" />
            </span>
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Sources ({sources.length})
            </h2>
            {hasPendingSources && (
              <span
                className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium animate-pulse"
                title="Background text extraction running"
              >
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Syncing...
              </span>
            )}
          </div>

          {/* Upload Button */}
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.txt"
              className="hidden"
              onChange={(e) => {
                onUploadFile(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <span className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-primary-foreground bg-primary hover:bg-primary/90 px-2.5 py-1 rounded-lg transition-colors shadow-xs">
              <Upload className="w-3 h-3" />
              Add Source
            </span>
          </label>
        </div>

        {/* Optional Search / Filter when more than 2 sources exist */}
        {sources.length > 2 && (
          <div className="px-3 py-2 border-b border-border/40 shrink-0 bg-card/20">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-lg pl-8 pr-7 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="p-3 bg-muted/50 border-b border-border/60 space-y-1.5 shrink-0">
            <div className="flex justify-between text-[10px] font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                Uploading document...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-border/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="p-2.5 bg-destructive/10 border-b border-destructive/20 text-destructive text-[11px] font-medium flex items-center justify-between gap-2 shrink-0">
            <span className="truncate">{uploadError}</span>
            <button
              type="button"
              onClick={onDismissUploadError}
              className="p-1 hover:text-foreground shrink-0"
              title="Dismiss error"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Drag and drop overlay banner if dragging */}
        {isDragOver && (
          <div className="p-4 m-2 border-2 border-dashed border-primary bg-primary/10 rounded-xl text-center space-y-1 animate-pulse">
            <FileUp className="w-6 h-6 mx-auto text-primary" />
            <p className="text-xs font-bold text-primary">Drop document to upload</p>
            <p className="text-[10px] text-muted-foreground">PDF, DOCX, PPTX, or TXT up to 20 MB</p>
          </div>
        )}

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {sources.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground/80 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">No sources added yet</p>
                <p className="text-[11px] text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                  Uploading course materials is optional. Adding lecture slides, syllabus, or notes grounds discussions and AI study tools directly in your course.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 text-xs font-semibold gap-1.5"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Upload Material</span>
              </Button>
              <p className="text-[10px] text-muted-foreground/60">
                Supported: PDF, DOCX, PPTX, TXT (&le; 20 MB)
              </p>
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-xs">
              No sources matched "{searchQuery}"
            </div>
          ) : (
            filteredSources.map((src) => (
              <SourceCard
                key={src.id}
                source={src}
                isHighlighted={highlightedSourceId === src.id}
                onView={onViewSource}
                onDelete={onDeleteSource}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
