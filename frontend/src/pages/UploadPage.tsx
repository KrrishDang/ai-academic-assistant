import { useState } from "react";
import { DocumentUpload } from "@/features/documents/DocumentUpload";
import { useDocuments, type EnrichedDocument } from "@/features/documents/DocumentContext";
import { useConversations } from "@/features/conversations/ConversationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Trash2, 
  ArrowRight, 
  Search, 
  Upload, 
  CheckCircle2, 
  Edit2, 
  FolderOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/** Page for validating, uploading, and managing academic PDF notes. */
export function UploadPage() {
  const { documents, selectDocument, deleteDoc, renameDoc } = useDocuments();
  const { conversations, selectConversation, createNewConversation } = useConversations();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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
    }
  };

  const handleRenameSubmit = async (id: string) => {
    if (editName.trim()) {
      await renameDoc(id, editName.trim());
      setEditingId(null);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Upload size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Documents & Upload</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Upload PDF textbooks, lecture slides, and notes (up to 20MB / 500 pages) for AI processing.
          </p>
        </div>
      </div>

      {/* Main Upload Dropzone Component */}
      <Card className="border border-border/80 bg-card/60 backdrop-blur-md p-6 shadow-lg">
        <DocumentUpload />
      </Card>

      {/* Uploaded Documents Library Section */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <FolderOpen size={18} className="text-primary" />
            <span>Uploaded Library</span>
            <span className="text-xs text-muted-foreground font-semibold">({documents.length} files)</span>
          </h2>

          {documents.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search uploaded PDFs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/60 bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
          )}
        </div>

        {documents.length === 0 ? (
          <Card className="border border-border/60 bg-card/40 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
              📄
            </div>
            <h3 className="text-sm font-bold">Your document library is empty</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Drag and drop your study PDF files above to start generating notes and chatting with AI.
            </p>
          </Card>
        ) : filteredDocs.length === 0 ? (
          <Card className="border border-border/60 bg-card/40 p-6 text-center text-xs text-muted-foreground">
            No files found matching &quot;{searchQuery}&quot;
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => (
              <Card
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                className="group cursor-pointer border border-border/60 bg-card hover:border-primary/60 hover:bg-muted/20 transition-all duration-200 shadow-sm"
              >
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        {editingId === doc.id ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-7 px-2 text-xs font-bold border border-primary rounded bg-background text-foreground"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleRenameSubmit(doc.id)}
                              className="h-7 px-2 text-[10px] font-bold"
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {doc.filename}
                          </h3>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
                          <span>{doc.page_count} Pages</span>
                          <span>•</span>
                          <span>{(doc.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                          <span>•</span>
                          <span className="text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckCircle2 size={10} /> Processed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(doc.id);
                          setEditName(doc.filename.replace(/\.pdf$/i, ""));
                        }}
                        className="h-7 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                        title="Rename file"
                      >
                        <Edit2 size={12} className="mr-1" />
                        <span>Rename</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteDoc(e, doc.id)}
                        className="h-7 px-2 text-[10px] font-semibold text-muted-foreground hover:text-destructive"
                        title="Delete file"
                      >
                        <Trash2 size={12} className="mr-1" />
                        <span>Delete</span>
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectDoc(doc);
                      }}
                      className="h-7 px-3 text-[11px] font-bold gap-1"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight size={12} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
