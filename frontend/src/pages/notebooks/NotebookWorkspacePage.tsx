import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Upload,
  Plus,
  MessageSquare,
  Sparkles,
  Send,
  Square,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  GraduationCap,
  Layers,
  FileQuestion,
  BookMarked,
  HelpCircle,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";

import {
  getNotebookDetail,
  uploadNotebookSource,
  deleteSource,
  listNotebookSources,
  createNotebookConversation,
  listNotebookConversations,
  deleteConversation,
  getConversationMessages,
  chatInConversation,
  type NotebookDetailResponse,
  type SourceResponse,
  type ConversationResponse,
  type MessageResponse,
  type CitationItem,
  MAX_SOURCE_FILE_SIZE,
  ALLOWED_SOURCE_EXTENSIONS,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { StudyStudioPanel } from "./StudyStudioPanel";

export function NotebookWorkspacePage() {
  const { id: notebookId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Notebook Detail State
  const [notebook, setNotebook] = useState<NotebookDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Responsive Mobile Tab State: 'sources' | 'chat' | 'studio'
  const [activeTab, setActiveTab] = useState<"sources" | "chat" | "studio">("chat");

  // Sources State
  const [sources, setSources] = useState<SourceResponse[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<SourceResponse | null>(null);
  const [deletingSource, setDeletingSource] = useState(false);
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Conversations State
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ConversationResponse | null>(null);
  const [deletingChat, setDeletingChat] = useState(false);

  // Messages & Chat State
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<CitationItem[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Citation Detail Modal State
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);

  // Auto-scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Initial Notebook Fetch
  const loadNotebookData = async (isPolling = false) => {
    if (!notebookId) return;
    if (!isPolling) setLoading(true);
    try {
      const data = await getNotebookDetail(notebookId);
      setNotebook(data);
      setSources(data.sources);
      setConversations(data.conversations);

      // Select active conversation if none selected
      if (!activeConversationId && data.conversations.length > 0) {
        setActiveConversationId(data.conversations[0].id);
      }
    } catch (err: any) {
      if (!isPolling) {
        setError(err?.message || "Failed to load notebook workspace.");
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotebookData();
  }, [notebookId]);

  // Polling for pending sources
  useEffect(() => {
    const hasPending = sources.some((s) => s.processing_status === "pending");
    if (!hasPending || !notebookId) return;

    const interval = setInterval(async () => {
      try {
        const updatedSources = await listNotebookSources(notebookId);
        setSources(updatedSources);
      } catch {
        // Ignore polling error
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sources, notebookId]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);
    setChatError(null);

    getConversationMessages(activeConversationId)
      .then((msgs) => {
        if (isMounted) {
          setMessages(msgs);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setChatError(err?.message || "Failed to load messages.");
        }
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeConversationId]);

  // Handle Source Upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !notebookId) return;
    const file = files[0];
    setUploadError(null);

    // Client-side validations
    if (file.size > MAX_SOURCE_FILE_SIZE) {
      setUploadError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 20 MB limit.`
      );
      return;
    }

    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    if (!ALLOWED_SOURCE_EXTENSIONS.includes(ext)) {
      setUploadError(
        `File type "${ext}" is not supported. Supported: ${ALLOWED_SOURCE_EXTENSIONS.join(", ")}`
      );
      return;
    }

    setUploadProgress(0);
    try {
      const newSource = await uploadNotebookSource(notebookId, file, (pct) => {
        setUploadProgress(pct);
      });
      setSources((prev) => [newSource, ...prev]);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload document source.");
      setUploadProgress(null);
    }
  };

  // Handle Source Deletion
  const handleDeleteSourceConfirm = async () => {
    if (!sourceToDelete) return;
    setDeletingSource(true);
    try {
      await deleteSource(sourceToDelete.id);
      setSources((prev) => prev.filter((s) => s.id !== sourceToDelete.id));
      setSourceToDelete(null);
    } catch (err: any) {
      setUploadError(err?.message || "Failed to delete source.");
    } finally {
      setDeletingSource(false);
    }
  };

  // Handle Create Conversation
  const handleCreateChat = async () => {
    if (!notebookId || creatingChat) return;
    setCreatingChat(true);
    try {
      const newChat = await createNotebookConversation(
        notebookId,
        `Chat ${conversations.length + 1}`
      );
      setConversations((prev) => [newChat, ...prev]);
      setActiveConversationId(newChat.id);
      setMessages([]);
      setActiveTab("chat"); // Switch to chat tab on mobile
    } catch (err: any) {
      setChatError(err?.message || "Failed to create new chat.");
    } finally {
      setCreatingChat(false);
    }
  };

  // Handle Delete Conversation
  const handleDeleteChatConfirm = async () => {
    if (!chatToDelete) return;
    setDeletingChat(true);
    try {
      await deleteConversation(chatToDelete.id);
      const remaining = conversations.filter((c) => c.id !== chatToDelete.id);
      setConversations(remaining);
      if (activeConversationId === chatToDelete.id) {
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
      setChatToDelete(null);
    } catch (err: any) {
      setChatError(err?.message || "Failed to delete conversation.");
    } finally {
      setDeletingChat(false);
    }
  };

  // Handle Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const prompt = inputPrompt.trim();
    if (!prompt || isGenerating) return;

    // Ensure we have an active conversation, or create one automatically
    let currentConvId = activeConversationId;
    if (!currentConvId) {
      if (!notebookId) return;
      try {
        const newChat = await createNotebookConversation(notebookId, "Course Discussion");
        setConversations((prev) => [newChat, ...prev]);
        setActiveConversationId(newChat.id);
        currentConvId = newChat.id;
      } catch (err: any) {
        setChatError("Failed to initiate chat conversation.");
        return;
      }
    }

    // Add user message optimistically
    const tempUserMsg: MessageResponse = {
      id: "temp-user-" + Date.now(),
      conversation_id: currentConvId,
      role: "user",
      content: prompt,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputPrompt("");
    setChatError(null);
    setIsGenerating(true);
    setStreamingText("");
    setStreamingCitations([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let accumulatedText = "";
      let accumulatedCitations: CitationItem[] = [];

      const stream = chatInConversation(
        currentConvId,
        prompt,
        undefined,
        undefined,
        controller.signal
      );

      for await (const event of stream) {
        if (event.type === "delta") {
          accumulatedText += event.text;
          setStreamingText(accumulatedText);
        } else if (event.type === "citations") {
          accumulatedCitations = event.citations;
          setStreamingCitations(event.citations);
        } else if (event.type === "error") {
          setChatError(event.message);
        } else if (event.type === "done") {
          // Finished streaming
        }
      }

      // Add final assistant message
      if (accumulatedText) {
        const assistantMsg: MessageResponse = {
          id: "temp-assistant-" + Date.now(),
          conversation_id: currentConvId,
          role: "assistant",
          content: accumulatedText,
          created_at: new Date().toISOString(),
          citations: accumulatedCitations.length > 0 ? accumulatedCitations : undefined,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setChatError(err?.message || "Chat request failed.");
      }
    } finally {
      setIsGenerating(false);
      setStreamingText("");
      setStreamingCitations([]);
      abortControllerRef.current = null;
    }
  };

  // Abort Generation
  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Highlight matching source when citation is clicked
  const handleCitationClick = (citation: CitationItem) => {
    setSelectedCitation(citation);
    setHighlightedSourceId(citation.source_id);
    setActiveTab("sources"); // Switch tab on mobile so source is visible

    // Clear highlight after 4 seconds
    setTimeout(() => {
      setHighlightedSourceId(null);
    }, 4000);
  };

  // Highlight source clicked from Study Studio
  const handleStudioSourceClick = (sourceId: string) => {
    setHighlightedSourceId(sourceId);
    setActiveTab("sources");
    setTimeout(() => {
      setHighlightedSourceId(null);
    }, 4000);
  };

  // Format file size
  const formatBytes = (bytes: number | null) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh] space-y-3 flex-col">
        <Loader2 className="w-8 h-8 animate-spin text-[#C6F432]" />
        <p className="text-xs text-muted-foreground font-medium">
          Loading notebook workspace...
        </p>
      </div>
    );
  }

  if (error || !notebook) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-12">
        <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">
            Notebook Not Found
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {error || "The requested notebook could not be retrieved or you lack permission to view it."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/notebooks")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Notebooks
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* ─── Top Workspace Bar ────────────────────────────────────────────── */}
      <header className="h-14 border-b border-border/80 px-4 flex items-center justify-between shrink-0 bg-card/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <Link
            to="/notebooks"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title="Back to Notebooks"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2 overflow-hidden">
            <span className="p-1.5 rounded-lg bg-[#C6F432]/10 border border-[#C6F432]/20 text-[#C6F432] shrink-0">
              <BookOpen className="w-4 h-4 text-[#C6F432]" />
            </span>
            <div className="truncate">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate">
                {notebook.title}
              </h1>
              {notebook.description && (
                <p className="text-[10px] text-muted-foreground truncate hidden sm:block">
                  {notebook.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Tab Selector (Visible on < lg screens) */}
        <div className="flex lg:hidden items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("sources")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
              activeTab === "sources"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sources ({sources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
              activeTab === "chat"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
              activeTab === "studio"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Studio
          </button>
        </div>

        {/* Desktop Quick Stats */}
        <div className="hidden lg:flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] py-0.5 px-2 font-medium">
            <FileText className="w-3 h-3 mr-1 text-muted-foreground" />
            {sources.length} {sources.length === 1 ? "source" : "sources"}
          </Badge>
          <Badge variant="outline" className="text-[10px] py-0.5 px-2 font-medium">
            <MessageSquare className="w-3 h-3 mr-1 text-muted-foreground" />
            {conversations.length} {conversations.length === 1 ? "chat" : "chats"}
          </Badge>
        </div>
      </header>

      {/* ─── 3-Column Workspace Grid ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── LEFT PANEL: Sources & Conversations (320px) ────────────────── */}
        <aside
          className={`w-full lg:w-80 shrink-0 border-r border-border/80 flex flex-col bg-card/20 overflow-hidden ${
            activeTab !== "sources" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Sources Section */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-border/60">
            {/* Sources Header */}
            <div className="p-3.5 pb-2 flex items-center justify-between border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C6F432]" />
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Sources ({sources.length})
                </h2>
              </div>

              {/* Upload Trigger Button */}
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <span className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-[#0B0B0C] bg-[#C6F432] hover:bg-[#b7e22a] px-2.5 py-1 rounded-lg transition-colors shadow-xs">
                  <Upload className="w-3 h-3" />
                  Add Source
                </span>
              </label>
            </div>

            {/* Upload Progress Bar */}
            {uploadProgress !== null && (
              <div className="p-3 bg-muted/40 border-b border-border/40 space-y-1.5 shrink-0">
                <div className="flex justify-between text-[10px] font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    Uploading document...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-border/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#C6F432] h-full transition-all duration-200"
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
                  onClick={() => setUploadError(null)}
                  className="p-1 hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Sources List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {sources.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground space-y-2 my-auto">
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground/60" />
                  <p className="text-xs font-medium">No sources added yet</p>
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                    Upload course notes, textbook PDFs, slides, or documents (max 20 MB) to ground AI responses.
                  </p>
                </div>
              ) : (
                sources.map((src) => {
                  const isHighlighted = highlightedSourceId === src.id;
                  return (
                    <div
                      key={src.id}
                      className={`p-3 rounded-xl border transition-all duration-200 group relative ${
                        isHighlighted
                          ? "border-[#C6F432] bg-[#C6F432]/10 ring-2 ring-[#C6F432]/30"
                          : "border-border/60 bg-card/60 hover:border-border hover:bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate flex-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {src.display_title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span>{formatBytes(src.file_size_bytes)}</span>
                            <span>&bull;</span>
                            <span className="uppercase text-[9px] font-bold">
                              {src.source_type}
                            </span>
                          </div>
                        </div>

                        {/* Delete Source Action */}
                        <button
                          type="button"
                          onClick={() => setSourceToDelete(src)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all shrink-0"
                          title="Delete source"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Status Indicator */}
                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        {src.processing_status === "completed" && (
                          <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Ready for grounding
                          </span>
                        )}
                        {src.processing_status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-amber-500 font-semibold animate-pulse">
                            <Clock className="w-3 h-3" />
                            Extracting text...
                          </span>
                        )}
                        {src.processing_status === "failed" && (
                          <span className="inline-flex items-center gap-1 text-destructive font-semibold" title={src.error_message || undefined}>
                            <AlertCircle className="w-3 h-3" />
                            Processing failed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Conversations Section */}
          <div className="h-60 shrink-0 flex flex-col bg-muted/20">
            <div className="p-3 pb-2 flex items-center justify-between border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#C6F432]" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Chats ({conversations.length})
                </h3>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCreateChat}
                isLoading={creatingChat}
                className="h-7 px-2 text-[11px] font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Chat
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-[11px]">
                  No chats created yet. Click "+ New Chat" to begin.
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setActiveTab("chat");
                      }}
                      className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all duration-150 group ${
                        isActive
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="truncate flex-1 mr-2">{conv.title}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatToDelete(conv);
                        }}
                        className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                          isActive
                            ? "hover:bg-primary-foreground/20 text-primary-foreground"
                            : "hover:bg-destructive/10 text-destructive"
                        }`}
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* ─── CENTER PANEL: Grounded AI Chat (Flex-1) ────────────────────── */}
        <main
          className={`flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative ${
            activeTab !== "chat" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Active Chat Header */}
          <div className="h-12 border-b border-border/60 px-4 flex items-center justify-between shrink-0 bg-card/20">
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="w-4 h-4 text-[#C6F432] shrink-0" />
              <span className="text-xs font-bold text-foreground truncate">
                {conversations.find((c) => c.id === activeConversationId)?.title || "Active Discussion"}
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                &bull; Grounded across {sources.filter((s) => s.processing_status === "completed").length} active sources
              </span>
            </div>

            {sources.length === 0 && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">
                No sources attached
              </Badge>
            )}
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {loadingMessages && (
              <div className="flex items-center justify-center h-48 space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#C6F432]" />
                <span className="text-xs text-muted-foreground">Loading chat messages...</span>
              </div>
            )}

            {!loadingMessages && messages.length === 0 && !streamingText && (
              <div className="max-w-md mx-auto text-center py-12 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#C6F432]/10 border border-[#C6F432]/20 text-[#C6F432] flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6 text-[#C6F432]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Grounded Course Assistant
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Ask questions grounded directly in your uploaded course materials. Answers will include precise citations to your sources.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-2 text-left">
                  {[
                    "Summarize the key concepts across my lecture notes.",
                    "What are the main exam topics covered in these sources?",
                    "Explain the most difficult concept step-by-step.",
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputPrompt(suggestion);
                      }}
                      className="p-2.5 rounded-xl border border-border/80 bg-card/60 text-xs text-foreground hover:bg-card hover:border-primary/40 transition-colors text-left"
                    >
                      &ldquo;{suggestion}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Messages */}
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${
                    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-[#C6F432]/15 border border-[#C6F432]/30 text-[#C6F432]"
                    }`}
                  >
                    {isUser ? "U" : <Sparkles className="w-3.5 h-3.5 text-[#C6F432]" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`space-y-2 rounded-2xl p-4 text-xs leading-relaxed max-w-[85vw] sm:max-w-xl ${
                      isUser
                        ? "bg-primary text-primary-foreground font-medium rounded-tr-sm"
                        : "bg-card border border-border/80 text-foreground rounded-tl-sm shadow-xs"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <MarkdownContent content={msg.content} />
                    )}

                    {/* Citations below assistant message */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2 mt-2 border-t border-border/40">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <BookMarked className="w-3 h-3 text-[#C6F432]" />
                          Grounded Citations:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((cite, cIdx) => (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() => handleCitationClick(cite)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#C6F432]/10 border border-[#C6F432]/25 text-[#C6F432] hover:bg-[#C6F432]/20 transition-colors"
                              title={`Chunk #${cite.chunk_index}: Click to inspect source`}
                            >
                              <span>[{cIdx + 1}]</span>
                              <span className="truncate max-w-[120px]">{cite.display_title}</span>
                              <span className="text-[9px] text-muted-foreground">p.{cite.chunk_index + 1}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Streaming Message */}
            {isGenerating && streamingText && (
              <div className="flex gap-3 max-w-3xl mr-auto">
                <div className="w-7 h-7 rounded-lg bg-[#C6F432]/15 border border-[#C6F432]/30 text-[#C6F432] flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#C6F432] animate-pulse" />
                </div>
                <div className="space-y-2 rounded-2xl p-4 text-xs leading-relaxed max-w-[85vw] sm:max-w-xl bg-card border border-border/80 text-foreground rounded-tl-sm shadow-xs">
                  <MarkdownContent content={streamingText} />
                  <span className="inline-block w-1.5 h-3 bg-[#C6F432] ml-1 animate-pulse" />

                  {/* Citations during stream */}
                  {streamingCitations.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-border/40">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <BookMarked className="w-3 h-3 text-[#C6F432]" />
                        Identified Grounding Sources:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {streamingCitations.map((cite, cIdx) => (
                          <span
                            key={cIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#C6F432]/10 border border-[#C6F432]/25 text-[#C6F432]"
                          >
                            <span>[{cIdx + 1}]</span>
                            <span className="truncate max-w-[120px]">{cite.display_title}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Banner in Chat */}
            {chatError && (
              <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between gap-2 max-w-md mx-auto">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{chatError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChatError(null)}
                  className="p-1 hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer Box */}
          <div className="p-3 md:p-4 border-t border-border/80 bg-card/40 backdrop-blur-sm shrink-0">
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center">
              <input
                type="text"
                placeholder={
                  sources.length > 0
                    ? "Ask anything grounded in your course materials..."
                    : "Ask academic questions (upload sources to ground responses)..."
                }
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                disabled={isGenerating}
                className="w-full pl-4 pr-24 py-3 text-xs rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-[#C6F432] focus:border-transparent text-foreground placeholder:text-muted-foreground"
              />

              <div className="absolute right-2 flex items-center gap-1">
                {isGenerating ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAbort}
                    className="h-8 px-2.5 text-[11px] text-destructive border-destructive/40 hover:bg-destructive/10"
                  >
                    <Square className="w-3 h-3 mr-1 fill-destructive text-destructive" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="lime"
                    size="sm"
                    disabled={!inputPrompt.trim()}
                    className="h-8 px-3 text-[11px] font-bold"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Send
                  </Button>
                )}
              </div>
            </form>
          </div>
        </main>

        {/* ─── RIGHT PANEL: Functional Study Studio (Phase 4B) ─────────────── */}
        <aside
          className={`w-full lg:w-80 xl:w-96 shrink-0 border-l border-border/80 flex flex-col overflow-hidden ${
            activeTab !== "studio" ? "hidden lg:flex" : "flex"
          }`}
        >
          {notebook && (
            <StudyStudioPanel
              notebookId={notebook.id}
              notebookTitle={notebook.title}
              sources={sources}
              onSourceClick={handleStudioSourceClick}
            />
          )}
        </aside>
      </div>

      {/* Delete Source Dialog */}
      <Dialog
        open={Boolean(sourceToDelete)}
        onOpenChange={(open) => {
          if (!open) setSourceToDelete(null);
        }}
        title="Delete Source"
        description="Permanently remove this document source from the notebook."
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to remove{" "}
            <strong className="text-foreground font-bold">
              {sourceToDelete?.display_title}
            </strong>
            ? Its extracted text and grounding chunks will no longer be available in AI chat queries.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSourceToDelete(null)}
              disabled={deletingSource}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSourceConfirm}
              isLoading={deletingSource}
            >
              Delete Source
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Chat Dialog */}
      <Dialog
        open={Boolean(chatToDelete)}
        onOpenChange={(open) => {
          if (!open) setChatToDelete(null);
        }}
        title="Delete Chat"
        description="Permanently remove this conversation and its message history."
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to delete{" "}
            <strong className="text-foreground font-bold">
              {chatToDelete?.title}
            </strong>
            ? All messages in this thread will be permanently deleted.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setChatToDelete(null)}
              disabled={deletingChat}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteChatConfirm}
              isLoading={deletingChat}
            >
              Delete Chat
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Citation Detail Modal */}
      <Dialog
        open={Boolean(selectedCitation)}
        onOpenChange={(open) => {
          if (!open) setSelectedCitation(null);
        }}
        title="Source Citation Detail"
        description="Grounding context used to generate this response."
      >
        {selectedCitation && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-border/80 bg-muted/40 space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                Source Document
              </span>
              <p className="text-xs font-bold text-foreground">
                {selectedCitation.display_title}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Grounding Chunk #{selectedCitation.chunk_index}
                {selectedCitation.section ? ` &bull; Section: ${selectedCitation.section}` : ""}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCitation(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
