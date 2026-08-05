import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { 
  type ConversationResponse, 
  type MessageResponse, 
  listConversations, 
  createConversation, 
  renameConversation, 
  deleteConversation, 
  getConversationMessages, 
  chatInConversation,
  editAndRegenerateMessage
} from "@/lib/api";
import { saveChatHistory, getChatHistory } from "@/lib/db";

type ConversationContextType = {
  conversations: ConversationResponse[];
  activeConversation: ConversationResponse | null;
  messages: MessageResponse[];
  loading: boolean;
  messagesLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  createNewConversation: (documentId: string | null, title?: string) => Promise<ConversationResponse>;
  renameConv: (id: string, title: string) => Promise<void>;
  deleteConv: (id: string) => Promise<void>;
  selectConversation: (conv: ConversationResponse) => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  editChatMessage: (messageId: string, newContent: string) => Promise<void>;
  cancelChatMessage: () => void;
  clearActiveConversation: () => void;
};

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationResponse | null>(() => {
    // Restore from sessionStorage if available
    try {
      const stored = sessionStorage.getItem("activeConversation");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const convs = await listConversations();
      setConversations(convs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load conversations automatically on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Restore messages from cache when activeConversation is restored from sessionStorage
  useEffect(() => {
    if (activeConversation && messages.length === 0 && !messagesLoading && !isRestoring) {
      setIsRestoring(true);
      (async () => {
        setMessagesLoading(true);
        try {
          // Try local cache first for instant render
          if (activeConversation.document_id) {
            const cached = await getChatHistory(activeConversation.document_id);
            if (cached && cached.length > 0) {
              setMessages(cached);
            }
          }
          // Then try API
          const msgs = await getConversationMessages(activeConversation.id);
          setMessages(msgs);
          if (activeConversation.document_id) {
            await saveChatHistory(activeConversation.document_id, msgs);
          }
        } catch {
          // Keep cached messages if API fails
        } finally {
          setMessagesLoading(false);
          setIsRestoring(false);
        }
      })();
    }
  }, [activeConversation?.id]); // Only run when conversation ID changes

  const createNewConversation = async (documentId: string | null, title?: string) => {
    setError(null);
    try {
      const newConv = await createConversation(documentId, title);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversation(newConv);
      sessionStorage.setItem("activeConversation", JSON.stringify(newConv));
      setMessages([]);
      return newConv;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create conversation.");
      throw err;
    }
  };

  const renameConv = async (id: string, title: string) => {
    try {
      const updated = await renameConversation(id, title);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (activeConversation?.id === id) {
        setActiveConversation(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename conversation.");
      throw err;
    }
  };

  const deleteConv = async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete conversation.");
      throw err;
    }
  };

  const selectConversation = async (conv: ConversationResponse) => {
    setActiveConversation(conv);
    sessionStorage.setItem("activeConversation", JSON.stringify(conv));
    setMessagesLoading(true);
    setError(null);
    try {
      // 1. Load from IndexedDB first for instant rendering
      if (conv.document_id) {
        const cached = await getChatHistory(conv.document_id);
        if (cached && cached.length > 0) {
          setMessages(cached);
          setMessagesLoading(false); // turn off loading spinner early
        }
      }

      const msgs = await getConversationMessages(conv.id);
      setMessages(msgs);

      // 2. Cache in IndexedDB
      if (conv.document_id) {
        await saveChatHistory(conv.document_id, msgs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      setMessagesLoading(false);
    }
  };

  const cancelChatMessage = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  const sendChatMessage = async (messageText: string) => {
    if (!activeConversation) return;

    // Create abort controller for streaming chat cancellation
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsGenerating(true);
    setError(null);

    // 1. Instantly append user message to local state
    const userMsg: MessageResponse = {
      id: Math.random().toString(),
      conversation_id: activeConversation.id,
      role: "user",
      content: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // 2. Append a temporary assistant message that will receive stream chunks
    const assistantMsgId = Math.random().toString();
    const assistantMsgPlaceholder: MessageResponse = {
      id: assistantMsgId,
      conversation_id: activeConversation.id,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsgPlaceholder]);

    const modelSetting = localStorage.getItem("settings_model") || undefined;
    const tempSettingStr = localStorage.getItem("settings_temperature");
    const tempSetting = tempSettingStr ? parseFloat(tempSettingStr) : undefined;

    let fullAiResponse = "";
    try {
      const generator = chatInConversation(
        activeConversation.id, 
        messageText, 
        modelSetting, 
        tempSetting, 
        controller.signal
      );
      for await (const event of generator) {
        if (event.type === "delta") {
          fullAiResponse += event.text;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: fullAiResponse }
                : msg
            )
          );
        } else if (event.type === "error") {
          setError(event.message);
        }
      }

      // After generation is completed, reload the actual message records from DB to sync the IDs
      const syncedMsgs = await getConversationMessages(activeConversation.id);
      setMessages(syncedMsgs);

      if (activeConversation.document_id) {
        await saveChatHistory(activeConversation.document_id, syncedMsgs);
      }

      // Move conversation to top of list as it was updated
      fetchConversations();
    } catch (err) {
      const error = err as Error;
      if (error.name === "AbortError" || error.message?.includes("aborted")) {
        setError("Generation cancelled by user.");
        // Filter out the empty assistant message placeholder if it was aborted
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMsgId));
      } else {
        setError(error.message ?? "Failed to generate response.");
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const editChatMessage = async (messageId: string, newContent: string) => {
    if (!activeConversation) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsGenerating(true);
    setError(null);

    const targetIndex = messages.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) {
      setIsGenerating(false);
      return;
    }

    const updatedMessages = messages.slice(0, targetIndex + 1);
    updatedMessages[targetIndex] = {
      ...updatedMessages[targetIndex],
      content: newContent,
    };

    const assistantMsgId = Math.random().toString();
    const assistantMsgPlaceholder: MessageResponse = {
      id: assistantMsgId,
      conversation_id: activeConversation.id,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };

    setMessages([...updatedMessages, assistantMsgPlaceholder]);

    const modelSetting = localStorage.getItem("settings_model") || undefined;
    const tempSettingStr = localStorage.getItem("settings_temperature");
    const tempSetting = tempSettingStr ? parseFloat(tempSettingStr) : undefined;

    let fullAiResponse = "";
    try {
      const generator = editAndRegenerateMessage(
        activeConversation.id,
        messageId,
        newContent,
        modelSetting,
        tempSetting,
        controller.signal
      );

      for await (const event of generator) {
        if (event.type === "delta") {
          fullAiResponse += event.text;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: fullAiResponse }
                : msg
            )
          );
        } else if (event.type === "error") {
          setError(event.message);
        }
      }

      const syncedMsgs = await getConversationMessages(activeConversation.id);
      setMessages(syncedMsgs);

      if (activeConversation.document_id) {
        await saveChatHistory(activeConversation.document_id, syncedMsgs);
      }

      fetchConversations();
    } catch (err) {
      const error = err as Error;
      if (error.name === "AbortError" || error.message?.includes("aborted")) {
        setError("Generation cancelled by user.");
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMsgId));
      } else {
        setError(error.message ?? "Failed to generate response.");
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const clearActiveConversation = useCallback(() => {
    setActiveConversation(null);
    sessionStorage.removeItem("activeConversation");
    setMessages([]);
  }, []);

  return (
    <div style={{ display: "contents" }}>
      <ConversationContext.Provider
        value={{
          conversations,
          activeConversation,
          messages,
          loading,
          messagesLoading,
          isGenerating,
          error,
          fetchConversations,
          createNewConversation,
          renameConv,
          deleteConv,
          selectConversation,
          sendChatMessage,
          editChatMessage,
          cancelChatMessage,
          clearActiveConversation,
        }}
      >
        {children}
      </ConversationContext.Provider>
    </div>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversations must be used within a ConversationProvider");
  }
  return context;
}
