import { useState, useEffect, useCallback } from "react";
import {
  FolderOpen,
  FileText,
  ArrowRight,
  MessageSquare,
  BrainCircuit,
  Trash2,
  Search,
  Plus,
  Zap,
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  type LucideIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConversations } from "@/features/conversations/ConversationContext";
import { useDocuments, type EnrichedDocument } from "@/features/documents/DocumentContext";
import { getAllGeneratedResults, type GeneratedResults } from "@/lib/db";
import {
  getDashboardStats,
  type DashboardStatsResponse,
} from "@/lib/api";

/** Dashboard — overview page. Never renders the AI Tutor chat directly. */
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
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch {
      // Silent fallback — never expose internal errors to user
      try {
        const allCached = await getAllGeneratedResults();
        let totalAI = 0;
        allCached.forEach((res: GeneratedResults) => {
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
  }, [conversations.length, documents.length]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleSelectDoc = async (doc: EnrichedDocument) => {
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
      await deleteDoc(id);
      fetchStats();
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* ── Top Hero Welcome Banner ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-card via-card/90 to-primary/10 border border-border/80 p-6 sm:p-8 md:p-10 shadow-xl">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary uppercase tracking-wider">
            <Sparkles size={13} />
            <span>AI Academic Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Elevate Your Study Workflow with <span className="text-primary">Gemini AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
            Upload PDF notes, ask questions with contextual streaming chat, and generate exam prep materials instantly.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={() => navigate("/documents")}
              className="h-10 px-5 text-xs font-bold gap-2 shadow-lg shadow-primary/20"
            >
              <Plus size={16} />
              <span>Upload New PDF</span>
            </Button>

            <Button
              onClick={() => navigate("/workspace")}
              variant="outline"
              className="h-10 px-5 text-xs font-bold gap-2 border-border/80 bg-card/60 backdrop-blur-sm"
            >
              <MessageSquare size={16} />
              <span>Start AI Tutor Chat</span>
            </Button>

            <Button
              onClick={() => navigate("/tools")}
              variant="ghost"
              className="h-10 px-4 text-xs font-bold gap-2 text-primary hover:text-primary hover:bg-primary/10"
            >
              <Zap size={15} />
              <span>Explore AI Tools</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary Stats Row ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={FileText}
          label="Uploaded Notes"
          value={statsLoading ? "..." : String(stats?.total_documents ?? documents.length)}
          subtext="Processed PDF documents"
          isLoading={statsLoading}
        />
        <SummaryCard
          icon={MessageSquare}
          label="Active Conversations"
          value={statsLoading ? "..." : String(stats?.total_conversations ?? conversations.length)}
          subtext="Saved chat threads"
          isLoading={statsLoading}
        />
        <SummaryCard
          icon={BrainCircuit}
          label="AI Study Outputs"
          value={statsLoading ? "..." : String(stats?.total_ai_generations ?? 0)}
          subtext="Generated notes & quizzes"
          isLoading={statsLoading}
        />
      </div>

      {/* ── Quick AI Tool Shortcuts ───────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <Zap size={17} className="text-primary" />
            <span>Quick Actions</span>
          </h2>
          <Button
            onClick={() => navigate("/tools")}
            variant="ghost"
            className="text-xs font-bold text-primary hover:text-primary p-0 h-auto gap-1"
          >
            <span>View All Tools</span>
            <ArrowRight size={13} />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Upload Document"
            desc="Add PDF lecture notes & textbooks"
            icon={FileText}
            onClick={() => navigate("/documents")}
          />
          <QuickActionCard
            title="AI Tutor Chat"
            desc="Ask questions with context"
            icon={MessageSquare}
            onClick={() => navigate("/workspace")}
          />
          <QuickActionCard
            title="MCQ Quiz Engine"
            desc="Generate interactive practice exams"
            icon={Award}
            onClick={() => navigate("/tools")}
          />
          <QuickActionCard
            title="Flashcard Generator"
            desc="Active recall term cards"
            icon={BrainCircuit}
            onClick={() => navigate("/tools")}
          />
        </div>
      </div>

      {/* ── Main Content Grid: Recent Documents & Activity Stream ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Document Library */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <FolderOpen size={17} className="text-primary" />
              <span>Document Library</span>
              <span className="text-xs text-muted-foreground font-semibold">({documents.length})</span>
            </h2>

            {documents.length > 0 && (
              <div className="relative w-full sm:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/60 bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            )}
          </div>

          {documents.length === 0 ? (
            <Card className="border border-border/60 bg-card/40 p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
                📄
              </div>
              <div>
                <h3 className="text-sm font-bold">No Documents Yet</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Upload your first PDF to enable AI study notes, practice questions, and interactive tutoring.
                </p>
              </div>
              <Button onClick={() => navigate("/documents")} className="h-9 px-4 text-xs font-bold gap-2">
                <Plus size={15} />
                <span>Upload PDF Notes</span>
              </Button>
            </Card>
          ) : filteredDocs.length === 0 ? (
            <Card className="border border-border/60 bg-card/40 p-6 text-center text-xs text-muted-foreground">
              No documents matching &quot;{searchQuery}&quot;
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => (
                <Card
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc)}
                  className="group relative cursor-pointer border border-border/60 bg-card hover:border-primary/60 hover:bg-muted/30 transition-all duration-200 shadow-sm"
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {doc.filename}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
                          <span>{doc.page_count} Pages</span>
                          <span>•</span>
                          <span>{(doc.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                          <span>•</span>
                          <span className="text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckCircle2 size={10} /> Ready
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDoc(doc);
                        }}
                        className="h-8 px-3 text-[11px] font-bold gap-1.5 opacity-90 group-hover:opacity-100"
                      >
                        <span>Open Chat</span>
                        <ArrowRight size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteDoc(e, doc.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Document"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1 col): Recent Activity Feed */}
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <Clock size={17} className="text-primary" />
            <span>Recent Activity</span>
          </h2>

          <Card className="border border-border/60 bg-card p-4">
            {stats?.recent_activities && stats.recent_activities.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_activities.map((act, i) => (
                  <div
                    key={act.id || i}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      {act.type === "document" ? <FileText size={14} /> : <MessageSquare size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{act.title}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{act.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center space-y-2 text-muted-foreground">
                <div className="text-2xl">⚡</div>
                <p className="text-xs font-semibold">No recent activity logged yet.</p>
                <p className="text-[10px]">Your uploads and study chats will appear here.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Summary Metric Card ──────────────────────────────────────────────
function SummaryCard({
  icon: Icon,
  label,
  value,
  subtext,
  isLoading,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subtext?: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:border-border transition-all">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <h3 className="text-xl font-extrabold text-foreground tracking-tight">
            {isLoading ? "..." : value}
          </h3>
          {subtext && <p className="text-[10px] text-muted-foreground font-medium">{subtext}</p>}
        </div>
      </div>
    </Card>
  );
}

// ── Quick Action Shortcut Card ───────────────────────────────────────
function QuickActionCard({
  title,
  desc,
  icon: Icon,
  onClick,
}: {
  title: string;
  desc: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer border border-border/60 bg-card p-4 hover:border-primary/60 hover:bg-primary/[0.04] transition-all duration-200 shadow-sm"
    >
      <div className="space-y-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit group-hover:scale-110 transition-transform">
          <Icon size={18} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
            <span>{title}</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium line-clamp-1">{desc}</p>
        </div>
      </div>
    </Card>
  );
}
