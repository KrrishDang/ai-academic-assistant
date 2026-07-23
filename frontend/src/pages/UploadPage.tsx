import { useState } from "react";
import { DocumentUpload } from "@/features/documents/DocumentUpload";
import { useDocuments } from "@/features/documents/DocumentContext";
import { useConversations } from "@/features/conversations/ConversationContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, ArrowRight, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

/** Page for validating, uploading, and managing academic PDF notes. */
export function UploadPage() {
  const { documents, selectDocument, deleteDoc } = useDocuments();
  const { conversations, selectConversation, createNewConversation } = useConversations();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

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
      } catch (err) {
        console.error("Failed to delete document:", err);
      }
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Documents</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Manage your study library</h1>
        <p className="text-muted-foreground text-sm font-medium leading-relaxed">
          Upload text-based academic PDFs (up to 20 MB) and manage your existing Study Hub materials.
        </p>
      </header>

      {/* Upload Box */}
      <section className="bg-card/20 border border-border/60 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">Upload New Document</h2>
        <DocumentUpload />
      </section>

      {/* Document Library Section */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Document Library</h2>
          
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full rounded-md border border-input bg-background/50 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
            />
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
            {searchQuery ? `No documents match "${searchQuery}"` : "Your document library is empty."}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <Card 
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                className="hover:scale-[1.01] active:scale-[0.99] cursor-pointer transition-all duration-300 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md border border-border/80 rounded-xl flex flex-col justify-between p-5 h-[210px] group relative overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                        <FileText size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-foreground truncate" title={doc.filename}>
                        {doc.filename}
                      </h3>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-[10px] font-semibold text-muted-foreground space-y-1.5 mt-3 flex-1">
                    <div className="flex justify-between">
                      <span>Pages:</span>
                      <span className="text-foreground">{doc.page_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Study Materials:</span>
                      <span className="text-primary font-bold">{doc.generatedCount || 0} saved</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Opened:</span>
                      <span className="text-foreground">{doc.lastOpened ? new Date(doc.lastOpened).toLocaleDateString() : "Never"}</span>
                    </div>
                  </div>
                </div>

                {/* Consistent Footer Actions */}
                <div className="mt-auto pt-3 border-t border-border/20 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <Button
                      onClick={() => handleSelectDoc(doc)}
                      variant="outline"
                      className="h-7 px-2.5 text-[10px] font-bold border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.98] transition-all"
                    >
                      View Materials
                    </Button>
                    <Button
                      onClick={(e) => handleDeleteDoc(e, doc.id)}
                      variant="outline"
                      className="h-7 w-7 p-0 flex items-center justify-center border-border/60 text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all"
                      title="Delete document"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  
                  <Button
                    onClick={() => handleSelectDoc(doc)}
                    className="h-7 px-3 text-[10px] font-bold flex items-center gap-1 active:scale-[0.98] transition-all hover:opacity-90"
                  >
                    <span>Open AI Tutor</span>
                    <ArrowRight size={10} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
