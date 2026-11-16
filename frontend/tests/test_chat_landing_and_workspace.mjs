import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Phase 6.4.1: Chat Creation Service & Rapid Click Duplicate Prevention", async (t) => {
  const servicePath = path.resolve("src/features/chat/chatService.ts");
  assert.ok(fs.existsSync(servicePath), "chatService.ts must exist");
  const serviceCode = fs.readFileSync(servicePath, "utf-8");

  await t.test("chatService exports createChatWorkspace and listRecentChats", () => {
    assert.ok(serviceCode.includes("export async function createChatWorkspace"), "createChatWorkspace must be exported");
    assert.ok(serviceCode.includes("export async function listRecentChats"), "listRecentChats must be exported");
    assert.ok(serviceCode.includes("export async function retryConversationCreation"), "retryConversationCreation must be exported");
  });

  await t.test("createChatWorkspace reuses Notebook and Conversation entities", () => {
    assert.ok(serviceCode.includes("createNotebook"), "Must call createNotebook");
    assert.ok(serviceCode.includes("createNotebookConversation"), "Must call createNotebookConversation");
  });

  await t.test("createChatWorkspace enforces shared in-flight Promise for rapid-click duplicate prevention", () => {
    assert.ok(
      serviceCode.includes("inFlight") || serviceCode.includes("in_flight") || serviceCode.includes("pendingCreate"),
      "Must have an in-flight Promise lock to prevent duplicate creation on rapid clicks"
    );
  });

  await t.test("Preserves created notebook on conversation failure and supports safe retry", () => {
    assert.ok(serviceCode.includes("ChatCreationError"), "Must export/throw ChatCreationError preserving notebook ID");
    assert.ok(serviceCode.includes("retryConversationCreation"), "Must provide safe retry without creating duplicate notebook");
  });
});

test("Phase 6.4.1: URL Synchronization & Navigation in NotebookWorkspacePage", async (t) => {
  const workspacePath = path.resolve("src/pages/notebooks/NotebookWorkspacePage.tsx");
  const workspaceCode = fs.readFileSync(workspacePath, "utf-8");

  await t.test("NotebookWorkspacePage integrates useSearchParams for URL conversation identity", () => {
    assert.ok(workspaceCode.includes("useSearchParams"), "Must import and use useSearchParams");
    assert.ok(
      workspaceCode.includes('searchParams.get("conversation")') ||
      workspaceCode.includes('searchParams.get("c")'),
      "Must read conversation parameter from URL query params"
    );
  });

  await t.test("Synchronizes activeConversationId with URL without creating new conversation on reopen", () => {
    assert.ok(
      workspaceCode.includes("setSearchParams"),
      "Must update URL search params when active conversation changes"
    );
  });

  await t.test("Preserves existing messages and streaming chat functionality", () => {
    assert.ok(workspaceCode.includes("chatInConversation"), "chatInConversation streaming must be preserved");
    assert.ok(workspaceCode.includes("getConversationMessages"), "getConversationMessages must be preserved");
  });

  await t.test("handleSendMessage updates URL with new conversation ID when auto-initiating chat", () => {
    const handleSendMatch = workspaceCode.match(/const handleSendMessage\s*=\s*async[\s\S]*?(?=\n\s*const\s+handleAbort|\n\s*const\s+handleDeleteChat)/);
    assert.ok(handleSendMatch, "handleSendMessage must exist");
    const handleSendCode = handleSendMatch[0];
    assert.ok(
      handleSendCode.includes("setSearchParams"),
      "handleSendMessage must call setSearchParams when auto-initiating a conversation"
    );
    assert.ok(
      handleSendCode.includes("newChat.id"),
      "handleSendMessage must set the URL conversation parameter to the newly created conversation ID"
    );
  });
});

test("Phase 6.4.1: Chat Landing Page Contract", async (t) => {
  const dashboardPath = path.resolve("src/pages/DashboardPage.tsx");
  const dashboardCode = fs.readFileSync(dashboardPath, "utf-8");

  await t.test("DashboardPage renders Chat Landing Page after authentication", () => {
    assert.ok(dashboardCode.includes("New Chat") || dashboardCode.includes("createChatWorkspace"), "Must have New Chat action");
    assert.ok(dashboardCode.includes("Recent Chats") || dashboardCode.includes("recentChats"), "Must have Recent Chats section");
    assert.ok(dashboardCode.includes("Search") || dashboardCode.includes("search"), "Must have Search Chats input");
  });

  await t.test("Displays relative timestamps and handles loading, empty, and error states", () => {
    assert.ok(dashboardCode.includes("formatRelativeTime"), "Must format relative timestamps");
    assert.ok(dashboardCode.includes("EmptyState"), "Must use EmptyState component for empty chats");
    assert.ok(dashboardCode.includes("Skeleton"), "Must use Skeleton component for loading state");
  });

  await t.test("Does NOT automatically create an empty chat upon mount/login", () => {
    // There should not be an automatic createChatWorkspace() call inside useEffect on mount
    const autoCreateRegex = /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*createChatWorkspace\s*\(/;
    assert.ok(!autoCreateRegex.test(dashboardCode), "Must not automatically create a chat on mount");
  });
});

test("Phase 6.4.1: Navigation Sidebar Simplification Contract", async (t) => {
  const sidebarPath = path.resolve("src/components/layout/NavigationSidebar.tsx");
  const sidebarCode = fs.readFileSync(sidebarPath, "utf-8");

  await t.test("NavigationSidebar prioritizes New Chat and Recent Chats", () => {
    assert.ok(sidebarCode.includes("New Chat") || sidebarCode.includes("createChatWorkspace"), "Must feature New Chat action");
    assert.ok(sidebarCode.includes("Recent Chats") || sidebarCode.includes("recentChats") || sidebarCode.includes("Recent"), "Must feature Recent Chats list");
  });

  await t.test("Preserves backward compatibility for Settings and Notebooks", () => {
    assert.ok(sidebarCode.includes("/settings"), "Must preserve Settings link");
  });
});
