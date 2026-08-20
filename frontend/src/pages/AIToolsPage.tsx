import { useState } from "react";
import { useDocuments } from "@/features/documents/DocumentContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { 
  FileText, 
  Award, 
  CheckSquare, 
  HelpCircle, 
  Smile, 
  BrainCircuit, 
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Zap,
  BookOpen,
  ChevronRight
} from "lucide-react";
import { 
  explainSimply,
  generateFiveMarkAnswer,
  generateMcqs,
  generateNotes,
  generateTenMarkAnswer,
  generateVivaQuestions,
  generateFlashcards,
  generateSummary,
  type GenerationEvent
} from "@/lib/api";
import { 
  parseMCQResponse, 
  parseVivaResponse, 
  parseFlashcardResponse
} from "@/lib/jsonParser";

interface ToolDefinition {
  id: string;
  name: string;
  category: "Exams & Tests" | "Notes & Summaries" | "Concept Breakdown";
  description: string;
  badge: string;
  icon: typeof FileText;
  fn: (text: string) => AsyncGenerator<GenerationEvent>;
}

const TOOLS: ToolDefinition[] = [
  {
    id: "notes",
    name: "Comprehensive Notes",
    category: "Notes & Summaries",
    description: "Synthesizes document into structured key concepts, formulas, and definitions.",
    badge: "Most Popular",
    icon: FileText,
    fn: generateNotes,
  },
  {
    id: "summary",
    name: "Executive Summary",
    category: "Notes & Summaries",
    description: "High-level overview of core themes, key takeaways, and main conclusions.",
    badge: "Quick Read",
    icon: BookOpen,
    fn: generateSummary,
  },
  {
    id: "5-mark",
    name: "5-Mark Exam Answer",
    category: "Exams & Tests",
    description: "Concise exam response format (150-200 words) with bullet points and bold terms.",
    badge: "Exam Prep",
    icon: Award,
    fn: generateFiveMarkAnswer,
  },
  {
    id: "10-mark",
    name: "10-Mark Exam Answer",
    category: "Exams & Tests",
    description: "In-depth essay-style response (400-500 words) with introduction, sections, and summary.",
    badge: "Detailed",
    icon: Award,
    fn: generateTenMarkAnswer,
  },
  {
    id: "mcqs",
    name: "Interactive MCQ Quiz",
    category: "Exams & Tests",
    description: "Generates multiple choice questions with explanations and live score calculation.",
    badge: "Interactive",
    icon: CheckSquare,
    fn: generateMcqs,
  },
  {
    id: "viva",
    name: "Viva Question Prep",
    category: "Exams & Tests",
    description: "Oral exam prep with key answer points and model professor responses.",
    badge: "Oral Test",
    icon: HelpCircle,
    fn: generateVivaQuestions,
  },
  {
    id: "flashcards",
    name: "Spaced Flashcards",
    category: "Exams & Tests",
    description: "Key term flip cards designed for active recall and rapid memory consolidation.",
    badge: "Active Recall",
    icon: BrainCircuit,
    fn: generateFlashcards,
  },
  {
    id: "explain",
    name: "Explain Simply (ELI5)",
    category: "Concept Breakdown",
    description: "Simplifies complex technical topics using analogies and intuitive language.",
    badge: "Beginner Friendly",
    icon: Smile,
    fn: explainSimply,
  },
];

