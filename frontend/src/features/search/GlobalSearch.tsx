import { useState, useEffect, useRef } from "react";
import { Search, Loader2, FileText, MessageSquare, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useDocuments } from "@/features/documents/DocumentContext";
import { useConversations } from "@/features/conversations/ConversationContext";
import { executeGlobalSearch, type SearchResultsResponse } from "@/lib/api";

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  // Escapes regex characters to avoid crashes
  const escapedQuery = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-primary font-bold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { selectDocument } = useDocuments();
  const { selectConversation } = useConversations();
  
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search trigger
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      executeGlobalSearch(query.trim())
        .then((res) => {
          setResults(res);
        })
        .catch(() => {
          setResults(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Click outside to close handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectDoc = (doc: import("@/lib/api").DocumentResponse) => {
    selectDocument(doc);
    setIsOpen(false);
    setQuery("");
    navigate("/workspace");
  };

  const handleSelectConv = async (conv: import("@/lib/api").ConversationResponse) => {
    await selectConversation(conv);
    setIsOpen(false);
    setQuery("");
    navigate("/workspace");
  };

  const clearSearch = () => {
    setQuery("");
    setResults(null);
  };

  const hasResults = results && (
    results.documents.length > 0 || 
    results.conversations.length > 0 || 
    results.messages.length > 0
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          <Search size={15} />
        </span>
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          placeholder="Search documents..."
          className="flex h-9 w-full rounded-lg border border-input bg-background/40 pl-9 pr-8 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/40"
        />
        {query && (
          <button 
            onClick={clearSearch}
            className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Results Dropdown Overlay */}
      {isOpen && (query.trim() || loading) && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 max-h-[380px] overflow-y-auto rounded-xl border border-border/80 bg-card/95 backdrop-blur-md p-3 shadow-xl space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground font-semibold">
              <Loader2 size={14} className="animate-spin text-primary" />
              Searching documents...
            </div>
          )}

          {!loading && !hasResults && (
            <div className="py-6 text-center text-xs text-muted-foreground font-medium">
              No matches found for "{query}".
            </div>
          )}

          {!loading && results && (
            <>
              {/* Documents Category */}
              {results.documents.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                    Documents ({results.documents.length})
                  </h4>
                  {results.documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectDoc(doc)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 cursor-pointer text-left transition-colors"
                    >
                      <FileText size={14} className="text-primary shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate flex-1">
                        <HighlightMatch text={doc.filename} query={query} />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Conversations Category */}
              {results.conversations.length > 0 && (
                <div className="space-y-1 pt-1">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                    Conversations ({results.conversations.length})
                  </h4>
                  {results.conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConv(conv)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 cursor-pointer text-left transition-colors"
                    >
                      <MessageSquare size={14} className="text-primary shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate flex-1">
                        <HighlightMatch text={conv.title} query={query} />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Messages Category */}
              {results.messages.length > 0 && (
                <div className="space-y-1 pt-1">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                    Messages ({results.messages.length})
                  </h4>
                  {results.messages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => navigate("/") || selectConversation({ id: msg.conversation_id, title: msg.conversation_title, document_id: null, created_at: "", updated_at: "" } as import("@/lib/api").ConversationResponse)}
                      className="flex flex-col p-2 rounded-lg hover:bg-primary/5 cursor-pointer text-left transition-colors border border-transparent hover:border-border/30"
                    >
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary">
                        <MessageSquare size={10} />
                        <span>In {msg.conversation_title} ({msg.role})</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate font-medium mt-0.5 pl-3.5">
                        <HighlightMatch text={msg.content} query={query} />
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
