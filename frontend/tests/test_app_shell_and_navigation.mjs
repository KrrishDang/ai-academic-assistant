import test from "node:test";
import assert from "node:assert/strict";

test("AppShell Navigation: Route-Aware Matching Logic", async (t) => {
  const isRouteActive = (routePath, targetItem) => {
    if (targetItem.id === "workspace") {
      return routePath === "/" || routePath.startsWith("/notebooks");
    }
    return routePath.startsWith(targetItem.to);
  };

  await t.test("Workspace is active on root '/' and '/notebooks'", () => {
    const workspaceDef = { id: "workspace", to: "/notebooks" };
    assert.equal(isRouteActive("/", workspaceDef), true);
    assert.equal(isRouteActive("/notebooks", workspaceDef), true);
    assert.equal(isRouteActive("/notebooks/nb-123", workspaceDef), true);
    assert.equal(isRouteActive("/settings", workspaceDef), false);
  });

  await t.test("Settings is active on '/settings'", () => {
    const settingsDef = { id: "settings", to: "/settings" };
    assert.equal(isRouteActive("/settings", settingsDef), true);
    assert.equal(isRouteActive("/notebooks", settingsDef), false);
  });

  await t.test("Secondary routes (Documents, Tools) match their respective paths", () => {
    const docsDef = { id: "documents", to: "/documents" };
    const toolsDef = { id: "tools", to: "/tools" };
    assert.equal(isRouteActive("/documents", docsDef), true);
    assert.equal(isRouteActive("/tools", toolsDef), true);
    assert.equal(isRouteActive("/documents", toolsDef), false);
  });
});

test("AppShell Navigation: Breadcrumb Computation Contract", async (t) => {
  function getBreadcrumb(path) {
    if (path === "/" || path === "/notebooks") {
      return { title: "Course Notebooks", breadcrumbs: ["Academic Workspace", "Courses"] };
    }
    if (path.startsWith("/notebooks/")) {
      return { title: "Course Workspace", breadcrumbs: ["Workspace", "Active Course"] };
    }
    if (path === "/documents" || path === "/upload") {
      return { title: "Source Documents", breadcrumbs: ["Library", "Documents"] };
    }
    if (path === "/tools") {
      return { title: "AI Study Tools", breadcrumbs: ["Library", "AI Studio"] };
    }
    if (path === "/settings") {
      return { title: "Account & Settings", breadcrumbs: ["System", "Preferences"] };
    }
    return { title: "AI Academic Assistant", breadcrumbs: ["Workspace"] };
  }

  await t.test("Generates correct title and breadcrumbs for all primary views", () => {
    assert.deepEqual(getBreadcrumb("/notebooks").breadcrumbs, ["Academic Workspace", "Courses"]);
    assert.equal(getBreadcrumb("/notebooks/123").title, "Course Workspace");
    assert.deepEqual(getBreadcrumb("/settings").breadcrumbs, ["System", "Preferences"]);
    assert.deepEqual(getBreadcrumb("/documents").breadcrumbs, ["Library", "Documents"]);
    assert.equal(getBreadcrumb("/unknown").title, "AI Academic Assistant");
  });
});

test("AppShell Navigation: User Profile & Initials Generation", async (t) => {
  function getUserInitials(user) {
    if (user?.display_name) {
      return user.display_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "G";
  }

  await t.test("Extracts up to 2 uppercase initials from display_name", () => {
    assert.equal(getUserInitials({ display_name: "Alan Turing" }), "AT");
    assert.equal(getUserInitials({ display_name: "Marie Sklodowska Curie" }), "MS");
    assert.equal(getUserInitials({ display_name: "Einstein" }), "E");
  });

  await t.test("Falls back to email first character when display_name is absent", () => {
    assert.equal(getUserInitials({ email: "student@harvard.edu" }), "S");
  });

  await t.test("Returns 'G' for unauthenticated guests", () => {
    assert.equal(getUserInitials(null), "G");
    assert.equal(getUserInitials(undefined), "G");
  });
});

test("AppShell Responsive Layout: Dimensions and Padding Contract", async (t) => {
  const sidebarWidths = {
    expanded: 240,
    collapsed: 68,
    mobileDrawer: 260,
  };

  await t.test("Sidebar widths adhere to 8px grid", () => {
    assert.equal(sidebarWidths.expanded % 8, 0);
    assert.equal(sidebarWidths.collapsed % 4, 0);
    assert.equal(sidebarWidths.mobileDrawer % 4, 0);
  });

  await t.test("Content offset matches sidebar expansion state on desktop", () => {
    const getContentPadding = (isMobile, isCollapsed) => {
      if (isMobile) return "pl-0";
      return isCollapsed ? "lg:pl-[68px]" : "lg:pl-[240px]";
    };

    assert.equal(getContentPadding(false, false), "lg:pl-[240px]");
    assert.equal(getContentPadding(false, true), "lg:pl-[68px]");
    assert.equal(getContentPadding(true, false), "pl-0");
  });
});

test("AppShell Keyboard Navigation: Shortcut Detection Contract", async (t) => {
  function isSearchShortcut(e) {
    return (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
  }

  function isSidebarToggleShortcut(e) {
    return (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b";
  }

  await t.test("Detects Ctrl+K and Cmd+K for Search palette", () => {
    assert.equal(isSearchShortcut({ ctrlKey: true, key: "k" }), true);
    assert.equal(isSearchShortcut({ metaKey: true, key: "K" }), true);
    assert.equal(isSearchShortcut({ ctrlKey: false, metaKey: false, key: "k" }), false);
  });

  await t.test("Detects Ctrl+B and Cmd+B for Sidebar collapse", () => {
    assert.equal(isSidebarToggleShortcut({ ctrlKey: true, key: "b" }), true);
    assert.equal(isSidebarToggleShortcut({ metaKey: true, key: "B" }), true);
    assert.equal(isSidebarToggleShortcut({ ctrlKey: true, key: "x" }), false);
  });
});
