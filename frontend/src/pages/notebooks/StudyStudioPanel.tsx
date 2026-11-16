import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  GraduationCap,
  BookMarked,
  Layers,
  FileQuestion,
  Sparkles,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Loader2,
  X,
  Maximize2,
  Minimize2,
  FileText,
  BookOpen,
  Award,
  CheckSquare,
  HelpCircle,
  BrainCircuit,
  Smile,
  Zap,
} from "lucide-react";

import {
  listNotebookStudyMaterials,
  generateStudyGuide,
  generateNotebookFlashcards,
  generateExamPaper,
  deleteStudyMaterial,
  generateNotes,
  generateSummary,
  generateFiveMarkAnswer,
  generateTenMarkAnswer,
  generateMcqs,
  generateVivaQuestions,
  generateFlashcards,
  explainSimply,
  type StudyMaterialResponse,
  type SourceResponse,
  type FlashcardsContent,
  type ExamPaperContent,
  type GenerationEvent,
  type GenerationPayload,
} from "@/lib/api";
import {
  parseMCQResponse,
  parseVivaResponse,
  parseFlashcardResponse,
  type MCQResponse,
  type VivaResponse,
  type FlashcardResponse,
} from "@/lib/jsonParser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/ui/MarkdownContent";

export interface StudyStudioPanelProps {
  notebookId: string;
  notebookTitle: string;
  sources: SourceResponse[];
  onSourceClick?: (sourceId: string) => void;
}

export interface StudioToolDef {
  id: string;
  name: string;
  category: "Notes & Summaries" | "Exams & Tests" | "Concept Breakdown";
  description: string;
  badge: string;
  icon: React.ElementType;
  fn?: (input: GenerationPayload, signal?: AbortSignal) => AsyncGenerator<GenerationEvent>;
  isModalAction?: "guide" | "cards" | "exam";
}

const STUDIO_TOOLS: StudioToolDef[] = [
  // ─── 1. Notes & Summaries ──────────────────────────────────
  {
    id: "notes",
    name: "Comprehensive Notes",
    category: "Notes & Summaries",
    description: "Synthesizes course documents into key concepts, formulas, and structured definitions.",
    badge: "Core Revision",
    icon: FileText,
    fn: generateNotes,
  },
  {
    id: "summary",
    name: "Executive Summary",
    category: "Notes & Summaries",
    description: "High-level overview of core themes, key takeaways, and main academic conclusions.",
    badge: "Quick Read",
    icon: BookOpen,
    fn: generateSummary,
  },
  {
    id: "guide-modal",
    name: "Study Guide Chapters",
    category: "Notes & Summaries",
    description: "Generates multi-chapter curriculum notes saved directly to this chat workspace.",
    badge: "Saved Artifact",
    icon: BookMarked,
    isModalAction: "guide",
  },

  // ─── 2. Exams & Tests ──────────────────────────────────────
  {
    id: "5-mark",
    name: "5-Mark Exam Answer",
    category: "Exams & Tests",
    description: "Concise exam response format (150-200 words) with bullet points and bold key terms.",
    badge: "Short Answer",
    icon: Award,
    fn: generateFiveMarkAnswer,
  },
  {
    id: "10-mark",
    name: "10-Mark Exam Answer",
    category: "Exams & Tests",
    description: "In-depth essay-style response (400-500 words) with introduction, sections, and summary.",
    badge: "Essay Format",
    icon: Award,
    fn: generateTenMarkAnswer,
  },
  {
    id: "mcqs",
    name: "Interactive MCQ Quiz",
    category: "Exams & Tests",
    description: "Interactive multiple choice quiz with immediate answers, explanations, and scoring.",
    badge: "Interactive",
    icon: CheckSquare,
    fn: generateMcqs,
  },
  {
    id: "viva",
    name: "Viva Question Prep",
    category: "Exams & Tests",
    description: "Oral exam prep simulator with professor questions, expected answers, and key criteria.",
    badge: "Oral Test",
    icon: HelpCircle,
    fn: generateVivaQuestions,
  },
  {
    id: "exam-modal",
    name: "Full Exam Simulator",
    category: "Exams & Tests",
    description: "Generates a structured university exam paper with 5-mark and 10-mark sections and scoring key.",
    badge: "Timed Test",
    icon: FileQuestion,
    isModalAction: "exam",
  },

  // ─── 3. Concept Breakdown & Recall ─────────────────────────
  {
    id: "flashcards",
    name: "Spaced Flashcards",
    category: "Concept Breakdown",
    description: "Interactive flip cards designed for active recall and rapid memory consolidation.",
    badge: "Active Recall",
    icon: BrainCircuit,
    fn: generateFlashcards,
  },
  {
    id: "explain",
    name: "Explain Simply (ELI5)",
    category: "Concept Breakdown",
    description: "Simplifies complex technical topics using intuitive analogies and accessible language.",
    badge: "Intuitive",
    icon: Smile,
    fn: explainSimply,
  },
];

