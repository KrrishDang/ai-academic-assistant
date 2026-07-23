import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { useDocuments } from "./DocumentContext";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

type UploadState = "idle" | "uploading" | "success" | "error";

function validateFile(file: File): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are accepted.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "The PDF must be 20 MB or smaller.";
  }
  return null;
}

import { useConversations } from "@/features/conversations/ConversationContext";

export function DocumentUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { uploadNewDocument } = useDocuments();
  const { conversations, selectConversation, createNewConversation } = useConversations();

  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("Drop a PDF here, or select a file.");
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedPdf, setProcessedPdf] = useState<import("@/lib/api").DocumentResponse | null>(null);

  async function submit(file: File | undefined) {
    if (!file) return;

    const validationMessage = validateFile(file);
    if (validationMessage) {
      setState("error");
      setMessage(validationMessage);
      return;
    }

    setState("uploading");
    setProgress(0);
    setProcessedPdf(null);
    setMessage(`Uploading ${file.name}...`);
    try {
      const document = await uploadNewDocument(file, (percentage) => {
        setProgress(percentage);
        setMessage(percentage >= 95 ? "Extracting text from your PDF..." : `Uploading ${percentage}%...`);
      });
      setState("success");
      setProcessedPdf(document);
      setMessage(`${document.filename} processed successfully! ${document.page_count} pages extracted.`);
      
      // Auto-navigate to AI Tutor on dashboard
      setTimeout(async () => {
        const existing = conversations.find((c) => c.document_id === document.id);
        if (existing) {
          await selectConversation(existing);
        } else {
          await createNewConversation(document.id, document.filename);
        }
        navigate("/");
      }, 1000);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void submit(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void submit(event.dataTransfer.files[0]);
  }

  return (
    <motion.section 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-xl rounded-2xl border border-border/80 bg-card/45 backdrop-blur-md p-6 shadow-lg transition-all duration-300"
    >
      <h2 className="text-xl font-bold tracking-tight">Upload PDF notes</h2>
      <p className="mt-1 text-xs text-muted-foreground font-semibold">Select or drag your text-based PDF (up to 20 MB).</p>
      
      <div
        className={`mt-6 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 flex flex-col items-center justify-center ${
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.01]" 
            : "border-border hover:border-primary/30 hover:bg-primary/5"
        }`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="application/pdf,.pdf"
          onChange={onInputChange}
        />
        
        <div className={`rounded-full p-4 mb-3 transition-colors duration-300 ${
          isDragging ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          <UploadCloud size={32} className={isDragging ? "animate-bounce" : ""} />
        </div>
        
        <p className="font-bold text-sm sm:text-base">
          {isDragging ? "Drop your document here" : "Drag & drop your PDF here"}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground font-semibold">
          or click to browse local files
        </p>
      </div>

      <AnimatePresence mode="wait">
        {state === "uploading" && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 space-y-2" 
            aria-label={`Upload progress: ${progress}%`}
          >
            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
              <span className="truncate">{message}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div 
                className="h-full bg-gradient-to-r from-primary to-violet-600 rounded-full" 
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {state !== "uploading" && state !== "idle" && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`mt-5 flex items-start gap-3 rounded-lg p-4 text-xs font-semibold border ${
              state === "error" 
                ? "bg-red-500/5 border-red-500/20 text-red-600" 
                : "bg-green-500/5 border-green-500/20 text-green-700"
            }`} 
            aria-live="polite"
          >
            {state === "error" ? (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            )}
            <p className="flex-1 leading-normal">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {processedPdf && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 rounded-xl border border-border bg-muted/30 p-5" 
            aria-label="Extracted PDF text"
          >
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-primary" />
              <h3 className="font-bold text-xs tracking-tight">Extracted document content</h3>
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-card/50 p-4 border border-border text-[11px] leading-relaxed text-muted-foreground font-semibold font-mono">
              {processedPdf.extracted_text}
            </pre>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
