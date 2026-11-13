import React, { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";

import {
  listNotebookStudyMaterials,
  generateStudyGuide,
  generateNotebookFlashcards,
  generateExamPaper,
  deleteStudyMaterial,
  type StudyMaterialResponse,
  type SourceResponse,
  type FlashcardsContent,
  type ExamPaperContent,
} from "@/lib/api";
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

  // Expanded View State (wide reader modal)
  const [isExpanded, setIsExpanded] = useState(false);

  // Generation Modal States
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

  // Active Material Viewer States
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

  // Reset active material sub-states when switching active material
  useEffect(() => {
    setCardIndex(0);
    setIsFlipped(false);
    setExpandedAnswers({});
    setCopiedNotes(false);
  }, [activeMaterial?.id]);

  // Handle Study Guide Generation
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
      setGuideModalOpen(false);
      setGuideTitle("");
      setGuideFocus("");
    } catch (err: any) {
      setGuideError(err?.message || "Failed to generate study guide.");
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  // Handle Flashcards Generation
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

  // Handle Exam Paper Generation
  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneratingExam) return;

    // Client-side math feasibility validation
    const marks = Number(examMarks);
    if (!marks || marks <= 0 || marks % 5 !== 0) {
      setExamError("Total marks must be a positive multiple of 5 (e.g. 25, 50, 75, 100).");
      return;
    }
    if (examTypes.length === 0) {
      setExamError("Select at least one question type (5-mark or 10-mark).");
      return;
    }
    if (examTypes.length === 1 && examTypes[0] === "ten_mark" && marks % 10 !== 0) {
      setExamError("When only 10-mark questions are selected, total marks must be a multiple of 10.");
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

  // Handle Material Deletion
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

  // Copy Markdown Action
  const handleCopyMarkdown = () => {
    if (!activeMaterial?.content) return;
    navigator.clipboard.writeText(activeMaterial.content);
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  // Download Markdown Action
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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card/20">
      {/* ─── Studio Header Bar ────────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-border/60 shrink-0 flex items-center justify-between bg-card/40 backdrop-blur-sm">
        <div className="flex items-center gap-2 truncate">
          <GraduationCap className="w-4 h-4 text-[#C6F432] shrink-0" />
          <div>
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
              {activeMaterial ? activeMaterial.title : "Study Studio"}
            </h2>
            <p className="text-[10px] text-muted-foreground truncate">
              {activeMaterial
                ? `${activeMaterial.material_type.replace("_", " ")} • ${formatDate(activeMaterial.created_at)}`
                : "Course-wide synthesis & exam revision"}
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeMaterial && (
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
                onClick={() => setActiveMaterial(null)}
                className="h-7 px-2 text-[11px]"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                All
              </Button>
            </>
          )}

          {!activeMaterial && (
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchMaterials}
              disabled={loadingMaterials}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Refresh materials"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMaterials ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </div>

      {/* ─── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Knowledge Base Check Warning */}
        {hasNoSources && (
          <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">No eligible documents uploaded</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Add and process course documents in the Sources panel first. Generation requires at least one processed document.
              </p>
            </div>
          </div>
        )}

        {/* ─── Mode A: Active Material Detail Viewer ─────────────────────── */}
        {activeMaterial ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Grounding Transparency Box */}
            <div className="p-3 rounded-xl border border-border/60 bg-card/60 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C6F432]" />
                  Grounding Sources ({activeMaterial.source_references?.length || 0})
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-bold py-0 px-1.5"
                >
                  {activeMaterial.material_type.replace("_", " ")}
                </Badge>
              </div>

              {/* Source Reference Badges */}
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

              {/* Truncation Warning Disclosure */}
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
                {/* Actions Toolbar */}
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

                {/* Markdown Notes Viewer */}
                <div className="p-4 rounded-xl border border-border/80 bg-card/60 text-xs leading-relaxed overflow-x-auto shadow-xs">
                  <MarkdownContent content={activeMaterial.content || "No content generated."} />
                </div>
              </div>
            )}

            {/* 2. Flashcards Viewer */}
            {activeMaterial.material_type === "flashcards" && (() => {
              const structured = activeMaterial.structured_content as FlashcardsContent | null;
              const cards = structured?.flashcards || [];

              if (cards.length === 0) {
                return (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    No flashcards found in this collection.
                  </div>
                );
              }

              const currentCard = cards[cardIndex] || cards[0];

              return (
                <div className="space-y-3">
                  {/* Deck Toolbar */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">
                      Card {cardIndex + 1} of {cards.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant={cardViewMode === "deck" ? "lime" : "outline"}
                        size="sm"
                        onClick={() => setCardViewMode("deck")}
                        className="h-6 text-[10px] px-2 font-bold"
                      >
                        Flip Deck
                      </Button>
                      <Button
                        variant={cardViewMode === "list" ? "lime" : "outline"}
                        size="sm"
                        onClick={() => setCardViewMode("list")}
                        className="h-6 text-[10px] px-2 font-bold"
                      >
                        All Cards
                      </Button>
                    </div>
                  </div>

                  {/* Interactive Flip Card (Deck Mode) */}
                  {cardViewMode === "deck" ? (
                    <div className="space-y-3">
                      <div
                        onClick={() => setIsFlipped(!isFlipped)}
                        className={`min-h-[220px] p-6 rounded-2xl border cursor-pointer select-none transition-all duration-300 flex flex-col justify-between shadow-sm relative group ${
                          isFlipped
                            ? "bg-[#C6F432]/10 border-[#C6F432]/40"
                            : "bg-card border-border/80 hover:border-primary/50"
                        }`}
                        title="Click to flip card"
                      >
                        {/* Card Header Tags */}
                        <div className="flex items-center justify-between text-[10px] gap-2">
                          <span className="font-bold uppercase tracking-wider text-muted-foreground">
                            {isFlipped ? "Answer / Solution" : "Question / Concept"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {currentCard.topic && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                                {currentCard.topic}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[9px] py-0 px-1.5 font-bold ${
                                currentCard.difficulty === "Easy"
                                  ? "text-emerald-500 border-emerald-500/30"
                                  : currentCard.difficulty === "Hard"
                                  ? "text-destructive border-destructive/30"
                                  : "text-amber-500 border-amber-500/30"
                              }`}
                            >
                              {currentCard.difficulty}
                            </Badge>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="py-4 my-auto">
                          <p className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                            {isFlipped ? currentCard.back : currentCard.front}
                          </p>
                        </div>

                        {/* Card Footer */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                          <span className="truncate max-w-[200px]">
                            {currentCard.source_reference ? `Ref: ${currentCard.source_reference}` : ""}
                          </span>
                          <span className="flex items-center gap-1 text-[#C6F432] font-semibold">
                            <RotateCw className="w-3 h-3" />
                            {isFlipped ? "Click to see question" : "Click to flip answer"}
                          </span>
                        </div>
                      </div>

                      {/* Navigation Controls */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={cardIndex === 0}
                          onClick={() => {
                            setCardIndex((prev) => Math.max(0, prev - 1));
                            setIsFlipped(false);
                          }}
                          className="flex-1 h-8 text-xs font-semibold"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsFlipped(!isFlipped)}
                          className="px-3 h-8 text-xs"
                          title="Flip card"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="lime"
                          size="sm"
                          disabled={cardIndex >= cards.length - 1}
                          onClick={() => {
                            setCardIndex((prev) => Math.min(cards.length - 1, prev + 1));
                            setIsFlipped(false);
                          }}
                          className="flex-1 h-8 text-xs font-bold"
                        >
                          Next
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* All Cards List Mode */
                    <div className="space-y-2.5">
                      {cards.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-foreground">
                              {idx + 1}. {c.front}
                            </span>
                            <Badge variant="outline" className="text-[9px] shrink-0">
                              {c.difficulty}
                            </Badge>
                          </div>
                          <div className="p-2.5 rounded-lg bg-muted/40 text-muted-foreground text-[11px] leading-relaxed border border-border/40">
                            {c.back}
                          </div>
                          {c.source_reference && (
                            <p className="text-[9px] text-muted-foreground/80 italic">
                              Source: {c.source_reference}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 3. Exam Paper Viewer */}
            {activeMaterial.material_type === "exam_paper" && (() => {
              const structured = activeMaterial.structured_content as ExamPaperContent | null;
              const questions = structured?.questions || [];
              const totalMarks = structured?.total_marks || 0;
              const instructions = structured?.instructions || [];

              return (
                <div className="space-y-4">
                  {/* Exam Instructions Banner */}
                  <div className="p-3 rounded-xl border border-border/60 bg-card/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-foreground">{structured?.title || "Examination Paper"}</h4>
                      <Badge variant="lime" className="text-[10px] font-bold">
                        {totalMarks} Total Marks
                      </Badge>
                    </div>
                    {instructions.length > 0 && (
                      <div className="space-y-1 pt-1 text-[11px] text-muted-foreground border-t border-border/40">
                        {instructions.map((inst, iIdx) => (
                          <p key={iIdx} className="flex items-start gap-1.5">
                            <span className="font-bold text-[#C6F432]">&bull;</span>
                            <span>{inst}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Questions List */}
                  <div className="space-y-3">
                    {questions.map((q) => {
                      const isExpanded = Boolean(expandedAnswers[q.question_number]);
                      const hasAnswer = Boolean(q.model_answer);

                      return (
                        <div
                          key={q.question_number}
                          className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-2.5 text-xs shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-primary text-[11px] uppercase">
                              Question {q.question_number}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] uppercase">
                                {q.difficulty}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-foreground font-medium leading-relaxed">
                            {q.question_text}
                          </p>

                          {q.source_reference && (
                            <p className="text-[10px] text-muted-foreground/80 italic">
                              Reference: {q.source_reference}
                            </p>
                          )}

                          {/* Model Solution Accordion */}
                          {hasAnswer && (
                            <div className="pt-2 border-t border-border/40 space-y-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedAnswers((prev) => ({
                                    ...prev,
                                    [q.question_number]: !isExpanded,
                                  }))
                                }
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C6F432] hover:underline"
                              >
                                {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                <span>{isExpanded ? "Hide Model Solution" : "Show Model Solution & Scoring Key"}</span>
                              </button>

                              {isExpanded && (
                                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-[11px] space-y-2 animate-in fade-in duration-150">
                                  <div>
                                    <span className="font-bold text-foreground block mb-0.5">Model Answer:</span>
                                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                      {q.model_answer}
                                    </p>
                                  </div>
                                  {q.key_points && q.key_points.length > 0 && (
                                    <div className="pt-1.5 border-t border-border/30">
                                      <span className="font-bold text-foreground block mb-0.5">Key Points & Marking Scheme:</span>
                                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                        {q.key_points.map((kp, kpIdx) => (
                                          <li key={kpIdx}>{kp}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
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
                className="h-8 text-xs font-semibold"
              >
                Back to All Materials
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setMaterialToDelete(activeMaterial);
                  setDeleteError(null);
                  setDeleteModalOpen(true);
                }}
                className="h-8 text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        ) : (
          /* ─── Mode B: Generation Cards & History List ─────────────────── */
          <div className="space-y-4">
            {/* Quick Action Generation Cards */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Generate Study Artifacts
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. Study Notes Button Card */}
                <button
                  type="button"
                  disabled={hasNoSources}
                  onClick={() => {
                    setGuideError(null);
                    setGuideTitle("");
                    setGuideFocus("");
                    setGuideModalOpen(true);
                  }}
                  className="p-3.5 rounded-xl border border-border/80 bg-card/60 hover:bg-card hover:border-[#C6F432]/50 text-left transition-all duration-200 group flex items-start justify-between disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  <div className="space-y-1 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <BookMarked className="w-4 h-4 text-[#C6F432]" />
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        Study Notes
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Synthesizes all uploaded lecture notes and slide decks into organized study guide chapters.
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-[#C6F432] shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
                </button>

                {/* 2. Flashcards Button Card */}
                <button
                  type="button"
                  disabled={hasNoSources}
                  onClick={() => {
                    setCardsError(null);
                    setCardsTitle("");
                    setCardsCount(10);
                    setCardsDifficulty("Mixed");
                    setFlashcardsModalOpen(true);
                  }}
                  className="p-3.5 rounded-xl border border-border/80 bg-card/60 hover:bg-card hover:border-[#C6F432]/50 text-left transition-all duration-200 group flex items-start justify-between disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  <div className="space-y-1 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#C6F432]" />
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        Active Flashcards
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Creates interactive reveal/flip question cards for active recall and concept drilling.
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-[#C6F432] shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
                </button>

                {/* 3. Exam Paper Button Card */}
                <button
                  type="button"
                  disabled={hasNoSources}
                  onClick={() => {
                    setExamError(null);
                    setExamTitle("");
                    setExamMarks(50);
                    setExamTypes(["five_mark", "ten_mark"]);
                    setExamDifficulty("Mixed");
                    setExamAnswerKey(true);
                    setExamModalOpen(true);
                  }}
                  className="p-3.5 rounded-xl border border-border/80 bg-card/60 hover:bg-card hover:border-[#C6F432]/50 text-left transition-all duration-200 group flex items-start justify-between disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  <div className="space-y-1 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <FileQuestion className="w-4 h-4 text-[#C6F432]" />
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        Exam Simulator
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Generates structured university exam papers with 5-mark and 10-mark questions and scoring keys.
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-[#C6F432] shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
                </button>
              </div>
            </div>

            {/* Generated Materials History List */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between text-xs">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Saved Materials ({materials.length})
                </h3>
              </div>

              {loadingMaterials && (
                <div className="p-6 text-center text-muted-foreground space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#C6F432]" />
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
                <div className="p-6 text-center rounded-xl border border-dashed border-border/80 bg-card/30 space-y-2 my-2">
                  <GraduationCap className="w-6 h-6 mx-auto text-muted-foreground/60" />
                  <p className="text-xs font-bold text-foreground">No materials yet</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Generate your first study guide, flashcards, or practice exam paper above.
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
                        className="p-3 rounded-xl border border-border/80 bg-card/60 hover:border-primary/50 hover:bg-card cursor-pointer transition-all duration-150 flex items-center justify-between group shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate flex-1 pr-2">
                          <div className="p-2 rounded-lg bg-muted text-[#C6F432] shrink-0">
                            {isGuide ? (
                              <BookMarked className="w-3.5 h-3.5" />
                            ) : isCards ? (
                              <Layers className="w-3.5 h-3.5" />
                            ) : (
                              <FileQuestion className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {mat.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                              <span className="capitalize">{mat.material_type.replace("_", " ")}</span>
                              <span>&bull;</span>
                              <span>{formatDate(mat.created_at)}</span>
                              {mat.configuration?.truncated && (
                                <span className="text-amber-500 font-bold" title="Budget truncated">
                                  &bull; Partial
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMaterialToDelete(mat);
                              setDeleteError(null);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1 rounded-md opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                            title="Delete material"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: Generate Study Guide ─────────────────────────────────── */}
      <Dialog
        open={guideModalOpen}
        onOpenChange={setGuideModalOpen}
        title="Generate Study Notes"
        description={`Synthesize course notes from ${eligibleSources.length} processed source documents.`}
      >
        <form onSubmit={handleGenerateGuide} className="space-y-4">
          <Input
            label="Study Guide Title (Optional)"
            placeholder={`Study Guide: ${notebookTitle}`}
            value={guideTitle}
            onChange={(e) => setGuideTitle(e.target.value)}
            disabled={isGeneratingGuide}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold tracking-wide text-foreground/90">
              Focus Topics (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Consensus, BFT, Leader Election (comma-separated)"
              value={guideFocus}
              onChange={(e) => setGuideFocus(e.target.value)}
              disabled={isGeneratingGuide}
              className="flex h-10 w-full rounded-xl border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-all duration-150 border-border placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Leave blank to cover all topics across your course sources.
            </p>
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
              Generate Notes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ─── MODAL: Generate Flashcards ──────────────────────────────────── */}
      <Dialog
        open={flashcardsModalOpen}
        onOpenChange={setFlashcardsModalOpen}
        title="Generate Active Flashcards"
        description="Creates active recall question and answer cards with difficulty classifications."
      >
        <form onSubmit={handleGenerateFlashcards} className="space-y-4">
          <Input
            label="Deck Title (Optional)"
            placeholder={`Flashcards: ${notebookTitle}`}
            value={cardsTitle}
            onChange={(e) => setCardsTitle(e.target.value)}
            disabled={isGeneratingCards}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-foreground/90">
                Number of Cards
              </label>
              <select
                value={cardsCount}
                onChange={(e) => setCardsCount(Number(e.target.value))}
                disabled={isGeneratingCards}
                className="flex h-10 w-full rounded-xl border bg-card px-3 py-2 text-xs font-medium text-foreground border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value={5}>5 Cards</option>
                <option value={10}>10 Cards (Recommended)</option>
                <option value={15}>15 Cards</option>
                <option value={20}>20 Cards</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-foreground/90">
                Difficulty
              </label>
              <select
                value={cardsDifficulty}
                onChange={(e) => setCardsDifficulty(e.target.value as any)}
                disabled={isGeneratingCards}
                className="flex h-10 w-full rounded-xl border bg-card px-3 py-2 text-xs font-medium text-foreground border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="Mixed">Mixed (Balanced)</option>
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
              Generate Flashcards
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ─── MODAL: Generate Exam Paper ──────────────────────────────────── */}
      <Dialog
        open={examModalOpen}
        onOpenChange={setExamModalOpen}
        title="Generate Exam Paper"
        description="Creates a university-style examination paper based strictly on your course sources."
      >
        <form onSubmit={handleGenerateExam} className="space-y-4">
          <Input
            label="Exam Title (Optional)"
            placeholder={`Exam Paper: ${notebookTitle}`}
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            disabled={isGeneratingExam}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-foreground/90">
                Total Marks
              </label>
              <select
                value={examMarks}
                onChange={(e) => setExamMarks(Number(e.target.value))}
                disabled={isGeneratingExam}
                className="flex h-10 w-full rounded-xl border bg-card px-3 py-2 text-xs font-medium text-foreground border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value={25}>25 Marks</option>
                <option value={50}>50 Marks (Standard)</option>
                <option value={75}>75 Marks</option>
                <option value={100}>100 Marks (Full)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide text-foreground/90">
                Difficulty
              </label>
              <select
                value={examDifficulty}
                onChange={(e) => setExamDifficulty(e.target.value as any)}
                disabled={isGeneratingExam}
                className="flex h-10 w-full rounded-xl border bg-card px-3 py-2 text-xs font-medium text-foreground border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="Mixed">Mixed</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Question Denominations */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold tracking-wide text-foreground/90">
              Question Denominations
            </label>
            <div className="flex items-center gap-4 text-xs font-medium">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={examTypes.includes("five_mark")}
                  onChange={(e) => {
                    if (e.target.checked) setExamTypes((prev) => [...prev, "five_mark"]);
                    else setExamTypes((prev) => prev.filter((t) => t !== "five_mark"));
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
                    if (e.target.checked) setExamTypes((prev) => [...prev, "ten_mark"]);
                    else setExamTypes((prev) => prev.filter((t) => t !== "ten_mark"));
                  }}
                  disabled={isGeneratingExam}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>10-Mark Questions</span>
              </label>
            </div>
          </div>

          {/* Answer Key Toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={examAnswerKey}
                onChange={(e) => setExamAnswerKey(e.target.checked)}
                disabled={isGeneratingExam}
                className="rounded text-primary focus:ring-primary"
              />
              <span>Generate model solutions and scoring criteria</span>
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
