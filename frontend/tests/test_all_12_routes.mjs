import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Route Verification: Complete 12-Route Audit for StudyHub V2", async (t) => {
  const appPath = path.resolve("src/app/App.tsx");
  const appCode = fs.readFileSync(appPath, "utf-8");

  const requiredRoutes = [
    { path: "/login", isProtected: false, expectedComponent: "LoginPage" },
    { path: "/register", isProtected: false, expectedComponent: "RegisterPage" },
    { path: "/", isProtected: false, expectedComponent: "DashboardPage" },
    { path: "/notebooks", isProtected: true, expectedComponent: "NotebookDashboardPage" },
    { path: "/notebooks/:id", isProtected: true, expectedComponent: "NotebookWorkspacePage" },
    { path: "/documents", isProtected: false, expectedComponent: "UploadPage" },
    { path: "/upload", isProtected: false, expectedComponent: "UploadPage" },
    { path: "/chat", isProtected: false, expectedComponent: "WorkspacePage" },
    { path: "/workspace", isProtected: false, expectedComponent: "WorkspacePage" },
    { path: "/tools", isProtected: false, expectedComponent: "AIToolsPage" },
    { path: "/settings", isProtected: false, expectedComponent: "SettingsPage" },
    { path: "/404", isProtected: false, expectedComponent: "NotFoundPage" },
  ];

  for (const r of requiredRoutes) {
    await t.test(`Route ${r.path} is registered and maps to <${r.expectedComponent} />`, () => {
      // Test route exists in App.tsx
      const routeRegex = new RegExp(`path=["']${r.path.replace(":", "\\:")}["']`);
      assert.ok(routeRegex.test(appCode), `Route ${r.path} must be declared in App.tsx`);

      // Test component import exists
      const importRegex = new RegExp(`import\\s*\\{[^}]*\\b${r.expectedComponent}\\b[^}]*\\}\\s*from`);
      assert.ok(importRegex.test(appCode), `Component ${r.expectedComponent} must be imported in App.tsx`);

      // Check protection logic
      if (r.isProtected) {
        // Regex checking ProtectedRoute wrapper
        const protectedRegex = new RegExp(`<ProtectedRoute>[\\s\\S]*?<${r.expectedComponent}[\\s\\S]*?</ProtectedRoute>`);
        assert.ok(protectedRegex.test(appCode), `Route ${r.path} must be wrapped in <ProtectedRoute>`);
      }
    });
  }

  await t.test("Catch-all wildcard route redirects cleanly to /404", () => {
    const wildcardRegex = /path=["']\*["']\s+element=\{<Navigate to=["']\/404["'] replace \/>\}/;
    assert.ok(wildcardRegex.test(appCode), "Wildcard '*' must redirect to /404");
  });
});