export function AIToolsPage() {
  const { documents, activeDocument, selectDocument } = useDocuments();
  const navigate = useNavigate();

  const [selectedDocId, setSelectedDocId] = useState<string>(
    activeDocument?.id || (documents.length > 0 ? documents[0].id : "")
  );

  const [activeTool, setActiveTool] = useState<ToolDefinition | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputContent, setOutputContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Interactive Quiz State
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);

  // Viva Prep State
  const [vivaIdx, setVivaIdx] = useState(0);
  const [vivaRevealed, setVivaRevealed] = useState(false);

  // Flashcards State
  const [cardIdx, setCardIdx] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  const currentDoc = documents.find((d) => d.id === selectedDocId) || activeDocument;

  const runTool = async (tool: ToolDefinition) => {
    if (!currentDoc) return;
    setActiveTool(tool);
    setIsGenerating(true);
    setOutputContent("");
    setQuizIdx(0);
    setQuizAnswers([]);
    setShowQuizResult(false);
    setVivaIdx(0);
    setVivaRevealed(false);
    setCardIdx(0);
    setCardFlipped(false);

    try {
      for await (const event of tool.fn(currentDoc.extracted_text)) {
        if (event.type === "delta") {
          setOutputContent((prev) => prev + event.text);
        }
        if (event.type === "error") {
          setOutputContent(`Error: ${event.message}`);
          break;
        }
      }
    } catch {
      setOutputContent("Failed to generate resource. Please check connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = ["All", "Exams & Tests", "Notes & Summaries", "Concept Breakdown"];

  const filteredTools = selectedCategory === "All"
    ? TOOLS
    : TOOLS.filter((t) => t.category === selectedCategory);

  const mcqData = outputContent && activeTool?.id === "mcqs" ? parseMCQResponse(outputContent) : null;
  const vivaData = outputContent && activeTool?.id === "viva" ? parseVivaResponse(outputContent) : null;
  const flashcardData = outputContent && activeTool?.id === "flashcards" ? parseFlashcardResponse(outputContent) : null;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">AI Study Suite</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Generate instant study materials, exam answers, and interactive quizzes from your documents.
          </p>
        </div>

        {/* Document Selector */}
        {documents.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Active Context:</span>
            <select
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                const doc = documents.find((d) => d.id === e.target.value);
                if (doc) selectDocument(doc);
              }}
              className="h-9 px-3 rounded-lg border border-border/60 bg-card text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all max-w-[200px] truncate"
            >
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  📄 {doc.filename}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* No Document Guard */}
      {documents.length === 0 ? (
        <Card className="border border-border/60 bg-card/50 backdrop-blur-sm p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-2xl">
            📄
          </div>
          <h3 className="text-lg font-bold">No Documents Uploaded</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Upload a PDF document first to generate AI study notes, practice exams, and interactive flashcards.
          </p>
          <Button onClick={() => navigate("/documents")} className="h-10 px-6 text-xs font-bold gap-2">
            <Zap size={15} />
            <span>Upload Document Now</span>
          </Button>
        </Card>
      ) : (
        <>
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`h-8 px-4 rounded-full text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              const isCurrent = activeTool?.id === tool.id;

              return (
                <Card
                  key={tool.id}
                  onClick={() => runTool(tool)}
                  className={`group relative cursor-pointer border transition-all duration-200 hover:scale-[1.02] ${
                    isCurrent
                      ? "border-primary bg-primary/[0.05] shadow-lg shadow-primary/10"
                      : "border-border/60 bg-card hover:bg-muted/30 hover:border-border"
                  }`}
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                          <Icon size={18} />
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                          {tool.badge}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          {tool.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed font-medium">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] font-bold text-primary">
                      <span>{isCurrent && isGenerating ? "Generating..." : "Run Tool"}</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Active Generation Result Workspace */}
          {activeTool && (
            <Card className="border border-border/80 bg-card shadow-xl overflow-hidden animate-fade-in mt-8">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <activeTool.icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground">{activeTool.name}</h3>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Context: {currentDoc?.filename}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isGenerating && (
                    <div className="flex items-center gap-2 text-xs font-bold text-primary px-3 py-1.5 rounded-full bg-primary/10">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Generating Output...</span>
                    </div>
                  )}

                  {!isGenerating && outputContent && (
                    <>
                      <Button
                        onClick={handleCopy}
                        variant="outline"
                        className="h-8 px-3 text-xs font-bold gap-1.5 border-border/60"
                      >
                        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </Button>
                      <Button
                        onClick={() => runTool(activeTool)}
                        variant="outline"
                        className="h-8 px-3 text-xs font-bold gap-1.5 border-border/60"
                      >
                        <RefreshCw size={13} />
                        <span>Regenerate</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 sm:p-8 min-h-[300px]">
                {/* 1. MCQ Quiz View */}
                {mcqData ? (
                  <div className="space-y-6 max-w-2xl mx-auto">
                    {!showQuizResult ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b border-border/40 pb-3">
                          <span>Question {quizIdx + 1} of {mcqData.questions.length}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase text-[10px]">
                            {mcqData.questions[quizIdx].difficulty || "Medium"}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-foreground leading-relaxed">
                          {mcqData.questions[quizIdx].question}
                        </h4>

                        <div className="space-y-2.5">
                          {mcqData.questions[quizIdx].options.map((opt, optIdx) => {
                            const selected = quizAnswers[quizIdx] === optIdx;
                            return (
                              <button
                                key={optIdx}
                                onClick={() => {
                                  const updated = [...quizAnswers];
                                  updated[quizIdx] = optIdx;
                                  setQuizAnswers(updated);
                                }}
                                className={`w-full text-left p-4 rounded-xl border text-xs font-semibold transition-all ${
                                  selected
                                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                                    : "border-border/60 bg-card hover:bg-muted/40 text-foreground"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-4">
                          <Button
                            disabled={quizIdx === 0}
                            onClick={() => setQuizIdx((p) => p - 1)}
                            variant="outline"
                            className="h-9 px-4 text-xs font-bold"
                          >
                            Previous
                          </Button>

                          {quizIdx + 1 < mcqData.questions.length ? (
                            <Button
                              disabled={quizAnswers[quizIdx] === undefined}
                              onClick={() => setQuizIdx((p) => p + 1)}
                              className="h-9 px-5 text-xs font-bold"
                            >
                              Next Question
                            </Button>
                          ) : (
                            <Button
                              disabled={quizAnswers[quizIdx] === undefined}
                              onClick={() => setShowQuizResult(true)}
                              className="h-9 px-5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white"
                            >
                              Submit Quiz
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-6 py-6">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto text-2xl font-extrabold">
                          🏆
                        </div>
                        <div>
                          <h3 className="text-xl font-extrabold">Quiz Completed!</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            You scored {quizAnswers.filter((a, i) => a === mcqData.questions[i].correctAnswer).length} / {mcqData.questions.length}
                          </p>
                        </div>
                        <Button onClick={() => { setQuizIdx(0); setQuizAnswers([]); setShowQuizResult(false); }} className="h-9 px-6 text-xs font-bold">
                          Try Again
                        </Button>
                      </div>
                    )}
                  </div>
                ) : vivaData ? (
                  /* 2. Viva Oral Exam Prep Simulator */
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b border-border/40 pb-3">
                      <span>Viva Question {vivaIdx + 1} of {vivaData.questions.length}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase text-[10px]">
                        {vivaData.questions[vivaIdx].difficulty || "Medium"}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-foreground leading-relaxed">
                      {vivaData.questions[vivaIdx].question}
                    </h4>

                    {vivaRevealed ? (
                      <div className="p-5 rounded-2xl border border-border/60 bg-muted/30 space-y-3 animate-fade-in">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                          Expected Answer / Key Points
                        </span>
                        <p className="text-xs sm:text-sm text-foreground font-medium leading-relaxed">
                          {vivaData.questions[vivaIdx].expectedAnswer}
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setVivaRevealed(true)}
                        variant="outline"
                        className="h-10 px-5 text-xs font-bold gap-2 border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <HelpCircle size={15} />
                        <span>Reveal Answer & Key Points</span>
                      </Button>
                    )}

                    <div className="flex items-center justify-between pt-4">
                      <Button
                        disabled={vivaIdx === 0}
                        onClick={() => { setVivaIdx((p) => p - 1); setVivaRevealed(false); }}
                        variant="outline"
                        className="h-9 px-4 text-xs font-bold"
                      >
                        Previous
                      </Button>
                      <Button
                        disabled={vivaIdx + 1 >= vivaData.questions.length}
                        onClick={() => { setVivaIdx((p) => p + 1); setVivaRevealed(false); }}
                        className="h-9 px-5 text-xs font-bold"
                      >
                        Next Viva Question
                      </Button>
                    </div>
                  </div>
                ) : flashcardData ? (
                  /* 3. Flashcard Flip Engine */
                  <div className="max-w-xl mx-auto space-y-6 text-center">
                    <div className="text-xs font-bold text-muted-foreground">
                      Card {cardIdx + 1} of {flashcardData.flashcards.length}
                    </div>

                    <div
                      onClick={() => setCardFlipped((p) => !p)}
                      className="min-h-[220px] p-8 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md shadow-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all duration-300 relative group"
                    >
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary mb-3">
                        {cardFlipped ? "Answer" : "Question (Click to flip)"}
                      </span>
                      <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
                        {cardFlipped ? flashcardData.flashcards[cardIdx].back : flashcardData.flashcards[cardIdx].front}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <Button
                        disabled={cardIdx === 0}
                        onClick={() => { setCardIdx((p) => p - 1); setCardFlipped(false); }}
                        variant="outline"
                        className="h-9 px-4 text-xs font-bold"
                      >
                        Previous
                      </Button>
                      <Button
                        disabled={cardIdx + 1 >= flashcardData.flashcards.length}
                        onClick={() => { setCardIdx((p) => p + 1); setCardFlipped(false); }}
                        className="h-9 px-4 text-xs font-bold"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* 4. Markdown / Structured Text Renderer */
                  <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
                    {outputContent ? (
                      <MarkdownContent content={outputContent} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                        <Loader2 size={24} className="animate-spin text-primary" />
                        <p className="text-xs font-semibold">Generating study output with Gemini AI...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
