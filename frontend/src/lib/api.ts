const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export { apiBaseUrl };

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
};

export type GenerationEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

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
    request.responseType = "json";

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(95, Math.round((event.loaded / event.total) * 100)));
      }
    });
    request.addEventListener("load", () => {
      const payload = request.response as ProcessedPdf | { detail?: unknown } | null;
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
            .map((d) => (typeof d === "object" && d !== null && "msg" in d ? d.msg : JSON.stringify(d)))
            .join(", ");
        } else {
          errorMessage = JSON.stringify(payload.detail);
        }
      }

      const error: UploadError = new Error(errorMessage);
      error.status = request.status;
      reject(error);
    });
    request.addEventListener("error", () => reject(new Error("Network error during upload.")));
    request.send(body);
  });
}

/** Retrieve all persistent documents. */
export async function listDocuments(): Promise<DocumentResponse[]> {
  const response = await fetch(`${apiBaseUrl}/documents`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch documents.");
  }

  return response.json();
}

/** Rename a document original filename. */
export async function renameDocument(id: string, filename: string): Promise<DocumentResponse> {
  const response = await fetch(`${apiBaseUrl}/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
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
    request.responseType = "json";

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(95, Math.round((event.loaded / event.total) * 100)));
      }
    });
    request.addEventListener("load", () => {
      const payload = request.response as DocumentResponse | { detail?: unknown } | null;
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
            .map((d) => (typeof d === "object" && d !== null && "msg" in d ? d.msg : JSON.stringify(d)))
            .join(", ");
        } else {
          errorMessage = JSON.stringify(payload.detail);
        }
      }

      const error: UploadError = new Error(errorMessage);
      error.status = request.status;
      reject(error);
    });
    request.addEventListener("error", () => reject(new Error("Network error during document replacement.")));
    request.send(body);
  });
}

/** Fetch list of conversations. */
export async function listConversations(): Promise<ConversationResponse[]> {
  const response = await fetch(`${apiBaseUrl}/conversations`, {
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, title }),
  });
  if (!response.ok) throw new Error("Failed to create conversation.");
  return response.json();
}

/** Rename an existing conversation's title. */
export async function renameConversation(id: string, title: string): Promise<ConversationResponse> {
  const response = await fetch(`${apiBaseUrl}/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error("Failed to rename conversation.");
  return response.json();
}

/** Delete a conversation. */
export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/conversations/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete conversation.");
}

/** Get all messages in a conversation. */
export async function getConversationMessages(id: string): Promise<MessageResponse[]> {
  const response = await fetch(`${apiBaseUrl}/conversations/${id}/messages`, {
    headers: { "Content-Type": "application/json" },
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
  signal?: AbortSignal
): AsyncGenerator<GenerationEvent> {
  const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, model, temperature }),
    signal,
  });

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
        const payload = JSON.parse(data) as { text?: string; message?: string };
        if (eventType === "delta" && payload.text) yield { type: "delta", text: payload.text };
        if (eventType === "error") yield { type: "error", message: payload.message ?? "Generation failed." };
        if (eventType === "done") yield { type: "done" };
      } catch {
        yield { type: "error", message: "Failed to parse generation event data." };
      }
    }
    if (done) break;
  }
}

/** Request study material and yield the server-sent response as it arrives. */
export async function* generateNotes(extractedText: string, signal?: AbortSignal): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/notes", extractedText, signal);
}

/** Request a streamed answer suitable for a five-mark exam question. */
export async function* generateFiveMarkAnswer(extractedText: string, signal?: AbortSignal): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/5-mark-answer", extractedText, signal);
}

/** Request a streamed answer suitable for a ten-mark exam question. */
export async function* generateTenMarkAnswer(extractedText: string, signal?: AbortSignal): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/10-mark-answer", extractedText, signal);
}

/** Request streamed multiple-choice questions with answers. */
export async function* generateMcqs(extractedText: string, signal?: AbortSignal): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/mcqs", extractedText, signal);
}

/** Request streamed viva questions with concise expected answers. */
export async function* generateVivaQuestions(extractedText: string, signal?: AbortSignal): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/viva-questions", extractedText, signal);
}

/** Request a streamed beginner-friendly explanation. */
export async function* explainSimply(extractedText: string, signal?: AbortSignal): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/explain-simply", extractedText, signal);
}

/** Request streamed flashcards. */
export async function* generateFlashcards(extractedText: string, signal?: AbortSignal): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/flashcards", extractedText, signal);
}

/** Request a streamed document summary. */
export async function* generateSummary(extractedText: string, signal?: AbortSignal): AsyncGenerator<GenerationEvent> {
  yield* streamGeneration("/generate/summary", extractedText, signal);
}

async function* streamGeneration(path: string, extractedText: string, signal?: AbortSignal): AsyncGenerator<GenerationEvent> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extracted_text: extractedText }),
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    let errorMessage = "Generation request failed.";
    if (payload && typeof payload === "object" && "detail" in payload) {
      if (typeof payload.detail === "string") {
        errorMessage = payload.detail;
      } else if (Array.isArray(payload.detail)) {
        errorMessage = payload.detail
          .map((d) => (typeof d === "object" && d !== null && "msg" in d ? d.msg : JSON.stringify(d)))
          .join(", ");
      } else {
        errorMessage = JSON.stringify(payload.detail);
      }
    }
    throw new Error(errorMessage);
  }
  if (!response.body) throw new Error("The generation response did not include a stream.");

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
        const payload = JSON.parse(data) as { text?: string; message?: string };
        if (eventType === "delta" && payload.text) yield { type: "delta", text: payload.text };
        if (eventType === "error") yield { type: "error", message: payload.message ?? "Generation failed." };
        if (eventType === "done") yield { type: "done" };
      } catch {
        yield { type: "error", message: "Failed to parse generation event data." };
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
  const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}/edit-message/${messageId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, model, temperature }),
    signal,
  });

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
        const payload = JSON.parse(data) as { text?: string; message?: string };
        if (eventType === "delta" && payload.text) yield { type: "delta", text: payload.text };
        if (eventType === "error") yield { type: "error", message: payload.message ?? "Generation failed." };
        if (eventType === "done") yield { type: "done" };
      } catch {
        yield { type: "error", message: "Failed to parse generation event data." };
      }
    }
    if (done) break;
  }
}

/** Delete a specific message in a conversation. */
export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE",
  });
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
    headers: { "Content-Type": "application/json" },
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
export async function executeGlobalSearch(query: string): Promise<SearchResultsResponse> {
  const response = await fetch(`${apiBaseUrl}/search?q=${encodeURIComponent(query)}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to execute search query.");
  return response.json();
}
