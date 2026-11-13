const apiBaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "http://localhost:8000/api/v1";

export { apiBaseUrl };

const AUTH_TOKEN_KEY = "studyhub_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getAnonymousSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("anonymous_session_id");
  if (!id) {
    id = typeof crypto !== "undefined" && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `sess_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    localStorage.setItem("anonymous_session_id", id);
  }
  return id;
}

function defaultHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Session-ID": getAnonymousSessionId(),
    ...extra,
  };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export type UserResponse = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type UserRegisterRequest = {
  email: string;
  password: string;
  display_name?: string;
};

export type UserLoginRequest = {
  email: string;
  password: string;
};

export async function registerUser(payload: UserRegisterRequest): Promise<UserResponse> {
  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Registration failed. Please try again.");
  }
  return response.json();
}

export async function loginUser(payload: UserLoginRequest): Promise<TokenResponse> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Invalid email or password.");
  }
  return response.json();
}

export async function getCurrentUser(): Promise<UserResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token available.");
  }
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    method: "GET",
    headers: defaultHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.detail || "Authentication expired.");
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

export type UploadError = Error & { status?: number };

export type ProcessedPdf = {
  id: string;
  filename: string;
  page_count: number;
  extracted_text: string;
};

export type DocumentResponse = {
  id: string;
  filename: string;
  page_count: number;
  file_size_bytes: number;
  extracted_text: string;
  created_at: string;
};

export type ConversationResponse = {
  id: string;
  document_id: string | null;
  notebook_id?: string | null;
  user_id?: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

export type MessageResponse = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
  citations?: CitationItem[];
};

export type CitationItem = {
  source_id: string;
  display_title: string;
  chunk_index: number;
  section?: string | null;
};

export type GenerationEvent =
  | { type: "delta"; text: string }
  | { type: "citations"; citations: CitationItem[] }
  | { type: "done" }
  | { type: "error"; message: string };

/* ─── V2 Notebook and Source Models ─────────────────────────────────────────── */

export type SourceResponse = {
  id: string;
  notebook_id: string;
  source_type: string;
  original_filename: string | null;
  display_title: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  content_hash: string | null;
  processing_status: "pending" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type NotebookSummaryResponse = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  source_count: number;
  conversation_count: number;
};

export type NotebookDetailResponse = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  sources: SourceResponse[];
  conversations: ConversationResponse[];
};

export type NotebookCreateRequest = {
  title: string;
  description?: string;
};

export type NotebookUpdateRequest = {
  title?: string;
  description?: string;
};

export const MAX_SOURCE_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_SOURCE_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt"];

export function validateSourceFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_SOURCE_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 20 MB.`,
    };
  }
  const extension = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  if (!ALLOWED_SOURCE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file type "${extension}". Supported formats are: ${ALLOWED_SOURCE_EXTENSIONS.join(", ")}.`,
    };
  }
  return { valid: true };
}

/** Upload one PDF and report browser-to-server transfer progress. */
export function uploadPdf(
  file: File,
  onProgress: (percentage: number) => void,
): Promise<ProcessedPdf> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);

    request.open("POST", `${apiBaseUrl}/documents`);
    request.setRequestHeader("X-Session-ID", getAnonymousSessionId());
    request.responseType = "json";

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(
          Math.min(95, Math.round((event.loaded / event.total) * 100)),
        );
      }
    });
    request.addEventListener("load", () => {
      const payload = request.response as
        | ProcessedPdf
        | { detail?: unknown }
        | null;
      if (request.status >= 200 && request.status < 300 && payload) {
        onProgress(100);
        resolve(payload as ProcessedPdf);
        return;
      }

      let errorMessage = "Upload failed.";
      if (payload && typeof payload === "object" && "detail" in payload) {
        if (typeof payload.detail === "string") {
          errorMessage = payload.detail;
        } else if (Array.isArray(payload.detail)) {
          errorMessage = payload.detail
            .map((d) =>
              typeof d === "object" && d !== null && "msg" in d
                ? d.msg
                : JSON.stringify(d),
            )
            .join(", ");
        } else {
          errorMessage = JSON.stringify(payload.detail);
        }
      }

      const error: UploadError = new Error(errorMessage);
      error.status = request.status;
      reject(error);
    });
    request.addEventListener("error", () =>
      reject(new Error("Network error during upload.")),
    );
    request.send(body);
  });
}

/** Retrieve all persistent documents. */
export async function listDocuments(): Promise<DocumentResponse[]> {
  const response = await fetch(`${apiBaseUrl}/documents`, {
    method: "GET",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch documents.");
  }

  return response.json();
}

/** Rename a document original filename. */
export async function renameDocument(
  id: string,
  filename: string,
): Promise<DocumentResponse> {
  const response = await fetch(`${apiBaseUrl}/documents/${id}`, {
    method: "PATCH",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ filename }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Failed to rename document.");
  }

  return response.json();
}

/** Delete a document record and its physical storage. */
export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/documents/${id}`, {
    method: "DELETE",
    headers: defaultHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete document.");
  }
}

