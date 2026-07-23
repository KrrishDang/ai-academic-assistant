import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  type DocumentResponse, 
  listDocuments, 
  renameDocument, 
  deleteDocument, 
  uploadPdf, 
  replaceDocument 
} from "@/lib/api";
import {
  saveDocumentMetadata,
  getDocumentMetadata,
  getAllDocumentsMetadata,
  deleteDocumentData,
  getGeneratedResults
} from "@/lib/db";

export type EnrichedDocument = DocumentResponse & {
  uploadDate?: string;
  lastOpened?: string;
  generatedCount?: number;
};

type DocumentContextType = {
  documents: EnrichedDocument[];
  activeDocument: EnrichedDocument | null;
  loading: boolean;
  error: string | null;
  fetchDocuments: () => Promise<void>;
  uploadNewDocument: (file: File, onProgress: (progress: number) => void) => Promise<EnrichedDocument>;
  renameDoc: (id: string, newName: string) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  replaceDoc: (id: string, file: File, onProgress: (progress: number) => void) => Promise<void>;
  selectDocument: (doc: EnrichedDocument) => Promise<void>;
  clearActiveDocument: () => void;
};

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<EnrichedDocument[]>([]);
  const [activeDocument, setActiveDocument] = useState<EnrichedDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await listDocuments();
      const localMetas = await getAllDocumentsMetadata();
      
      const enrichedDocs = await Promise.all(docs.map(async (doc) => {
        const localMeta = localMetas.find((m) => m.documentId === doc.id);
        const results = await getGeneratedResults(doc.id);
        
        let generatedCount = 0;
        if (results) {
          const keys: (keyof typeof results)[] = [
            "notes", "mcqs", "viva", "explanation", "fiveMarks", "tenMarks", "flashcards", "summary"
          ];
          for (const key of keys) {
            if (results[key]) generatedCount++;
          }
        }
        
        return {
          ...doc,
          uploadDate: localMeta?.uploadDate || doc.created_at,
          lastOpened: localMeta?.lastOpened || "",
          generatedCount
        };
      }));

      setDocuments(enrichedDocs);
      
      const storedPdf = sessionStorage.getItem("uploadedPdf");
      if (storedPdf) {
        try {
          const parsed = JSON.parse(storedPdf) as EnrichedDocument;
          const matched = enrichedDocs.find((d) => d.id === parsed.id);
          if (matched) {
            setActiveDocument(matched);
          }
        } catch {
          // ignore parsing error
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadNewDocument = async (file: File, onProgress: (progress: number) => void) => {
    setError(null);
    try {
      const processed = await uploadPdf(file, onProgress);
      const nowStr = new Date().toISOString();
      
      await saveDocumentMetadata({
        documentId: processed.id,
        filename: processed.filename,
        uploadDate: nowStr,
        lastOpened: nowStr
      });

      const newDoc: EnrichedDocument = {
        id: processed.id,
        filename: processed.filename,
        page_count: processed.page_count,
        file_size_bytes: file.size,
        extracted_text: processed.extracted_text,
        created_at: nowStr,
        uploadDate: nowStr,
        lastOpened: nowStr,
        generatedCount: 0
      };
      
      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocument(newDoc);
      sessionStorage.setItem("uploadedPdf", JSON.stringify(newDoc));
      return newDoc;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      throw err;
    }
  };

  const renameDoc = async (id: string, newName: string) => {
    try {
      const updated = await renameDocument(id, newName);
      const localMeta = await getDocumentMetadata(id);
      if (localMeta) {
        await saveDocumentMetadata({
          ...localMeta,
          filename: newName
        });
      }
      
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed.");
      throw err;
    }
  };

  const deleteDoc = async (id: string) => {
    try {
      await deleteDocument(id);
      await deleteDocumentData(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (activeDocument?.id === id) {
        setActiveDocument(null);
        sessionStorage.removeItem("uploadedPdf");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion failed.");
      throw err;
    }
  };

  const replaceDoc = async (id: string, file: File, onProgress: (progress: number) => void) => {
    try {
      const updated = await replaceDocument(id, file, onProgress);
      const nowStr = new Date().toISOString();
      const localMeta = await getDocumentMetadata(id);
      await saveDocumentMetadata({
        documentId: id,
        filename: updated.filename,
        uploadDate: localMeta?.uploadDate || nowStr,
        lastOpened: nowStr
      });
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "File replacement failed.");
      throw err;
    }
  };

  const selectDocument = useCallback(async (doc: EnrichedDocument) => {
    const nowStr = new Date().toISOString();
    const localMeta = await getDocumentMetadata(doc.id);
    const updatedMeta = {
      documentId: doc.id,
      filename: doc.filename,
      uploadDate: localMeta?.uploadDate || doc.uploadDate || doc.created_at || nowStr,
      lastOpened: nowStr
    };
    await saveDocumentMetadata(updatedMeta);
    
    const enriched = {
      ...doc,
      ...updatedMeta
    };
    
    setActiveDocument(enriched);
    sessionStorage.setItem("uploadedPdf", JSON.stringify(enriched));
    
    // Refresh documents to update lastOpened and count in lists
    fetchDocuments();
  }, [fetchDocuments]);

  const clearActiveDocument = useCallback(() => {
    setActiveDocument(null);
    sessionStorage.removeItem("uploadedPdf");
  }, []);

  return (
    <DocumentContext.Provider
      value={{
        documents,
        activeDocument,
        loading,
        error,
        fetchDocuments,
        uploadNewDocument,
        renameDoc,
        deleteDoc,
        replaceDoc,
        selectDocument,
        clearActiveDocument,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocuments must be used within a DocumentProvider");
  }
  return context;
}
