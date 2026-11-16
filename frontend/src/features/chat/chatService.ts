/**
 * Chat Workspace Service (The Academic Monolith)
 *
 * Implements the unified chat-first academic workflow:
 * - Each chat workspace is internally represented by an underlying Notebook entity.
 * - Manages chat creation with shared in-flight promise locking (rapid click debouncing).
 * - Implements graceful 2-phase failure recovery (retaining created notebook if conversation creation fails).
 * - Aggregates recent chats across user notebooks with relative timestamps.
 */

import {
  createNotebook,
  createNotebookConversation,
  listConversations,
  listNotebooks,
  type ConversationResponse,
  type NotebookSummaryResponse,
} from "@/lib/api";

export interface ChatWorkspaceCreationResult {
  notebook: NotebookSummaryResponse;
  conversation: ConversationResponse;
}

export interface RecentChatItem {
  conversationId: string;
  notebookId: string;
  title: string;
  notebookTitle: string;
  updatedAt: string;
  createdAt: string;
  sourceCount?: number;
}

/** Error thrown when notebook creation succeeded but initial conversation failed. */
export class ChatCreationError extends Error {
  notebookId: string;
  stage: "conversation_creation";

  constructor(message: string, notebookId: string) {
    super(message);
    this.name = "ChatCreationError";
    this.notebookId = notebookId;
    this.stage = "conversation_creation";
  }
}

// In-flight promise lock to prevent duplicate creation on rapid clicks
let inFlightCreatePromise: Promise<ChatWorkspaceCreationResult> | null = null;

/**
 * Creates a unified chat workspace.
 * Reuses the existing Notebook entity as the underlying storage and grounding container.
 * Thread-safe: rapid concurrent calls return the single in-flight promise.
 */
export async function createChatWorkspace(
  title?: string,
): Promise<ChatWorkspaceCreationResult> {
  if (inFlightCreatePromise) {
    return inFlightCreatePromise;
  }

  const creationPromise = (async () => {
    const notebookTitle = title?.trim() || "Academic Discussion";

    // Step 1: Create the underlying Course Notebook
    let notebook: NotebookSummaryResponse;
    try {
      notebook = await createNotebook({
        title: notebookTitle,
        description: "Unified chat workspace for course learning and grounded discussions.",
      });
    } catch (err: any) {
      throw new Error(err?.message || "Failed to initialize chat workspace container.");
    }

    // Step 2: Create the initial Conversation inside the Notebook
    let conversation: ConversationResponse;
    try {
      conversation = await createNotebookConversation(
        notebook.id,
        "Main Discussion",
      );
    } catch (err: any) {
      // 2-Phase failure: Preserve notebook so retry can attach conversation without orphan duplicates
      throw new ChatCreationError(
        err?.message || "Notebook created, but failed to start chat conversation. You can retry safely.",
        notebook.id,
      );
    }

    return { notebook, conversation };
  })();

  inFlightCreatePromise = creationPromise;

  try {
    const result = await creationPromise;
    return result;
  } finally {
    inFlightCreatePromise = null;
  }
}

/**
 * Retries creating the initial conversation for an existing notebook
 * without creating a redundant duplicate notebook container.
 */
export async function retryConversationCreation(
  notebookId: string,
  title?: string,
): Promise<ConversationResponse> {
  return createNotebookConversation(
    notebookId,
    title?.trim() || "Main Discussion",
  );
}

/**
 * Fetches recent chat conversations across all user notebooks.
 * Orders by most recent activity timestamp descending.
 */
export async function listRecentChats(): Promise<RecentChatItem[]> {
  const [conversations, notebooks] = await Promise.all([
    listConversations().catch(() => [] as ConversationResponse[]),
    listNotebooks().catch(() => [] as NotebookSummaryResponse[]),
  ]);

  const notebookMap = new Map<string, NotebookSummaryResponse>();
  notebooks.forEach((nb) => notebookMap.set(nb.id, nb));

  const items: RecentChatItem[] = [];

  for (const conv of conversations) {
    // If conversation is linked to a notebook, resolve its details
    if (conv.notebook_id) {
      const nb = notebookMap.get(conv.notebook_id);
      items.push({
        conversationId: conv.id,
        notebookId: conv.notebook_id,
        title: conv.title || "Discussion",
        notebookTitle: nb?.title || "Academic Workspace",
        updatedAt: conv.updated_at || conv.created_at,
        createdAt: conv.created_at,
        sourceCount: nb?.source_count ?? 0,
      });
    }
  }

  // If there are notebooks without conversations yet, also show them as ready chats
  for (const nb of notebooks) {
    const hasConv = items.some((item) => item.notebookId === nb.id);
    if (!hasConv) {
      items.push({
        conversationId: "", // Will create or link on open
        notebookId: nb.id,
        title: nb.title,
        notebookTitle: nb.title,
        updatedAt: nb.updated_at || nb.created_at,
        createdAt: nb.created_at,
        sourceCount: nb.source_count ?? 0,
      });
    }
  }

  // Sort by updatedAt descending
  return items.sort((a, b) => {
    const timeA = new Date(a.updatedAt).getTime();
    const timeB = new Date(b.updatedAt).getTime();
    return timeB - timeA;
  });
}