/** Replace the physical file of an existing document, re-extracting text. */
export function replaceDocument(
  id: string,
  file: File,
  onProgress: (percentage: number) => void,
): Promise<DocumentResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);

    request.open("PUT", `${apiBaseUrl}/documents/${id}`);
    request.setRequestHeader("X-Session-ID", getAnonymousSessionId());
    request.responseType = "json";

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(
          Math.min(95, Math.round((event.loaded / event.total) * 100)),
        );
      }
    });
    request.addEventListener("load", () => {
      const payload = request.response as
        | DocumentResponse
        | { detail?: unknown }
        | null;
      if (request.status >= 200 && request.status < 300 && payload) {
        onProgress(100);
        resolve(payload as DocumentResponse);
        return;
      }

      let errorMessage = "Replacement failed.";
      if (payload && typeof payload === "object" && "detail" in payload) {
        if (typeof payload.detail === "string") {
          errorMessage = payload.detail;
        } else if (Array.isArray(payload.detail)) {
          errorMessage = payload.detail
            .map((d) =>
              typeof d === "object" && d !== null && "msg" in d
                ? d.msg
                : JSON.stringify(d),
            )
            .join(", ");
        } else {
          errorMessage = JSON.stringify(payload.detail);
        }
      }

      const error: UploadError = new Error(errorMessage);
      error.status = request.status;
      reject(error);
    });
    request.addEventListener("error", () =>
      reject(new Error("Network error during document replacement.")),
    );
    request.send(body);
  });
}

/** Fetch list of conversations. */
export async function listConversations(): Promise<ConversationResponse[]> {
  const response = await fetch(`${apiBaseUrl}/conversations`, {
    headers: defaultHeaders({ "Content-Type": "application/json" }),
  });
  if (!response.ok) throw new Error("Failed to list conversations.");
  return response.json();
}

/** Create a new conversation, optionally linked to a document. */
export async function createConversation(
  documentId: string | null,
  title?: string,
): Promise<ConversationResponse> {
  const response = await fetch(`${apiBaseUrl}/conversations`, {
    method: "POST",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ document_id: documentId, title }),
  });
  if (!response.ok) throw new Error("Failed to create conversation.");
  return response.json();
}

