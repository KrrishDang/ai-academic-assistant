import { BookOpen, Plus, Sparkles, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function NotebooksPlaceholderPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Notebooks
            </h1>
            <Badge variant="lime">Phase 3B Preview</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Course-scoped AI notebooks with grounded document synthesis and citations
          </p>
        </div>

        <Button variant="lime" size="sm" className="gap-2 shadow-xs" disabled>
          <Plus size={15} aria-hidden="true" />
          <span>New Notebook</span>
        </Button>
      </div>

      {/* Placeholder State Card */}
      <Card className="border-border/80 border-dashed bg-card/60 p-8 text-center">
        <CardContent className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto pt-4">
          <div className="h-14 w-14 rounded-2xl bg-[#C6F432]/10 border border-[#C6F432]/30 flex items-center justify-center text-[#C6F432] shadow-sm">
            <FolderKanban size={28} className="text-[#C6F432]" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground">
              Notebook Workspace Foundation Ready
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Phase 2A (Source Ingestion) and Phase 2B (Gemini Grounding) backends are fully active.
              The comprehensive interactive Notebook Workspace UI will be built in Phase 3B.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <Badge variant="secondary">PDF, DOCX, PPTX, TXT</Badge>
            <Badge variant="secondary">Gemini 2.5 Flash Grounding</Badge>
            <Badge variant="secondary">Structured Citations</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
