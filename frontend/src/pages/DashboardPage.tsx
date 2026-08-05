import { useState, useEffect } from "react";
import {
  FolderOpen,
  FileText,
  ArrowRight,
  MessageSquare,
  BrainCircuit,
  Trash2,
  Search,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConversations } from "@/features/conversations/ConversationContext";
import { useDocuments } from "@/features/documents/DocumentContext";
import { getAllGeneratedResults } from "@/lib/db";
import {
  getDashboardStats,
  type DashboardStatsResponse,
} from "@/lib/api";

/** Dashboard — overview page. Never renders the AI Tutor chat. */
export function DashboardPage() {
  const { conversations, selectConversation, createNewConversation } =
    useConversations();
  const { documents, selectDocument, deleteDoc } = useDocuments();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Silent stats fetch with automatic local fallback ──────────────
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch {
      // Silent fallback — never expose internal errors to user
      try {
        const allCached = await getAllGeneratedResults();
        let totalAI = 0;
        allCached.forEach((res: any) => {
          if (res.notes) totalAI++;
          if (res.mcqs) totalAI++;
          if (res.viva) totalAI++;
          if (res.fiveMarks) totalAI++;
          if (res.tenMarks) totalAI++;
          if (res.explanation) totalAI++;
          if (res.flashcards) totalAI++;
          if (res.summary) totalAI++;
        });
        setStats({
          total_documents: documents.length,
          total_conversations: conversations.length,
          total_ai_generations: totalAI,
          recent_conversations: [],
          recent_documents: [],
          recent_activities: [],
        });
      } catch {
        // Even the local fallback failed — show zeros, stay silent
        setStats({
          total_documents: documents.length,
          total_conversations: conversations.length,
          total_ai_generations: 0,
          recent_conversations: [],
          recent_documents: [],
          recent_activities: [],
        });
      }
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [documents.length, conversations.length]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleSelectDoc = async (doc: any) => {
    await selectDocument(doc);
    const existing = conversations.find((c) => c.document_id === doc.id);
    if (existing) {
      await selectConversation(existing);
    } else {
      await createNewConversation(doc.id, doc.filename);
    }
    navigate("/workspace");
  };

  const handleDeleteDoc = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteDoc(id);
      } catch {
        /* handled by context */
      }
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Empty state — first‐time welcome ─────────────────────────────
  if (documents.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in flex flex-col justify-center min-h-[60vh]">
        <div className="max-w-md mx-auto text-center py-12 space-y-6 bg-card border border-border/60 rounded-2xl p-8 shadow-lg">
          <div className="text-5xl">📄</div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Welcome to Study Hub
          </h2>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed">
            Upload your first document to start chatting with your AI Tutor and
            generate study materials.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => navigate("/upload")}
              className="h-10 px-6 font-bold flex items-center justify-center gap-1.5 mx-auto active:scale-[0.98] transition-all shadow-md"
            >
              <Plus size={16} />
              <span>Upload Document</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main dashboard ───────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fade-in relative pb-10">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#b4befe]">
          Dashboard
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome Back</h1>
        <p className="text-muted-foreground text-xs font-medium">
          Continue where you left off or upload a new document.
        </p>
      </header>

      {/* Stats row */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <SummaryCard
          icon={FolderOpen}
          label="Documents"
          value={stats ? `${stats.total_documents}` : `${documents.length}`}
          isLoading={statsLoading}
          subtext="Documents in your library"
        />
        <SummaryCard
          icon={MessageSquare}
          label="AI Conversations"
          value={
            stats ? `${stats.total_conversations}` : `${conversations.length}`
          }
          isLoading={statsLoading}
          subtext="Document conversations"
        />
        <SummaryCard
          icon={BrainCircuit}
          label="Study Materials"
          value={stats ? `${stats.total_ai_generations}` : "0"}
          isLoading={statsLoading}
          subtext="Generated resources"
        />
      </section>

      {/* Document Library */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Document Library
          </h2>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full rounded-lg border border-input bg-background/50 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#b4befe]/40"
            />
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Upload card */}
          <Card
            onClick={() => navigate("/upload")}
            className="hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all duration-200 border border-dashed border-[#b4befe]/30 bg-[#b4befe]/[0.03] hover:bg-[#b4befe]/[0.07] rounded-xl flex flex-col items-center justify-center p-6 text-center h-[200px] group"
          >
            <div className="rounded-full bg-[#b4befe]/15 p-3 text-[#b4befe] mb-3 group-hover:scale-105 transition-transform duration-200">
              <Plus size={22} />
            </div>
            <h3 className="text-sm font-bold text-foreground">Upload Document</h3>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">
              PDF up to 20 MB
            </p>
          </Card>

          {/* Doc cards */}
          {filteredDocuments.map((doc) => (
            <Card
              key={doc.id}
              onClick={() => handleSelectDoc(doc)}
              className="hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all duration-200 bg-card shadow-sm hover:shadow-md border border-border/60 rounded-xl flex flex-col justify-between p-4 sm:p-5 h-[200px] group relative overflow-hidden"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="rounded-lg bg-[#b4befe]/10 p-2 text-[#b4befe] shrink-0">
                    <FileText size={15} />
                  </div>
                  <h3
                    className="text-xs font-bold text-foreground truncate"
                    title={doc.filename}
                  >
                    {doc.filename}
                  </h3>
                </div>

                {/* Metadata */}
                <div className="text-[10px] font-medium text-muted-foreground space-y-1.5 mt-1">
                  <div className="flex justify-between">
                    <span>Pages</span>
                    <span className="text-foreground font-semibold">
                      {doc.page_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resources</span>
                    <span className="text-[#b4befe] font-bold">
                      {doc.generatedCount || 0} Available
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Opened</span>
                    <span className="text-foreground/70 font-medium">
                      {doc.lastOpened
                        ? new Date(doc.lastOpened).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div
                className="mt-auto pt-3 border-t border-border/20 flex items-center justify-between gap-1.5 sm:gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <Button
                    onClick={() => handleSelectDoc(doc)}
                    variant="outline"
                    className="h-7 px-2 sm:px-2.5 text-[10px] font-bold border-border/50 text-muted-foreground hover:text-foreground active:scale-[0.98]"
                  >
                    Open Resources
                  </Button>
                  <Button
                    onClick={(e) => handleDeleteDoc(e, doc.id)}
                    variant="outline"
                    className="h-7 w-7 p-0 flex items-center justify-center border-border/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.98] shrink-0"
                    title="Delete document"
                  >
                    <Trash2 size={11} />
                  </Button>
                </div>

                <Button
                  onClick={() => handleSelectDoc(doc)}
                  className="h-7 px-2.5 sm:px-3 text-[10px] font-bold flex items-center gap-1 active:scale-[0.98] shrink-0"
                >
                  <span>Open AI Tutor</span>
                  <ArrowRight size={10} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────
function SummaryCard({
  icon: Icon,
  label,
  value,
  subtext,
  isLoading,
}: {
  icon: any;
  label: string;
  value: string;
  subtext?: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="hover:scale-[1.01] transition-all duration-200 bg-card shadow-sm hover:shadow-md border border-border/60 rounded-xl">
      <CardContent className="flex items-center gap-4 pt-5 p-5">
        <div className="rounded-lg bg-[#b4befe]/10 p-2.5 text-[#b4befe]">
          <Icon size={17} aria-hidden="true" />
        </div>
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          {isLoading ? (
            <div className="h-6 w-14 bg-muted animate-pulse rounded mt-0.5" />
          ) : (
            <p className="text-xl font-extrabold tracking-tight truncate">
              {value}
            </p>
          )}
          {subtext && (
            <p className="text-[10px] text-muted-foreground/70 font-medium truncate">
              {subtext}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