/** Rename an existing conversation's title. */
export async function renameConversation(
  id: string,
  title: string,
): Promise<ConversationResponse> {
  const response = await fetch(`${apiBaseUrl}/conversations/${id}`, {
    method: "PATCH",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error("Failed to rename conversation.");
  return response.json();
}

/** Delete a conversation. */
export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/conversations/${id}`, {
    method: "DELETE",
    headers: defaultHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete conversation.");
}

/** Get all messages in a conversation. */
export async function getConversationMessages(
  id: string,
): Promise<MessageResponse[]> {
  const response = await fetch(`${apiBaseUrl}/conversations/${id}/messages`, {
    headers: defaultHeaders({ "Content-Type": "application/json" }),
  });
  if (!response.ok) throw new Error("Failed to load messages.");
  return response.json();
}

/** Stream chat response inside a conversation. */
export async function* chatInConversation(
  conversationId: string,
  message: string,
  model?: string,
  temperature?: number,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  const response = await fetch(
    `${apiBaseUrl}/conversations/${conversationId}/chat`,
    {
      method: "POST",
      headers: defaultHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message, model, temperature }),
      signal,
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Chat request failed.");
  }
  if (!response.body) throw new Error("The response did not include a stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const eventType = event.match(/^event: (.+)$/m)?.[1];
      const data = event.match(/^data: (.+)$/m)?.[1];
      if (!eventType || !data) continue;

      try {
        if (eventType === "citations") {
          const parsed = JSON.parse(data);
          const citations: CitationItem[] = Array.isArray(parsed)
            ? parsed
            : (parsed?.citations ?? []);
          yield { type: "citations", citations };
        } else {
          const payload = JSON.parse(data) as { text?: string; message?: string };
          if (eventType === "delta" && payload.text)
            yield { type: "delta", text: payload.text };
          if (eventType === "error")
            yield {
              type: "error",
              message: payload.message ?? "Generation failed.",
            };
          if (eventType === "done") yield { type: "done" };
        }
      } catch {
        yield {
          type: "error",
          message: "Failed to parse generation event data.",
        };
      }
    }
    if (done) break;
  }
}

/** Request study material and yield the server-sent response as it arrives. */
export async function* generateNotes(
  extractedText: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/notes", extractedText, signal);
}

/** Request a streamed answer suitable for a five-mark exam question. */
export async function* generateFiveMarkAnswer(
  extractedText: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/5-mark-answer", extractedText, signal);
}

/** Request a streamed answer suitable for a ten-mark exam question. */
export async function* generateTenMarkAnswer(
  extractedText: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/10-mark-answer", extractedText, signal);
}

/** Request streamed multiple-choice questions with answers. */
export async function* generateMcqs(
  extractedText: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/mcqs", extractedText, signal);
}

/** Request streamed viva questions with concise expected answers. */
export async function* generateVivaQuestions(
  extractedText: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/viva-questions", extractedText, signal);
}

/** Request a streamed beginner-friendly explanation. */
export async function* explainSimply(
  extractedText: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/explain-simply", extractedText, signal);
}

/** Request streamed flashcards. */
export async function* generateFlashcards(
  extractedText: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/flashcards", extractedText, signal);
}

/** Request a streamed document summary. */
export async function* generateSummary(
  extractedText: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/summary", extractedText, signal);
}

async function* streamGeneration(
  path: string,
  extractedText: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ extracted_text: extractedText }),
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: unknown;
    } | null;
    let errorMessage = "Generation request failed.";
    if (payload && typeof payload === "object" && "detail" in payload) {
      if (typeof payload.detail === "string") {
        errorMessage = payload.detail;
      } else if (Array.isArray(payload.detail)) {
        errorMessage = payload.detail
          .map((d) =>
            typeof d === "object" && d !== null && "msg" in d
              ? d.msg
              : JSON.stringify(d),
          )
          .join(", ");
      } else {
        errorMessage = JSON.stringify(payload.detail);
      }
    }
    throw new Error(errorMessage);
  }
  if (!response.body)
    throw new Error("The generation response did not include a stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const eventType = event.match(/^event: (.+)$/m)?.[1];
      const data = event.match(/^data: (.+)$/m)?.[1];
      if (!eventType || !data) continue;

      try {
        if (eventType === "citations") {
          const parsed = JSON.parse(data);
          const citations: CitationItem[] = Array.isArray(parsed)
            ? parsed
            : (parsed?.citations ?? []);
          yield { type: "citations", citations };
        } else {
          const payload = JSON.parse(data) as { text?: string; message?: string };
          if (eventType === "delta" && payload.text)
            yield { type: "delta", text: payload.text };
          if (eventType === "error")
            yield {
              type: "error",
              message: payload.message ?? "Generation failed.",
            };
          if (eventType === "done") yield { type: "done" };
        }
      } catch {
        yield {
          type: "error",
          message: "Failed to parse generation event data.",
        };
      }
    }
    if (done) break;
  }
}

/** Edit a previous user message and stream the newly regenerated response. */
export async function* editAndRegenerateMessage(
  conversationId: string,
  messageId: string,
  message: string,
  model?: string,
  temperature?: number,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent> {
  const response = await fetch(
    `${apiBaseUrl}/conversations/${conversationId}/edit-message/${messageId}`,
    {
      method: "POST",
      headers: defaultHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message, model, temperature }),
      signal,
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Edit request failed.");
  }
  if (!response.body) throw new Error("The response did not include a stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const eventType = event.match(/^event: (.+)$/m)?.[1];
      const data = event.match(/^data: (.+)$/m)?.[1];
      if (!eventType || !data) continue;

      try {
        if (eventType === "citations") {
          const parsed = JSON.parse(data);
          const citations: CitationItem[] = Array.isArray(parsed)
            ? parsed
            : (parsed?.citations ?? []);
          yield { type: "citations", citations };
        } else {
          const payload = JSON.parse(data) as { text?: string; message?: string };
          if (eventType === "delta" && payload.text)
            yield { type: "delta", text: payload.text };
          if (eventType === "error")
            yield {
              type: "error",
              message: payload.message ?? "Generation failed.",
            };
          if (eventType === "done") yield { type: "done" };
        }
      } catch {
        yield {
          type: "error",
          message: "Failed to parse generation event data.",
        };
      }
    }
    if (done) break;
  }
}

/** Delete a specific message in a conversation. */
export async function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl}/conversations/${conversationId}/messages/${messageId}`,
    {
      method: "DELETE",
      headers: defaultHeaders(),
    },
  );
  if (!response.ok) throw new Error("Failed to delete message.");
}

