import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useConversations } from "@/features/conversations/ConversationContext";
import { useDocuments } from "@/features/documents/DocumentContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { getGeneratedResults, saveGeneratedResult } from "@/lib/db";
import { 
  explainSimply,
  generateFiveMarkAnswer,
  generateMcqs,
  generateNotes,
  generateTenMarkAnswer,
  generateVivaQuestions,
  generateFlashcards,
  generateSummary
} from "@/lib/api";
import { 
  FileText, 
  Award, 
  CheckSquare, 
  HelpCircle, 
  Smile, 
  BrainCircuit,
  ArrowRight,
  RefreshCw,
  Loader2,
  Check,
  X,
  User as UserIcon,
  Bot,
  Send,
  StopCircle,
  Copy,
  Download,
  Edit2,
  WifiOff
} from "lucide-react";
import { exportToMarkdown, exportToDocx, exportToPdf } from "@/lib/export";

export function WorkspacePage() {
  const { 
    activeConversation, 
    messages, 
    messagesLoading, 
    isGenerating,
    sendChatMessage, 
    editChatMessage,
    cancelChatMessage,
    clearActiveConversation,
    error 
  } = useConversations();

  const { documents, selectDocument } = useDocuments();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Message Actions state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editPromptValue, setEditPromptValue] = useState("");

  // Resource Viewer state
  const [viewingResource, setViewingResource] = useState<{ name: string; content: string } | null>(null);
  const [copiedResource, setCopiedResource] = useState(false);

  // MCQ Quiz states
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizShowSummary, setQuizShowSummary] = useState(false);

  // Viva Prep states
  const [vivaCurrentIndex, setVivaCurrentIndex] = useState(0);
  const [vivaIsRevealed, setVivaIsRevealed] = useState(false);
  const [vivaStudentAnswer, setVivaStudentAnswer] = useState("");
  const [vivaRatings, setVivaRatings] = useState<string[]>([]);
  const [vivaShowSummary, setVivaShowSummary] = useState(false);

  // Flashcards states
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // Key maps and options for generation
  const keyMap: Record<string, string> = {
    "Notes": "notes",
    "5-Mark Answer": "fiveMarks",
    "10-Mark Answer": "tenMarks",
    "Generate MCQs": "mcqs",
    "Viva Questions": "viva",
    "Explanation": "explanation",
    "Flashcards": "flashcards",
    "Summary": "summary",
  };

  const generationOptions = [
    { name: "Notes", icon: FileText, fn: generateNotes },
    { name: "5-Mark Answer", icon: Award, fn: generateFiveMarkAnswer },
    { name: "10-Mark Answer", icon: Award, fn: generateTenMarkAnswer },
    { name: "Generate MCQs", icon: CheckSquare, fn: generateMcqs },
    { name: "Viva Questions", icon: HelpCircle, fn: generateVivaQuestions },
    { name: "Explanation", icon: Smile, fn: explainSimply },
    { name: "Flashcards", icon: BrainCircuit, fn: generateFlashcards },
    { name: "Summary", icon: FileText, fn: generateSummary },
  ];

  const resetQuiz = () => {
    setQuizCurrentIndex(0);
    setQuizAnswers([]);
    setQuizShowSummary(false);
  };

  const resetViva = () => {
    setVivaCurrentIndex(0);
    setVivaIsRevealed(false);
    setVivaStudentAnswer("");
    setVivaRatings([]);
    setVivaShowSummary(false);
  };

  const resetFlashcards = () => {
    setFlashcardIndex(0);
    setFlashcardFlipped(false);
  };

  const openResourceInModal = (name: string, content: string) => {
    resetQuiz();
    resetViva();
    resetFlashcards();
    setViewingResource({ name, content });
  };

  // Find linked document details
  const linkedDoc = activeConversation && activeConversation.document_id 
    ? documents.find((d) => d.id === activeConversation.document_id)
    : null;

  // Generated results cached locally
  const [cachedResults, setCachedResults] = useState<any>(null);
  const [generatingResource, setGeneratingResource] = useState<string | null>(null);

  const loadSavedResults = async () => {
    if (linkedDoc) {
      const saved = await getGeneratedResults(linkedDoc.id);
      setCachedResults(saved);
    }
  };

  useEffect(() => {
    loadSavedResults();
  }, [linkedDoc]);

  // Redirect to dashboard if no active workspace session
  useEffect(() => {
    if (!activeConversation) {
      navigate("/");
    }
  }, [activeConversation, navigate]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  async function generateResource(name: string, fn: any) {
    if (!linkedDoc) return;
    setGeneratingResource(name);
    
    let finalContent = "";
    try {
      for await (const event of fn(linkedDoc.extracted_text)) {
        if (event.type === "delta") {
          finalContent += event.text;
        }
        if (event.type === "error") {
          alert(`Error during generation: ${event.message}`);
          break;
        }
      }

      if (finalContent) {
        const activeKey = keyMap[name];
        if (activeKey) {
          await saveGeneratedResult(linkedDoc.id, activeKey as any, finalContent);
          await loadSavedResults();
        }
      }
    } catch (err) {
      console.error("Resource generation failed:", err);
      alert("Generation failed. Please try again.");
    } finally {
      setGeneratingResource(null);
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating || messagesLoading) return;
    sendChatMessage(prompt.trim());
    setPrompt("");
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (msg: any) => {
    const blob = new Blob([msg.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `response-${msg.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportChat = (format: "markdown" | "docx" | "pdf") => {
    if (messages.length === 0) return;
    const chatTitle = activeConversation?.title || "chat-history";
    const textContent = messages
      .map((m) => `### ${m.role === "user" ? "Student" : "AI Tutor"}\n\n${m.content}`)
      .join("\n\n---\n\n");

    if (format === "markdown") {
      exportToMarkdown(chatTitle, textContent);
    } else if (format === "docx") {
      exportToDocx(chatTitle, textContent);
    } else if (format === "pdf") {
      exportToPdf(chatTitle, textContent);
    }
  };

  const startEditPrompt = (msgId: string, currentContent: string) => {
    setEditingMessageId(msgId);
    setEditPromptValue(currentContent);
  };

  const saveEditPrompt = async (msgId: string) => {
    if (!editPromptValue.trim() || isGenerating) return;
    setEditingMessageId(null);
    try {
      await editChatMessage(msgId, editPromptValue.trim());
    } catch {
      // error handled in context
    }
  };

  const handleCopyResource = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResource(true);
    setTimeout(() => setCopiedResource(false), 2000);
  };

  // Attempt to parse quiz JSON for MCQs inside the modal
  let quizData: any = null;
  let parseError = false;
  if (viewingResource && viewingResource.name === "Generate MCQs" && viewingResource.content) {
    try {
      let cleanJson = viewingResource.content.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
      }
      quizData = JSON.parse(cleanJson);
    } catch (e) {
      parseError = true;
    }
  }

  // Attempt to parse viva JSON for Viva Questions inside the modal
  let vivaData: any = null;
  let vivaParseError = false;
  if (viewingResource && viewingResource.name === "Viva Questions" && viewingResource.content) {
    try {
      let cleanJson = viewingResource.content.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
      }
      vivaData = JSON.parse(cleanJson);
    } catch (e) {
      vivaParseError = true;
    }
  }

  // Attempt to parse flashcard JSON inside the modal
  let flashcardData: any = null;
  let flashcardParseError = false;
  if (viewingResource && viewingResource.name === "Flashcards" && viewingResource.content) {
    try {
      let cleanJson = viewingResource.content.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");
      }
      flashcardData = JSON.parse(cleanJson);
    } catch (e) {
      flashcardParseError = true;
    }
  }

  if (!activeConversation || !linkedDoc) {
    return null;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-140px)] w-full relative">
      {/* Left Panel: AI Tutor Chat */}
      <div className="flex-1 lg:flex-[7] flex flex-col h-full border border-border/85 bg-card/45 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg min-w-0">
        {/* Header bar */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-card/65 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">📄</span>
            <div className="flex flex-col min-w-0">
              <h2 className="text-sm font-extrabold text-foreground truncate">{linkedDoc.filename}</h2>
              <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>PDF</span>
                <span>•</span>
                <span>{linkedDoc.page_count} Pages</span>
                <span>•</span>
                <span>Last opened {linkedDoc.lastOpened ? new Date(linkedDoc.lastOpened).toLocaleDateString() : "Never"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              onClick={() => handleExportChat("markdown")} 
              variant="outline" 
              className="h-8 px-2 text-xs flex items-center gap-1 font-bold border-border/60 text-muted-foreground hover:text-foreground"
              title="Export chat as Markdown"
            >
              <span>.MD</span>
            </Button>
            <Button 
              onClick={() => handleExportChat("docx")} 
              variant="outline" 
              className="h-8 px-2 text-xs flex items-center gap-1 font-bold border-border/60 text-muted-foreground hover:text-foreground"
              title="Export chat as Word DOCX"
            >
              <span>.DOCX</span>
            </Button>
            <Button 
              onClick={() => handleExportChat("pdf")} 
              variant="outline" 
              className="h-8 px-2 text-xs flex items-center gap-1 font-bold border-border/60 text-muted-foreground hover:text-foreground"
              title="Export chat as PDF"
            >
              <span>.PDF</span>
            </Button>
            <Button 
              onClick={() => {
                clearActiveConversation();
                navigate("/");
              }} 
              variant="outline" 
              className="h-8 w-8 p-0 flex items-center justify-center border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Close chat"
            >
              <X size={15} />
            </Button>
          </div>
        </header>

        {/* Conversation history block */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messagesLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-semibold">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 max-w-sm mx-auto space-y-3">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Bot size={28} />
              </div>
              <h3 className="font-bold text-sm text-foreground">Ask anything</h3>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                Start typing your question below. If this chat is linked to a PDF, the assistant will automatically reference its contents.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const showCursor = !isUser && isGenerating && index === messages.length - 1;
              const isEditing = editingMessageId === msg.id;

              return (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-3 group max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                    isUser ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground border border-border/80 font-bold"
                  }`}>
                    {isUser ? <UserIcon size={14} /> : <Bot size={14} />}
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className={`rounded-xl px-4 py-3 border text-xs leading-relaxed ${
                      isUser 
                        ? "bg-primary/10 border-primary/20 text-foreground font-medium" 
                        : "bg-card/75 border-border/40 text-foreground font-medium"
                    }`}>
                      {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[200px] sm:min-w-[300px]">
                          <textarea
                            value={editPromptValue}
                            onChange={(e) => setEditPromptValue(e.target.value)}
                            className="w-full text-xs p-2.5 rounded border border-border bg-background focus:outline-none min-h-[4rem] resize-none"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <Button 
                              variant="outline"
                              className="h-7 text-[10px] font-bold border-border/60"
                              onClick={() => setEditingMessageId(null)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              className="h-7 text-[10px] font-bold"
                              onClick={() => saveEditPrompt(msg.id)}
                            >
                              Save & Submit
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="markdown-body">
                          <MarkdownContent content={msg.content} />
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? "justify-end" : "justify-start"}`}>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy message text"
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedId === msg.id ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                        </button>
                        <button
                          onClick={() => handleDownload(msg)}
                          title="Save message as Markdown"
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download size={11} />
                        </button>
                        {isUser && !isGenerating && (
                          <button
                            onClick={() => startEditPrompt(msg.id, msg.content)}
                            title="Edit message prompt"
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit2 size={11} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive max-w-md mx-auto animate-fade-in">
            <Bot size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div ref={messagesEndRef} />

        {/* Input box */}
        <footer className="p-4 border-t border-border/40 bg-card/65 backdrop-blur-sm space-y-4 shrink-0">
          {/* Suggested Questions */}
          {messages.length > 0 && !isGenerating && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Suggested Questions</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Could you explain the core concepts of this document?",
                  "What are the most important terms and definitions?",
                  "Can you give me a summary of the main points?"
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setPrompt(q);
                      sendChatMessage(q);
                    }}
                    className="text-left text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#b4befe]/25 bg-[#b4befe]/5 hover:bg-[#b4befe]/15 text-[#b4befe] transition-all duration-200"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="flex justify-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={cancelChatMessage}
                className="h-8 px-4 flex items-center gap-2 border-destructive/25 text-destructive hover:bg-destructive/10 text-xs font-semibold shadow-sm transition-all animate-fade-in"
              >
                <StopCircle size={14} />
                Cancel Generation
              </Button>
            </div>
          )}

          {/* Chat Form */}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              required
              value={prompt}
              disabled={isGenerating || messagesLoading}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything about this document..."
              className="flex-1 h-10 rounded-lg border border-input bg-background/50 px-3.5 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button 
              type="submit" 
              disabled={isGenerating || !prompt.trim() || messagesLoading} 
              className="h-10 w-10 p-0 flex items-center justify-center shrink-0"
            >
              <Send size={16} />
            </Button>
          </form>

          {/* Quick Action Chips */}
          <div className="flex flex-wrap gap-1.5 items-center pt-1.5 border-t border-border/20">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Quick Actions</span>
            {[
              { label: "Notes", tab: "notes", icon: "📘" },
              { label: "MCQs", tab: "mcqs", icon: "❓" },
              { label: "Viva Prep", tab: "viva", icon: "🎤" },
              { label: "Explanation", tab: "explanation", icon: "explanation" },
              { label: "Flashcards", tab: "flashcards", icon: "🧠" },
              { label: "Summary", tab: "summary", icon: "📄" }
            ].map((chip) => (
              <button
                key={chip.tab}
                type="button"
                onClick={() => {
                  const opt = generationOptions.find(o => 
                    keyMap[o.name].toLowerCase() === chip.tab.toLowerCase() || 
                    (chip.tab === "viva" && o.name === "Viva Questions") || 
                    (chip.tab === "mcqs" && o.name === "Generate MCQs")
                  );
                  if (opt) {
                    const activeKey = keyMap[opt.name];
                    const isGenerated = !!cachedResults?.[activeKey];
                    if (isGenerated) {
                      openResourceInModal(opt.name, cachedResults[activeKey]);
                    } else {
                      generateResource(opt.name, opt.fn);
                    }
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-full border border-border/80 bg-secondary/30 hover:bg-secondary text-[10px] font-bold text-foreground transition-all duration-200 shadow-sm animate-fade-in"
              >
                <span>{chip.icon === "explanation" ? "💡" : chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </footer>
      </div>

      {/* Right Panel: Study Materials Panel */}
      <div className="w-full lg:w-80 lg:flex-[3] flex flex-col h-full border border-border/80 bg-card/45 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg p-4 space-y-4 shrink-0">
        <div className="border-b border-border/40 pb-2 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Study Materials</h2>
          <span className="text-[10px] text-muted-foreground font-semibold">Saved locally</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {generationOptions.map((opt) => {
            const activeKey = keyMap[opt.name];
            const isGenerated = !!cachedResults?.[activeKey];
            const isThisGenerating = generatingResource === opt.name;

            return (
              <div key={opt.name} className="flex flex-col p-3 rounded-lg border border-border/60 bg-card/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-primary text-sm shrink-0">
                      {opt.name === "Notes" ? "📘" :
                       opt.name === "5-Mark Answer" ? "✍️" :
                       opt.name === "10-Mark Answer" ? "📝" :
                       opt.name === "Generate MCQs" ? "❓" :
                       opt.name === "Viva Questions" ? "🎤" :
                       opt.name === "Explanation" ? "💡" :
                       opt.name === "Flashcards" ? "🧠" : "📄"}
                    </span>
                    <span className="text-xs font-bold text-foreground truncate">{opt.name}</span>
                  </div>

                  {isThisGenerating ? (
                    <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <Loader2 size={8} className="animate-spin" />
                      Generating
                    </span>
                  ) : isGenerated ? (
                    <span className="text-[9px] bg-green-500/10 border border-green-500/20 text-green-600 font-bold px-2 py-0.5 rounded-full">
                      ✓ Ready
                    </span>
                  ) : (
                    <span className="text-[9px] bg-muted text-muted-foreground font-semibold px-2 py-0.5 rounded-full">
                      Ready to generate
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isGenerated ? (
                    <>
                      <Button
                        disabled={generatingResource !== null}
                        onClick={() => openResourceInModal(opt.name, cachedResults[activeKey])}
                        className="h-7 text-[10px] font-bold flex-1 flex items-center justify-center gap-1 active:scale-[0.98]"
                      >
                        <span>Open</span>
                        <ArrowRight size={10} />
                      </Button>
                      <Button
                        disabled={generatingResource !== null}
                        onClick={() => generateResource(opt.name, opt.fn)}
                        variant="outline"
                        className="h-7 px-2.5 text-[9px] font-bold border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.98]"
                        title="Regenerate"
                      >
                        <RefreshCw size={10} />
                      </Button>
                    </>
                  ) : (
                    <Button
                      disabled={generatingResource !== null}
                      onClick={() => generateResource(opt.name, opt.fn)}
                      className="w-full h-7 text-[10px] font-bold flex items-center justify-center gap-1 active:scale-[0.98]"
                    >
                      <span>Generate</span>
                      <ArrowRight size={10} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Resource Viewer Overlay Modal */}
      {viewingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl h-[85vh] bg-card border border-border/80 rounded-2xl flex flex-col overflow-hidden shadow-2xl p-6 relative">
            
            {/* Modal Header */}
            <header className="flex items-center justify-between pb-4 border-b border-border/40 shrink-0">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Study Material</span>
                <h2 className="text-sm font-bold truncate text-foreground">{viewingResource.name}</h2>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => handleCopyResource(viewingResource.content)} 
                  variant="outline" 
                  className="h-8 px-2 text-xs flex items-center gap-1.5 font-bold text-muted-foreground hover:text-foreground border-border/60"
                  title="Copy to clipboard"
                >
                  {copiedResource ? (
                    <>
                      <Check size={13} className="text-green-600" />
                      <span className="text-green-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => exportToMarkdown(viewingResource.name, viewingResource.content)} 
                  variant="outline" 
                  className="h-8 px-2 text-[10px] sm:text-xs flex items-center gap-1.5 font-bold text-muted-foreground hover:text-foreground border-border/60"
                  title="Export as Markdown"
                >
                  <span>.MD</span>
                </Button>
                <Button 
                  onClick={() => exportToDocx(viewingResource.name, viewingResource.content)} 
                  variant="outline" 
                  className="h-8 px-2 text-[10px] sm:text-xs flex items-center gap-1.5 font-bold text-muted-foreground hover:text-foreground border-border/60"
                  title="Export as Word DOCX"
                >
                  <span>.DOCX</span>
                </Button>
                <Button 
                  onClick={() => exportToPdf(viewingResource.name, viewingResource.content)} 
                  variant="outline" 
                  className="h-8 px-2 text-[10px] sm:text-xs flex items-center gap-1.5 font-bold text-muted-foreground hover:text-foreground border-border/60"
                  title="Export as PDF"
                >
                  <span>.PDF</span>
                </Button>

                <button
                  onClick={() => setViewingResource(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-2"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-5 pr-1">
              {/* MCQ Quiz Player */}
              {viewingResource.name === "Generate MCQs" && quizData && quizData.questions ? (
                quizShowSummary ? (
                  <div className="space-y-6">
                    <div className="text-center py-6 space-y-3">
                      <Award size={48} className="mx-auto text-primary animate-pulse" />
                      <h3 className="text-xl font-bold tracking-tight">Quiz Completed!</h3>
                      <p className="text-sm font-semibold text-muted-foreground">
                        You scored <span className="text-foreground font-bold">{quizAnswers.filter((ans, idx) => ans === quizData.questions[idx].correctAnswer).length}</span> out of <span className="text-foreground font-bold">{quizData.questions.length}</span> (
                        {Math.round((quizAnswers.filter((ans, idx) => ans === quizData.questions[idx].correctAnswer).length / quizData.questions.length) * 100)}%)
                      </p>
                      <Button onClick={resetQuiz} variant="outline" className="h-9 px-4 font-bold mt-2 border-border/60">
                        Retry Quiz
                      </Button>
                    </div>
                    
                    <div className="border-t border-border/60 pt-4 space-y-4">
                      <h4 className="font-bold text-sm">Review Questions:</h4>
                      {quizData.questions.map((q: any, idx: number) => {
                        const userAns = quizAnswers[idx];
                        const isCorrect = userAns === q.correctAnswer;
                        return (
                          <div key={idx} className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                            <div className="flex items-start gap-2 justify-between">
                              <p className="font-bold text-xs flex-1">
                                {idx + 1}. {q.question}
                              </p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isCorrect ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                              }`}>
                                {isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            </div>
                            <div className="text-xs space-y-1.5 leading-normal">
                              <p className="text-muted-foreground">
                                <span className="font-bold text-foreground">Your answer:</span> {q.options[userAns] || "N/A"}
                              </p>
                              {!isCorrect && (
                                <p className="text-muted-foreground">
                                  <span className="font-bold text-green-600">Correct answer:</span> {q.options[q.correctAnswer]}
                                </p>
                              )}
                              <p className="text-muted-foreground italic mt-1 bg-card/40 p-2 border border-border/40 rounded">
                                {q.explanation}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                          {quizData.metadata?.title || "Academic Quiz"}
                        </span>
                        <h4 className="font-bold text-xs text-muted-foreground">
                          Question {quizCurrentIndex + 1} of {quizData.questions.length}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          quizData.questions[quizCurrentIndex].difficulty === 'Easy' ? 'bg-green-500/10 text-green-600' :
                          quizData.questions[quizCurrentIndex].difficulty === 'Hard' ? 'bg-red-500/10 text-red-600' :
                          'bg-amber-500/10 text-amber-600'
                        }`}>
                          {quizData.questions[quizCurrentIndex].difficulty}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border/80 bg-muted/15">
                      <p className="text-xs sm:text-sm font-bold text-foreground leading-normal">
                        {quizData.questions[quizCurrentIndex].question}
                      </p>
                    </div>

                    <div className="grid gap-3 grid-cols-1">
                      {quizData.questions[quizCurrentIndex].options.map((opt: string, oIdx: number) => (
                        <button
                          key={oIdx}
                          onClick={() => {
                            setQuizAnswers((prev) => [...prev, oIdx]);
                            if (quizCurrentIndex + 1 < quizData.questions.length) {
                              setQuizCurrentIndex((current) => current + 1);
                            } else {
                              setQuizShowSummary(true);
                            }
                          }}
                          className="w-full text-left p-3.5 rounded-lg border border-border/80 bg-card/60 hover:bg-muted hover:border-primary/20 text-xs font-semibold leading-normal transition-all duration-200"
                        >
                          <span className="inline-block w-5 h-5 rounded bg-primary/10 text-primary text-center font-bold text-[10px] leading-5 mr-2.5">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) :

              /* Viva Oral Prep player */
              viewingResource.name === "Viva Questions" && vivaData && vivaData.questions ? (
                vivaShowSummary ? (
                  <div className="space-y-6">
                    <div className="text-center py-6 space-y-3">
                      <Award size={48} className="mx-auto text-primary animate-pulse" />
                      <h3 className="text-xl font-bold tracking-tight">Viva Session Completed!</h3>
                      <p className="text-xs text-muted-foreground font-semibold">
                        You practiced <span className="font-bold text-foreground">{vivaData.questions.length}</span> viva exam questions.
                      </p>
                      
                      <div className="border border-border/80 rounded-xl p-4 bg-muted/10 max-w-sm mx-auto grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Excellent</p>
                          <p className="text-lg font-extrabold text-green-600">{vivaRatings.filter(r => r === 'Excellent').length}</p>
                        </div>
                        <div className="text-center border-x border-border/40">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Good</p>
                          <p className="text-lg font-extrabold text-blue-600">{vivaRatings.filter(r => r === 'Good').length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Poor</p>
                          <p className="text-lg font-extrabold text-red-600">{vivaRatings.filter(r => r === 'Poor').length}</p>
                        </div>
                      </div>

                      <Button onClick={resetViva} variant="outline" className="h-9 px-4 font-bold mt-2 border-border/60">
                        Restart Viva Simulation
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                          {vivaData.metadata?.title || "Viva Practice Simulation"}
                        </span>
                        <h4 className="font-bold text-xs text-muted-foreground">
                          Question {vivaCurrentIndex + 1} of {vivaData.questions.length}
                        </h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        vivaData.questions[vivaCurrentIndex].difficulty === 'Easy' ? 'bg-green-500/10 text-green-600' :
                        vivaData.questions[vivaCurrentIndex].difficulty === 'Hard' ? 'bg-red-500/10 text-red-600' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>
                        {vivaData.questions[vivaCurrentIndex].difficulty}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-border/80 bg-muted/15 flex items-start gap-3">
                      <Bot className="shrink-0 text-primary animate-pulse" size={20} />
                      <p className="text-xs sm:text-sm font-bold text-foreground leading-normal italic">
                        "{vivaData.questions[vivaCurrentIndex].question}"
                      </p>
                    </div>

                    {!vivaIsRevealed && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Draft your verbal answer (optional):</span>
                        <textarea
                          value={vivaStudentAnswer}
                          onChange={(e) => setVivaStudentAnswer(e.target.value)}
                          placeholder="Speak aloud or type your answer draft here to practice..."
                          className="w-full text-xs p-3 rounded-lg border border-border bg-card/60 focus:outline-none min-h-[5.5rem] resize-none font-medium leading-normal placeholder:text-muted-foreground/60"
                        />
                      </div>
                    )}

                    {vivaIsRevealed && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 text-xs leading-normal">
                          <p className="font-bold text-foreground mb-1">Ideal Expected Answer:</p>
                          <p className="text-muted-foreground font-medium">{vivaData.questions[vivaCurrentIndex].expectedAnswer}</p>
                        </div>

                        <div className="p-4 rounded-lg border border-border/80 bg-muted/20 space-y-2">
                          <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Key points checklist:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {vivaData.questions[vivaCurrentIndex].keyPoints.map((kp: string, kpIdx: number) => (
                              <label key={kpIdx} className="flex items-start gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                                <input type="checkbox" className="mt-0.5 rounded border-border shrink-0 accent-primary" />
                                <span>{kp}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      {!vivaIsRevealed ? (
                        <>
                          <div />
                          <Button
                            onClick={() => setVivaIsRevealed(true)}
                            className="font-bold h-9 px-5 active:scale-[0.98]"
                          >
                            Reveal Expected Answer
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Self-rate your answer:</span>
                          <div className="flex gap-2">
                            {['Poor', 'Good', 'Excellent'].map((rating) => (
                              <Button
                                key={rating}
                                onClick={() => {
                                  setVivaRatings((prev) => [...prev, rating]);
                                  if (vivaCurrentIndex + 1 < vivaData.questions.length) {
                                    setVivaCurrentIndex((current) => current + 1);
                                    setVivaIsRevealed(false);
                                    setVivaStudentAnswer("");
                                  } else {
                                    setVivaShowSummary(true);
                                  }
                                }}
                                variant="outline"
                                className={`h-8 px-3 text-xs font-bold ${
                                  rating === 'Excellent' ? 'border-green-500/30 text-green-600 hover:bg-green-500/10' :
                                  rating === 'Good' ? 'border-blue-500/30 text-blue-600 hover:bg-blue-500/10' :
                                  'border-red-500/30 text-red-600 hover:bg-red-500/10'
                                }`}
                              >
                                {rating}
                              </Button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              ) :

              /* Flashcards player */
              viewingResource.name === "Flashcards" && flashcardData && flashcardData.flashcards ? (
                <div className="space-y-6 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full border-b border-border/60 pb-3">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      Flashcard Review ({flashcardIndex + 1} of {flashcardData.flashcards.length})
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      Click card to flip
                    </span>
                  </div>

                  <div 
                    onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                    className="w-full max-w-sm h-52 cursor-pointer relative perspective"
                  >
                    <div className={`w-full h-full duration-500 preserve-3d relative transition-all ${flashcardFlipped ? 'rotate-y-180' : ''}`}>
                      <div className="absolute inset-0 bg-secondary/40 border border-border/80 rounded-xl p-6 flex flex-col items-center justify-center text-center backface-hidden shadow-sm">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary mb-2">Question</span>
                        <p className="text-xs sm:text-sm font-bold text-foreground leading-normal">
                          {flashcardData.flashcards[flashcardIndex].front}
                        </p>
                      </div>
                      <div className="absolute inset-0 bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 shadow-inner">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-green-600 mb-2">Answer</span>
                        <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                          {flashcardData.flashcards[flashcardIndex].back}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      disabled={flashcardIndex === 0} 
                      onClick={(e) => { e.stopPropagation(); setFlashcardIndex(prev => prev - 1); setFlashcardFlipped(false); }}
                      variant="outline"
                      className="h-9 px-4 font-bold active:scale-[0.98] border-border/60"
                    >
                      Previous
                    </Button>
                    <Button 
                      disabled={flashcardIndex + 1 >= flashcardData.flashcards.length} 
                      onClick={(e) => { e.stopPropagation(); setFlashcardIndex(prev => prev + 1); setFlashcardFlipped(false); }}
                      className="h-9 px-4 font-bold active:scale-[0.98]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) :

              /* Default markdown viewer */
              (
                <MarkdownContent content={viewingResource.content} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
