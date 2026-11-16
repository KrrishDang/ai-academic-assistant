import React from "react";
import { BookOpen, MoreVertical, Pencil, Trash2, ArrowUpRight, Clock, FileText, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { DropdownMenu } from "@/components/ui/dropdown";
import { formatRelativeTime } from "@/lib/utils";
import type { NotebookSummaryResponse } from "@/lib/api";

export interface NotebookCardProps {
  notebook: NotebookSummaryResponse;
  onOpen: (id: string) => void;
  onEdit: (notebook: NotebookSummaryResponse) => void;
  onDelete: (notebook: NotebookSummaryResponse) => void;
}

/**
 * Reusable Course Notebook Card (The Academic Monolith).
 * Displays course titles, syllabus description, source counts, and contextual actions.
 */
export function NotebookCard({ notebook, onOpen, onEdit, onDelete }: NotebookCardProps) {
  const relativeTime = formatRelativeTime(notebook.updated_at || notebook.created_at);

  return (
    <div
      role="article"
      tabIndex={0}
      onClick={() => onOpen(notebook.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(notebook.id);
        }
      }}
      className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 text-card-foreground shadow-xs transition-all duration-150 ease-out hover:border-primary/60 hover:bg-muted/20 active:scale-[0.985] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background"
    >
      {/* Top Header Row */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform duration-150">
              <BookOpen size={17} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                {notebook.title}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground mt-0.5">
                <Clock size={11} className="shrink-0" />
                <span>Updated {relativeTime}</span>
              </div>
            </div>
          </div>

          {/* Contextual Action Menu */}
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu
              placement="bottom-right"
              trigger={
                <IconButton
                  aria-label={`Options for ${notebook.title}`}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical size={14} />
                </IconButton>
              }
              items={[
                {
                  id: "open",
                  label: "Open Workspace",
                  icon: <ArrowUpRight size={13} />,
                  onClick: () => onOpen(notebook.id),
                },
                {
                  id: "edit",
                  label: "Edit Details",
                  icon: <Pencil size={13} />,
                  onClick: () => onEdit(notebook),
                },
                "separator",
                {
                  id: "delete",
                  label: "Delete Notebook",
                  icon: <Trash2 size={13} />,
                  destructive: true,
                  onClick: () => onDelete(notebook),
                },
              ]}
            />
          </div>
        </div>

        {/* Notebook Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {notebook.description || (
            <span className="italic text-muted-foreground/60">No course description provided.</span>
          )}
        </p>
      </div>

      {/* Bottom Metadata & Badges */}
      <div className="flex items-center justify-between pt-4 mt-3 border-t border-border/50 text-[11px]">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5 h-5 font-mono">
            <FileText size={10} className="text-muted-foreground" />
            <span>{notebook.source_count || 0} Sources</span>
          </Badge>

          {notebook.conversation_count !== undefined && (
            <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5 h-5 font-mono">
              <MessageSquare size={10} className="text-muted-foreground" />
              <span>{notebook.conversation_count || 0}</span>
            </Badge>
          )}
        </div>

        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Enter</span>
          <ArrowUpRight size={12} />
        </div>
      </div>
    </div>
  );
}