export type ActivityResponse = {
  id: string;
  type: "document" | "conversation";
  title: string;
  action: string;
  timestamp: string;
};

export type DashboardStatsResponse = {
  total_documents: number;
  total_conversations: number;
  total_ai_generations: number;
  recent_conversations: ConversationResponse[];
  recent_documents: DocumentResponse[];
  recent_activities: ActivityResponse[];
};

/** Fetch workspace overview statistics and recent activities. */
export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  const response = await fetch(`${apiBaseUrl}/dashboard/stats`, {
    headers: defaultHeaders({ "Content-Type": "application/json" }),
  });
  if (!response.ok) throw new Error("Failed to load dashboard statistics.");
  return response.json();
}

export type MessageSearchResponse = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  conversation_title: string;
};

export type SearchResultsResponse = {
  documents: DocumentResponse[];
  conversations: ConversationResponse[];
  messages: MessageSearchResponse[];
};

/** Perform global search across documents, conversations and message content. */
export async function executeGlobalSearch(
  query: string,
): Promise<SearchResultsResponse> {
  const response = await fetch(
    `${apiBaseUrl}/search?q=${encodeURIComponent(query)}`,
    {
      headers: defaultHeaders({ "Content-Type": "application/json" }),
    },
  );
  if (!response.ok) throw new Error("Failed to execute search query.");
  return response.json();
}

/* ─── V2 Notebook and Source API Functions ─────────────────────────────────── */

