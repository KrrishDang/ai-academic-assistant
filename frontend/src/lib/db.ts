const DB_NAME = "ai_study_platform";
const DB_VERSION = 1;

export interface DocumentMetadata {
  documentId: string;
  filename: string;
  uploadDate: string;
  lastOpened: string;
  status?: string;
  generatedCount?: number;
}

export interface ChatHistory {
  documentId: string;
  messages: any[];
}

export interface GeneratedResults {
  documentId: string;
  notes?: string;
  mcqs?: string;
  viva?: string;
  explanation?: string;
  fiveMarks?: string;
  tenMarks?: string;
  flashcards?: string;
  summary?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "documentId" });
      }
      if (!db.objectStoreNames.contains("chats")) {
        db.createObjectStore("chats", { keyPath: "documentId" });
      }
      if (!db.objectStoreNames.contains("results")) {
        db.createObjectStore("results", { keyPath: "documentId" });
      }
    };
  });
}

export async function saveDocumentMetadata(meta: DocumentMetadata): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("metadata", "readwrite");
    const store = tx.objectStore("metadata");
    const request = store.put(meta);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getDocumentMetadata(documentId: string): Promise<DocumentMetadata | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("metadata", "readonly");
    const store = tx.objectStore("metadata");
    const request = store.get(documentId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllDocumentsMetadata(): Promise<DocumentMetadata[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("metadata", "readonly");
    const store = tx.objectStore("metadata");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveChatHistory(documentId: string, messages: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chats", "readwrite");
    const store = tx.objectStore("chats");
    const request = store.put({ documentId, messages });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getChatHistory(documentId: string): Promise<any[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chats", "readonly");
    const store = tx.objectStore("chats");
    const request = store.get(documentId);
    request.onsuccess = () => {
      resolve(request.result ? request.result.messages : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveGeneratedResult(
  documentId: string,
  key: keyof Omit<GeneratedResults, "documentId">,
  value: string
): Promise<void> {
  const db = await openDB();
  
  // First load existing results to preserve other fields
  const existing = await getGeneratedResults(documentId) || { documentId };
  existing[key] = value;

  return new Promise((resolve, reject) => {
    const tx = db.transaction("results", "readwrite");
    const store = tx.objectStore("results");
    const request = store.put(existing);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getGeneratedResults(documentId: string): Promise<GeneratedResults | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("results", "readonly");
    const store = tx.objectStore("results");
    const request = store.get(documentId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDocumentData(documentId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["metadata", "chats", "results"], "readwrite");
    tx.objectStore("metadata").delete(documentId);
    tx.objectStore("chats").delete(documentId);
    tx.objectStore("results").delete(documentId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllLocalData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["metadata", "chats", "results"], "readwrite");
    tx.objectStore("metadata").clear();
    tx.objectStore("chats").clear();
    tx.objectStore("results").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllGeneratedResults(): Promise<GeneratedResults[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("results", "readonly");
    const store = tx.objectStore("results");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