export function StudyStudioPanel({
  notebookId,
  notebookTitle,
  sources,
  onSourceClick,
}: StudyStudioPanelProps) {
  // Materials History State
  const [materials, setMaterials] = useState<StudyMaterialResponse[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterialResponse | null>(null);

  // Category Filter & Active Tool Running State
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeTool, setActiveTool] = useState<StudioToolDef | null>(null);
  const [isGeneratingTool, setIsGeneratingTool] = useState(false);
  const [toolOutput, setToolOutput] = useState<string>("");
  const [toolError, setToolError] = useState<string | null>(null);
  const [copiedToolOutput, setCopiedToolOutput] = useState(false);

  // Source selection & prompt context
  const [selectedSourceId, setSelectedSourceId] = useState<string>("all");
  const [topicFocus, setTopicFocus] = useState<string>("");

  // Interactive MCQ Quiz state
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);

  // Interactive Viva Prep state
  const [vivaIdx, setVivaIdx] = useState(0);
  const [vivaRevealed, setVivaRevealed] = useState(false);

  // Interactive Flashcards state
  const [cardDeckIdx, setCardDeckIdx] = useState(0);
  const [cardDeckFlipped, setCardDeckFlipped] = useState(false);

  // Expanded View State (wide reader modal)
  const [isExpanded, setIsExpanded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Modal States for Whole-Notebook Generators
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [flashcardsModalOpen, setFlashcardsModalOpen] = useState(false);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<StudyMaterialResponse | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Study Guide Form State
  const [guideTitle, setGuideTitle] = useState("");
  const [guideFocus, setGuideFocus] = useState("");
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);

  // Flashcards Form State
  const [cardsTitle, setCardsTitle] = useState("");
  const [cardsCount, setCardsCount] = useState<number>(10);
  const [cardsDifficulty, setCardsDifficulty] = useState<"Mixed" | "Easy" | "Medium" | "Hard">("Mixed");
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);

  // Exam Paper Form State
  const [examTitle, setExamTitle] = useState("");
  const [examMarks, setExamMarks] = useState<number>(50);
  const [examTypes, setExamTypes] = useState<string[]>(["five_mark", "ten_mark"]);
  const [examDifficulty, setExamDifficulty] = useState<"Mixed" | "Easy" | "Medium" | "Hard">("Mixed");
  const [examAnswerKey, setExamAnswerKey] = useState(true);
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  // Active Material Viewer Sub-States
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardViewMode, setCardViewMode] = useState<"deck" | "list">("deck");
  const [copiedNotes, setCopiedNotes] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<number, boolean>>({});

  const eligibleSources = useMemo(
    () => sources.filter((s) => s.processing_status === "completed"),
    [sources]
  );

  const fetchMaterials = async () => {
    setLoadingMaterials(true);
    setMaterialsError(null);
    try {
      const data = await listNotebookStudyMaterials(notebookId);
      setMaterials(data);
    } catch (err: any) {
      setMaterialsError(err?.message || "Failed to load study materials.");
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [notebookId]);

  // Reset active material sub-states when switching
  useEffect(() => {
    setCardIndex(0);
    setIsFlipped(false);
    setExpandedAnswers({});
    setCopiedNotes(false);
  }, [activeMaterial?.id]);

  // Resolve Generation Payload (server-side source resolution)
  const resolveGenerationPayload = (): GenerationPayload => {
    // 1. If specific source selected
    if (selectedSourceId !== "all") {
      return {
        source_id: selectedSourceId,
        extracted_text: topicFocus.trim() ? `Focus Topic: ${topicFocus.trim()}` : undefined,
      };
    }

    // 2. If notebook has completed sources, pass notebook_id for server-side resolution
    if (eligibleSources.length > 0) {
      return {
        notebook_id: notebookId,
        extracted_text: topicFocus.trim() ? `Focus Topic: ${topicFocus.trim()}` : undefined,
      };
    }

    // 3. Fallback when notebook has no sources (topic-based generation)
    return {
      extracted_text: topicFocus.trim()
        ? `Academic Subject: ${notebookTitle}. Topic: ${topicFocus.trim()}`
        : `Comprehensive overview of core concepts and topics in ${notebookTitle}`,
    };
  };

  // Run a Studio Tool
  const runStudioTool = async (tool: StudioToolDef) => {
    if (tool.isModalAction === "guide") {
      setGuideError(null);
      setGuideTitle("");
      setGuideFocus(topicFocus);
      setGuideModalOpen(true);
      return;
    }
    if (tool.isModalAction === "cards") {
      setCardsError(null);
      setCardsTitle("");
      setCardsCount(10);
      setCardsDifficulty("Mixed");
      setFlashcardsModalOpen(true);
      return;
    }
    if (tool.isModalAction === "exam") {
      setExamError(null);
      setExamTitle("");
      setExamMarks(50);
      setExamTypes(["five_mark", "ten_mark"]);
      setExamDifficulty("Mixed");
      setExamAnswerKey(true);
      setExamModalOpen(true);
      return;
    }

    if (!tool.fn) return;

    setActiveMaterial(null);
    setActiveTool(tool);
    setIsGeneratingTool(true);
    setToolOutput("");
    setToolError(null);
    setCopiedToolOutput(false);
    setQuizIdx(0);
    setQuizAnswers([]);
    setShowQuizResult(false);
    setVivaIdx(0);
    setVivaRevealed(false);
    setCardDeckIdx(0);
    setCardDeckFlipped(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payload = resolveGenerationPayload();
      let accumulated = "";

      for await (const event of tool.fn(payload, controller.signal)) {
        if (event.type === "delta" && event.text) {
          accumulated += event.text;
          setToolOutput(accumulated);
        } else if (event.type === "error") {
          setToolError(event.message || "Generation encountered an issue.");
          break;
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setToolError(err?.message || "Failed to generate resource. Please try again.");
      }
    } finally {
      setIsGeneratingTool(false);
      abortRef.current = null;
    }
  };

  const handleAbortTool = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      setIsGeneratingTool(false);
    }
  };

  const handleCopyToolOutput = () => {
    if (!toolOutput) return;
    navigator.clipboard.writeText(toolOutput);
    setCopiedToolOutput(true);
    setTimeout(() => setCopiedToolOutput(false), 2000);
  };

  // Whole-Notebook Handlers
  const handleGenerateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneratingGuide) return;
    setIsGeneratingGuide(true);
    setGuideError(null);
    try {
      const focusList = guideFocus
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const generated = await generateStudyGuide(notebookId, {
        title: guideTitle.trim() || undefined,
        focus_topics: focusList.length > 0 ? focusList : undefined,
      });

      setMaterials((prev) => [generated, ...prev]);
      setActiveMaterial(generated);
      setActiveTool(null);
      setGuideModalOpen(false);
      setGuideTitle("");
      setGuideFocus("");
    } catch (err: any) {
      setGuideError(err?.message || "Failed to generate study guide.");
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  const handleGenerateFlashcards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneratingCards) return;
    setIsGeneratingCards(true);
    setCardsError(null);
    try {
      const generated = await generateNotebookFlashcards(notebookId, {
        title: cardsTitle.trim() || undefined,
        num_cards: Number(cardsCount) || 10,
        difficulty: cardsDifficulty,
      });

      setMaterials((prev) => [generated, ...prev]);
      setActiveMaterial(generated);
      setActiveTool(null);
      setFlashcardsModalOpen(false);
      setCardsTitle("");
      setCardsCount(10);
      setCardsDifficulty("Mixed");
    } catch (err: any) {
      setCardsError(err?.message || "Failed to generate flashcards.");
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneratingExam) return;

    const marks = Number(examMarks);
    if (!marks || marks <= 0 || marks % 5 !== 0) {
      setExamError("Total marks must be a positive multiple of 5 (e.g. 25, 50, 75, 100).");
      return;
    }
    if (examTypes.length === 0) {
      setExamError("Select at least one question type (5-mark or 10-mark).");
      return;
    }

    setIsGeneratingExam(true);
    setExamError(null);
    try {
      const generated = await generateExamPaper(notebookId, {
        title: examTitle.trim() || undefined,
        total_marks: marks,
        question_types: examTypes,
        difficulty: examDifficulty,
        include_answer_key: examAnswerKey,
      });

      setMaterials((prev) => [generated, ...prev]);
      setActiveMaterial(generated);
      setActiveTool(null);
      setExamModalOpen(false);
      setExamTitle("");
      setExamMarks(50);
      setExamTypes(["five_mark", "ten_mark"]);
      setExamDifficulty("Mixed");
      setExamAnswerKey(true);
    } catch (err: any) {
      setExamError(err?.message || "Failed to generate exam paper.");
    } finally {
      setIsGeneratingExam(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!materialToDelete) return;
    setDeletingMaterial(true);
    setDeleteError(null);
    try {
      await deleteStudyMaterial(materialToDelete.id);
      setMaterials((prev) => prev.filter((m) => m.id !== materialToDelete.id));
      if (activeMaterial?.id === materialToDelete.id) {
        setActiveMaterial(null);
      }
      setDeleteModalOpen(false);
      setMaterialToDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete study material.");
    } finally {
      setDeletingMaterial(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!activeMaterial?.content) return;
    navigator.clipboard.writeText(activeMaterial.content);
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!activeMaterial?.content) return;
    const blob = new Blob([activeMaterial.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeMaterial.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  const hasNoSources = eligibleSources.length === 0;

  // Parsed structured outputs
  const mcqData = toolOutput && activeTool?.id === "mcqs" ? parseMCQResponse(toolOutput) : null;
  const vivaData = toolOutput && activeTool?.id === "viva" ? parseVivaResponse(toolOutput) : null;
  const flashcardData = toolOutput && activeTool?.id === "flashcards" ? parseFlashcardResponse(toolOutput) : null;

  // Filter tools by category
  const categories = ["All", "Notes & Summaries", "Exams & Tests", "Concept Breakdown", "Saved Materials"];
  const filteredTools = selectedCategory === "All"
    ? STUDIO_TOOLS
    : selectedCategory === "Saved Materials"
    ? []
    : STUDIO_TOOLS.filter((t) => t.category === selectedCategory);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-card/20 select-none">
      {/* ─── Studio Header Bar (Fixed / Pinned) ────────────────────── */}
      <div className="p-3.5 border-b border-border/60 shrink-0 flex items-center justify-between glass-panel-subtle backdrop-blur-md">
        <div className="flex items-center gap-2 truncate">
          <GraduationCap className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
              {activeMaterial
                ? activeMaterial.title
                : activeTool
                ? activeTool.name
                : "Study Studio"}
            </h2>
            <p className="text-[10px] text-muted-foreground truncate">
              {activeMaterial
                ? `${activeMaterial.material_type.replace("_", " ")} • ${formatDate(activeMaterial.created_at)}`
                : activeTool
                ? activeTool.description
                : "AI Study Suite & Exam Revision"}
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(activeMaterial || activeTool) && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 p-0"
                title={isExpanded ? "Collapse view" : "Expand reader"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveMaterial(null);
                  setActiveTool(null);
                }}
                className="h-7 px-2 text-[11px] font-semibold"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                Tools
              </Button>
            </>
          )}

          {!activeMaterial && !activeTool && (
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchMaterials}
              disabled={loadingMaterials}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Refresh saved materials"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMaterials ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </div>

      {/* ─── Main Scrollable Body (Independent Vertical Scrolling) ──── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3.5 space-y-4 custom-scroll">
        {/* ─── Mode 1: Active Running AI Tool Viewer ─────────────────── */}
        {activeTool && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Tool Status & Controls Banner */}
            <div className="p-3 rounded-xl glass-card flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <activeTool.icon className="w-4 h-4 text-primary shrink-0" />
                <div className="truncate">
                  <span className="text-xs font-bold text-foreground truncate block">
                    {activeTool.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {eligibleSources.length > 0
                      ? selectedSourceId === "all"
                        ? `Grounded across all ${eligibleSources.length} sources`
                        : `Grounded in ${sources.find((s) => s.id === selectedSourceId)?.display_title || "selected source"}`
                      : "General Academic AI Mode"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isGeneratingTool ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAbortTool}
                    className="h-7 px-2.5 text-[11px] text-destructive border-destructive/40 hover:bg-destructive/10"
                  >
                    Stop
                  </Button>
                ) : (
                  <>
                    {toolOutput && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyToolOutput}
                        className="h-7 px-2.5 text-[11px] gap-1"
                      >
                        {copiedToolOutput ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedToolOutput ? "Copied" : "Copy"}</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runStudioTool(activeTool)}
                      className="h-7 px-2.5 text-[11px] gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Rerun</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Error Banner */}
            {toolError && (
              <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
                <span>{toolError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runStudioTool(activeTool)}
                  className="h-6 text-[10px]"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Generating State */}
            {isGeneratingTool && !toolOutput && (
              <div className="p-8 text-center text-muted-foreground space-y-3 rounded-2xl border border-dashed border-border/80 bg-card/30">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-xs font-semibold text-foreground">
                  Generating {activeTool.name} with Gemini AI...
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Analyzing document context and structuring academic revision output.
                </p>
              </div>
            )}

            {/* 1. Interactive MCQ Quiz Output */}
            {mcqData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b border-border/40 pb-2">
                  <span>Question {quizIdx + 1} of {mcqData.questions.length}</span>
                  <Badge variant="outline" className="text-[10px]">
                    Score: {quizAnswers.filter((ans, i) => ans === mcqData.questions[i].correctAnswer).length} / {quizAnswers.length}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3 shadow-xs">
                  <p className="text-xs font-bold text-foreground leading-relaxed">
                    {mcqData.questions[quizIdx].question}
                  </p>

                  <div className="space-y-2 pt-1">
                    {mcqData.questions[quizIdx].options.map((opt, optIdx) => {
                      const isSelected = quizAnswers[quizIdx] === optIdx;
                      const hasAnswered = quizAnswers[quizIdx] !== undefined;
                      const isCorrect = optIdx === mcqData.questions[quizIdx].correctAnswer;

                      let btnStyle = "border-border/80 bg-card hover:bg-muted/60 text-foreground";
                      if (hasAnswered) {
                        if (isCorrect) {
                          btnStyle = "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 font-bold";
                        } else if (isSelected) {
                          btnStyle = "border-destructive/50 bg-destructive/10 text-destructive font-bold";
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={hasAnswered}
                          onClick={() => {
                            const newAnswers = [...quizAnswers];
                            newAnswers[quizIdx] = optIdx;
                            setQuizAnswers(newAnswers);
                          }}
                          className={`w-full p-2.5 rounded-lg border text-xs text-left transition-colors flex items-center justify-between cursor-pointer ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {hasAnswered && isCorrect && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {quizAnswers[quizIdx] !== undefined && mcqData.questions[quizIdx].explanation && (
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-muted-foreground leading-relaxed mt-2">
                      <span className="font-bold text-foreground block mb-0.5">Explanation:</span>
                      {mcqData.questions[quizIdx].explanation}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={quizIdx === 0}
                      onClick={() => setQuizIdx((p) => p - 1)}
                      className="h-7 text-xs font-semibold"
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={quizIdx + 1 >= mcqData.questions.length}
                      onClick={() => setQuizIdx((p) => p + 1)}
                      className="h-7 text-xs font-semibold"
                    >
                      Next Question
                    </Button>
                  </div>
                </div>
              </div>
            ) : vivaData ? (
              /* 2. Interactive Viva Question Prep Simulator */
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b border-border/40 pb-2">
                  <span>Viva Question {vivaIdx + 1} of {vivaData.questions.length}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {vivaData.questions[vivaIdx].difficulty || "Medium"}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3 shadow-xs">
                  <p className="text-xs font-bold text-foreground leading-relaxed">
                    {vivaData.questions[vivaIdx].question}
                  </p>

                  {vivaRevealed ? (
                    <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-1.5 animate-in fade-in duration-150">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                        Expected Answer & Key Points:
                      </span>
                      <p className="text-xs text-foreground leading-relaxed">
                        {vivaData.questions[vivaIdx].expectedAnswer}
                      </p>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setVivaRevealed(true)}
                      className="h-8 text-xs font-bold text-primary border-primary/40 hover:bg-primary/10 gap-1.5"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Reveal Answer & Key Points</span>
                    </Button>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={vivaIdx === 0}
                      onClick={() => {
                        setVivaIdx((p) => p - 1);
                        setVivaRevealed(false);
                      }}
                      className="h-7 text-xs font-semibold"
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={vivaIdx + 1 >= vivaData.questions.length}
                      onClick={() => {
                        setVivaIdx((p) => p + 1);
                        setVivaRevealed(false);
                      }}
                      className="h-7 text-xs font-semibold"
                    >
                      Next Question
                    </Button>
                  </div>
                </div>
              </div>
            ) : flashcardData ? (
              /* 3. Interactive Spaced Flashcards Engine */
              <div className="space-y-4 text-center">
                <div className="text-xs font-bold text-muted-foreground">
                  Card {cardDeckIdx + 1} of {flashcardData.flashcards.length}
                </div>

                <div
                  onClick={() => setCardDeckFlipped((p) => !p)}
                  className="min-h-[190px] p-6 rounded-2xl glass-card shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35),0_0_20px_rgba(198,244,50,0.15)] transition-all duration-300 transform active:scale-[0.985]"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
                    {cardDeckFlipped ? "Answer" : "Question (Click to flip)"}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-foreground leading-relaxed">
                    {cardDeckFlipped
                      ? flashcardData.flashcards[cardDeckIdx].back
                      : flashcardData.flashcards[cardDeckIdx].front}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cardDeckIdx === 0}
                    onClick={() => {
                      setCardDeckIdx((p) => p - 1);
                      setCardDeckFlipped(false);
                    }}
                    className="h-7 text-xs font-semibold"
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cardDeckIdx + 1 >= flashcardData.flashcards.length}
                    onClick={() => {
                      setCardDeckIdx((p) => p + 1);
                      setCardDeckFlipped(false);
                    }}
                    className="h-7 text-xs font-semibold"
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              /* 4. Streamed Markdown Output (Notes, Summary, 5-Mark, 10-Mark, Explain Simply) */
              <div className="p-4 rounded-xl border border-border/80 bg-card/60 shadow-xs space-y-3">
                <div className="prose prose-invert max-w-none text-xs leading-relaxed">
                  <MarkdownContent content={toolOutput} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Mode 2: Active Saved Material Viewer ───────────────────── */}
        {!activeTool && activeMaterial && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Grounding Transparency Box */}
            <div className="p-3 rounded-xl border border-border/60 bg-card/60 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  Grounding Sources ({activeMaterial.source_references?.length || 0})
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-bold py-0 px-1.5"
                >
                  {activeMaterial.material_type.replace("_", " ")}
                </Badge>
              </div>

              {activeMaterial.source_references && activeMaterial.source_references.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {activeMaterial.source_references.map((src, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSourceClick?.(src.source_id)}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors truncate max-w-[200px]"
                      title={`Source: ${src.title}`}
                    >
                      {src.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">General course synthesis</p>
              )}

              {activeMaterial.configuration?.truncated && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] flex items-center gap-1.5 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Context budget reached: A balanced subset of chunks from your documents was analyzed.
                  </span>
                </div>
              )}
            </div>

            {/* 1. Study Guide Viewer */}
            {activeMaterial.material_type === "study_guide" && (
              <div className="space-y-3">
                <div className="flex items-center justify-end gap-2 border-b border-border/40 pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyMarkdown}
                    className="h-7 text-[11px] gap-1"
                  >
                    {copiedNotes ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadMarkdown}
                    className="h-7 text-[11px] gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .md</span>
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-border/80 bg-card/60 shadow-xs prose prose-invert max-w-none text-xs leading-relaxed">
                  <MarkdownContent content={activeMaterial.content || ""} />
                </div>
              </div>
            )}

            {/* 2. Flashcards Viewer */}
            {activeMaterial.material_type === "flashcards" && (() => {
              const parsed: FlashcardsContent = (() => {
                try {
                  return JSON.parse(activeMaterial.content || "{}");
                } catch {
                  return { flashcards: [] };
                }
              })();
              const cards = parsed.flashcards || [];

              if (cards.length === 0) {
                return (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    No flashcards found in this material.
                  </div>
                );
              }

              const currentCard = cards[cardIndex] || cards[0];

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2 text-[11px] text-muted-foreground">
                    <span className="font-bold">
                      Card {cardIndex + 1} of {cards.length}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {currentCard.difficulty || "Mixed"}
                    </Badge>
                  </div>

                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="min-h-[180px] p-6 rounded-2xl border border-border/80 bg-card/60 shadow-md flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all duration-200"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
                      {isFlipped ? "Answer" : "Question (Click to flip)"}
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-foreground leading-relaxed text-center">
                      {isFlipped ? currentCard.back : currentCard.front}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cardIndex === 0}
                      onClick={() => {
                        setCardIndex((p) => p - 1);
                        setIsFlipped(false);
                      }}
                      className="h-7 text-xs font-semibold"
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cardIndex + 1 >= cards.length}
                      onClick={() => {
                        setCardIndex((p) => p + 1);
                        setIsFlipped(false);
                      }}
                      className="h-7 text-xs font-semibold"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* 3. Exam Paper Viewer */}
            {activeMaterial.material_type === "exam_paper" && (() => {
              const parsed: ExamPaperContent = (() => {
                try {
                  return JSON.parse(activeMaterial.content || "{}");
                } catch {
                  return {
                    title: activeMaterial.title,
                    total_marks: 0,
                    instructions: [],
                    questions: [],
                  };
                }
              })();
              const questions = parsed.questions || [];

              return (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border border-border/80 bg-card/60 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-bold text-foreground">
                      <span>{parsed.title}</span>
                      <Badge variant="lime" className="text-[10px]">
                        {parsed.total_marks} Marks
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {questions.map((q) => {
                      const isExpanded = Boolean(expandedAnswers[q.question_number]);
                      return (
                        <div
                          key={q.question_number}
                          className="p-3 rounded-xl border border-border/80 bg-card/60 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-primary">Q{q.question_number}</span>
                            <Badge variant="outline" className="text-[9px]">
                              {q.marks} Marks
                            </Badge>
                          </div>
                          <p className="text-foreground font-medium leading-relaxed">
                            {q.question_text}
                          </p>

                          {q.model_answer && (
                            <div className="pt-2 border-t border-border/40">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedAnswers((p) => ({
                                    ...p,
                                    [q.question_number]: !isExpanded,
                                  }))
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                              >
                                {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                <span>{isExpanded ? "Hide Solution" : "Show Solution"}</span>
                              </button>

                              {isExpanded && (
                                <div className="mt-2 p-2.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                  {q.model_answer}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Delete Active Material Action */}
            <div className="pt-3 border-t border-border/60 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveMaterial(null)}
                className="h-7 text-xs font-semibold"
              >
                Back to All
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setMaterialToDelete(activeMaterial);
                  setDeleteError(null);
                  setDeleteModalOpen(true);
                }}
                className="h-7 text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* ─── Mode 3: Tools Directory & Saved Materials ─────────────── */}
        {!activeTool && !activeMaterial && (
          <div className="space-y-4">
            {/* Grounding Context Selector */}
            <div className="p-3 rounded-xl border border-border/70 bg-card/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Source Grounding
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {eligibleSources.length} {eligibleSources.length === 1 ? "source" : "sources"} available
                </span>
              </div>

              {sources.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={selectedSourceId}
                    onChange={(e) => setSelectedSourceId(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg text-xs bg-muted/60 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">
                      All Chat Sources ({eligibleSources.length} processed)
                    </option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_title || s.original_filename} ({s.processing_status})
                      </option>
                    ))}
                  </select>

                  <Input
                    type="text"
                    placeholder="Optional topic focus (e.g. Chapter 3, Formulas)..."
                    value={topicFocus}
                    onChange={(e) => setTopicFocus(e.target.value)}
                    className="h-8 text-xs bg-card"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    No documents uploaded to this chat. You can still generate study materials by specifying any topic below:
                  </p>
                  <Input
                    type="text"
                    placeholder="Enter academic topic or concept to generate..."
                    value={topicFocus}
                    onChange={(e) => setTopicFocus(e.target.value)}
                    className="h-8 text-xs bg-card"
                  />
                </div>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat === "Saved Materials" ? `Saved (${materials.length})` : cat}
                </button>
              ))}
            </div>

            {/* AI Tools Grid */}
            {selectedCategory !== "Saved Materials" && (
              <div className="grid grid-cols-1 gap-2">
                {filteredTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => runStudioTool(tool)}
                      className="p-3 rounded-xl glass-card-interactive text-left group flex items-start justify-between cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <div className="space-y-1 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {tool.name}
                          </span>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground uppercase">
                            {tool.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Saved Materials Section */}
            {(selectedCategory === "All" || selectedCategory === "Saved Materials") && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between text-xs">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Saved Materials ({materials.length})
                  </h3>
                </div>

                {loadingMaterials && (
                  <div className="p-4 text-center text-muted-foreground space-y-2">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                    <p className="text-[11px]">Loading saved study artifacts...</p>
                  </div>
                )}

                {materialsError && (
                  <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
                    <span>{materialsError}</span>
                    <Button variant="outline" size="sm" onClick={fetchMaterials} className="h-6 text-[10px]">
                      Retry
                    </Button>
                  </div>
                )}

                {!loadingMaterials && !materialsError && materials.length === 0 && (
                  <div className="p-6 text-center rounded-xl border border-dashed border-border/80 bg-card/30 space-y-1.5 my-2">
                    <GraduationCap className="w-6 h-6 mx-auto text-muted-foreground/60" />
                    <p className="text-xs font-bold text-foreground">No saved materials yet</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Run any tool above to generate study guides, question sets, or flashcards.
                    </p>
                  </div>
                )}

                {!loadingMaterials && !materialsError && materials.length > 0 && (
                  <div className="space-y-2">
                    {materials.map((mat) => {
                      const isGuide = mat.material_type === "study_guide";
                      const isCards = mat.material_type === "flashcards";

                      return (
                        <div
                          key={mat.id}
                          onClick={() => setActiveMaterial(mat)}
                          className="p-3 rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/50 cursor-pointer transition-all duration-150 flex items-center justify-between group shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                              {isGuide ? (
                                <BookMarked className="w-4 h-4" />
                              ) : isCards ? (
                                <Layers className="w-4 h-4" />
                              ) : (
                                <FileQuestion className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-foreground truncate block group-hover:text-primary transition-colors">
                                {mat.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(mat.created_at)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODAL: Study Guide Generator ───────────────────────────────── */}
      <Dialog
        open={guideModalOpen}
        onOpenChange={setGuideModalOpen}
        title="Generate Study Guide"
        description="Creates comprehensive revision notes across your course materials."
      >
        <form onSubmit={handleGenerateGuide} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-foreground">Guide Title (Optional)</label>
            <Input
              type="text"
              placeholder={`e.g. ${notebookTitle} Revision Guide`}
              value={guideTitle}
              onChange={(e) => setGuideTitle(e.target.value)}
              disabled={isGeneratingGuide}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-foreground">Focus Topics (Optional, comma-separated)</label>
            <Input
              type="text"
              placeholder="e.g. Memory Management, Virtual Memory, Paging"
              value={guideFocus}
              onChange={(e) => setGuideFocus(e.target.value)}
              disabled={isGeneratingGuide}
            />
          </div>

          {guideError && (
            <p className="text-xs text-destructive font-medium">{guideError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setGuideModalOpen(false)}
              disabled={isGeneratingGuide}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="lime"
              isLoading={isGeneratingGuide}
            >
              Generate Guide
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ─── MODAL: Flashcards Generator ─────────────────────────────────── */}
      <Dialog
        open={flashcardsModalOpen}
        onOpenChange={setFlashcardsModalOpen}
        title="Generate Flashcards"
        description="Creates interactive Q&A flashcards for active recall practice."
      >
        <form onSubmit={handleGenerateFlashcards} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-foreground">Deck Title (Optional)</label>
            <Input
              type="text"
              placeholder={`e.g. ${notebookTitle} Key Terms`}
              value={cardsTitle}
              onChange={(e) => setCardsTitle(e.target.value)}
              disabled={isGeneratingCards}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Number of Cards</label>
              <Input
                type="number"
                min={3}
                max={30}
                value={cardsCount}
                onChange={(e) => setCardsCount(Number(e.target.value))}
                disabled={isGeneratingCards}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Difficulty</label>
              <select
                value={cardsDifficulty}
                onChange={(e) => setCardsDifficulty(e.target.value as any)}
                disabled={isGeneratingCards}
                className="w-full h-9 px-3 rounded-lg text-xs bg-muted/60 border border-border text-foreground"
              >
                <option value="Mixed">Mixed</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {cardsError && (
            <p className="text-xs text-destructive font-medium">{cardsError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFlashcardsModalOpen(false)}
              disabled={isGeneratingCards}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="lime"
              isLoading={isGeneratingCards}
            >
              Generate Cards
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ─── MODAL: Exam Paper Generator ─────────────────────────────────── */}
      <Dialog
        open={examModalOpen}
        onOpenChange={setExamModalOpen}
        title="Generate Exam Paper"
        description="Constructs a balanced university-style examination paper."
      >
        <form onSubmit={handleGenerateExam} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-foreground">Paper Title (Optional)</label>
            <Input
              type="text"
              placeholder={`e.g. ${notebookTitle} End-Semester Exam`}
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              disabled={isGeneratingExam}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Total Marks (multiple of 5)</label>
              <Input
                type="number"
                step={5}
                min={10}
                max={100}
                value={examMarks}
                onChange={(e) => setExamMarks(Number(e.target.value))}
                disabled={isGeneratingExam}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Difficulty</label>
              <select
                value={examDifficulty}
                onChange={(e) => setExamDifficulty(e.target.value as any)}
                disabled={isGeneratingExam}
                className="w-full h-9 px-3 rounded-lg text-xs bg-muted/60 border border-border text-foreground"
              >
                <option value="Mixed">Mixed</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-foreground">Question Types</label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={examTypes.includes("five_mark")}
                  onChange={(e) => {
                    if (e.target.checked) setExamTypes((p) => [...p, "five_mark"]);
                    else setExamTypes((p) => p.filter((t) => t !== "five_mark"));
                  }}
                  disabled={isGeneratingExam}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>5-Mark Questions</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={examTypes.includes("ten_mark")}
                  onChange={(e) => {
                    if (e.target.checked) setExamTypes((p) => [...p, "ten_mark"]);
                    else setExamTypes((p) => p.filter((t) => t !== "ten_mark"));
                  }}
                  disabled={isGeneratingExam}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>10-Mark Questions</span>
              </label>
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={examAnswerKey}
                onChange={(e) => setExamAnswerKey(e.target.checked)}
                disabled={isGeneratingExam}
                className="rounded text-primary focus:ring-primary"
              />
              <span>Include model solutions and scoring criteria</span>
            </label>
          </div>

          {examError && (
            <p className="text-xs text-destructive font-medium">{examError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setExamModalOpen(false)}
              disabled={isGeneratingExam}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="lime"
              isLoading={isGeneratingExam}
            >
              Generate Exam Paper
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ─── MODAL: Delete Material Confirmation ─────────────────────────── */}
      <Dialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Study Material"
        description="Permanently remove this generated material."
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to delete{" "}
            <strong className="text-foreground font-bold">
              {materialToDelete?.title}
            </strong>
            ? This cannot be undone.
          </p>

          {deleteError && (
            <p className="text-xs text-destructive font-medium">{deleteError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingMaterial}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              isLoading={deletingMaterial}
            >
              Delete Material
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