/** List all notebooks belonging to the current user. */
export async function listNotebooks(): Promise<NotebookSummaryResponse[]> {
  const response = await fetch(`${apiBaseUrl}/notebooks`, {
    headers: defaultHeaders({ "Content-Type": "application/json" }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Failed to load notebooks.");
  }
  return response.json();
}

/** Create a new notebook for the authenticated user. */
export async function createNotebook(
  payload: NotebookCreateRequest,
): Promise<NotebookSummaryResponse> {
  const response = await fetch(`${apiBaseUrl}/notebooks`, {
    method: "POST",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Failed to create notebook.");
  }
  return response.json();
}

/** Retrieve detailed notebook information with sources and conversations. */
export async function getNotebookDetail(
  id: string,
): Promise<NotebookDetailResponse> {
  const response = await fetch(`${apiBaseUrl}/notebooks/${id}`, {
    headers: defaultHeaders({ "Content-Type": "application/json" }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Failed to load notebook details.");
  }
  return response.json();
}

/** Update title and/or description of a notebook. */
export async function updateNotebook(
  id: string,
  payload: NotebookUpdateRequest,
): Promise<NotebookSummaryResponse> {
  const response = await fetch(`${apiBaseUrl}/notebooks/${id}`, {
    method: "PATCH",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Failed to update notebook.");
  }
  return response.json();
}

/** Delete a notebook and all its attached sources and conversations. */
export async function deleteNotebook(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/notebooks/${id}`, {
    method: "DELETE",
    headers: defaultHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Failed to delete notebook.");
  }
}

/** List all sources attached to a notebook. */
export async function listNotebookSources(
  notebookId: string,
): Promise<SourceResponse[]> {
  const response = await fetch(`${apiBaseUrl}/notebooks/${notebookId}/sources`, {
    headers: defaultHeaders({ "Content-Type": "application/json" }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Failed to load sources.");
  }
  return response.json();
}

/** Retrieve individual source details and processing status. */
export async function getSource(sourceId: string): Promise<SourceResponse> {
  const response = await fetch(`${apiBaseUrl}/sources/${sourceId}`, {
    headers: defaultHeaders({ "Content-Type": "application/json" }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Failed to load source.");
  }
  return response.json();
}

/** Delete a source and its physical storage. */
export async function deleteSource(sourceId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/sources/${sourceId}`, {
    method: "DELETE",
    headers: defaultHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Failed to delete source.");
  }
}

/** Upload a source document to a notebook with progress reporting and client-side validation. */
export function uploadNotebookSource(
  notebookId: string,
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<SourceResponse> {
  const validation = validateSourceFile(file);
  if (!validation.valid) {
    return Promise.reject(new Error(validation.error));
  }

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);

    request.open("POST", `${apiBaseUrl}/notebooks/${notebookId}/sources`);
    request.setRequestHeader("X-Session-ID", getAnonymousSessionId());
    const token = getAuthToken();
    if (token) {
      request.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    request.responseType = "json";

    if (onProgress) {
      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.min(95, Math.round((event.loaded / event.total) * 100)));
        }
      });
    }

    request.addEventListener("load", () => {
      const payload = request.response as
        | SourceResponse
        | { detail?: unknown }
        | null;
      if (request.status >= 200 && request.status < 300 && payload) {
        if (onProgress) onProgress(100);
        resolve(payload as SourceResponse);
        return;
      }

      let errorMessage = "Source upload failed.";
      if (payload && typeof payload === "object" && "detail" in payload) {
        if (typeof payload.detail === "string") {
          errorMessage = payload.detail;
        } else if (Array.isArray(payload.detail)) {
          errorMessage = payload.detail
            .map((d) =>
              typeof d === "object" && d !== null && "msg" in d
                ? d.msg
                : JSON.stringify(d),
            )
            .join(", ");
        } else {
          errorMessage = JSON.stringify(payload.detail);
        }
      }

      const error: UploadError = new Error(errorMessage);
      error.status = request.status;
      reject(error);
    });

    request.addEventListener("error", () =>
      reject(new Error("Network error during source upload.")),
    );
    request.send(body);
  });
}

/** Create a new chat conversation inside a notebook. */
export async function createNotebookConversation(
  notebookId: string,
  title?: string,
): Promise<ConversationResponse> {
  const response = await fetch(`${apiBaseUrl}/conversations`, {
    method: "POST",
    headers: defaultHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      notebook_id: notebookId,
      title: title || "New Chat",
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail ?? "Failed to create conversation.");
  }
  return response.json();
}

/** List all conversations attached to a notebook. */
export async function listNotebookConversations(
  notebookId: string,
): Promise<ConversationResponse[]> {
  const response = await fetch(
    `${apiBaseUrl}/notebooks/${notebookId}/conversations`,
    {
      headers: defaultHeaders({ "Content-Type": "application/json" }),
    },
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail ?? "Failed to load notebook conversations.",
    );
  }
  return response.json();
}
