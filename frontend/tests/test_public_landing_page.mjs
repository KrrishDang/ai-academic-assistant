import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Phase D: Public Landing Page Design & Brand Integrity", async (t) => {
  const landingPath = path.resolve("src/pages/PublicLandingPage.tsx");
  assert.ok(fs.existsSync(landingPath), "PublicLandingPage.tsx must exist");
  const landingCode = fs.readFileSync(landingPath, "utf-8");

  await t.test("Displays official product name 'AI Academic Assistant'", () => {
    assert.ok(landingCode.includes("AI Academic Assistant"), "Must contain 'AI Academic Assistant'");
    assert.ok(!landingCode.includes("StudyHub"), "Must NOT contain legacy name 'StudyHub'");
  });

  await t.test("Uses official cinematic black (#0B0B0C) and electric lime (#C6F432) visual tokens", () => {
    assert.ok(landingCode.includes("#0B0B0C"), "Must use midnight black #0B0B0C");
    assert.ok(landingCode.includes("#C6F432"), "Must use electric lime #C6F432");
  });

  await t.test("Implements opening countdown and motion sequence with useReducedMotion support", () => {
    assert.ok(landingCode.includes("useReducedMotion"), "Must integrate useReducedMotion for accessibility");
    assert.ok(landingCode.includes("openingCount") || landingCode.includes("openingComplete"), "Must track opening sequence state");
  });

  await t.test("Features interactive hero demonstration with authentic grounded workflow", () => {
    assert.ok(landingCode.includes("Griffiths_Quantum_Mechanics"), "Must showcase realistic document source");
    assert.ok(landingCode.includes("Document-Grounded Response"), "Must distinguish grounded response");
    assert.ok(landingCode.includes("activeStep") && landingCode.includes("setActiveStep"), "Must support interactive step switching");
  });

  await t.test("Exposes clear sign-in and registration pathways", () => {
    assert.ok(landingCode.includes('to="/login"'), "Must provide link to /login");
    assert.ok(landingCode.includes('to="/register"'), "Must provide link to /register");
  });

  await t.test("Showcases Study Studio capabilities (flashcards, exam papers, viva)", () => {
    assert.ok(landingCode.includes("Flashcard") || landingCode.includes("flashcard"), "Must showcase flashcards");
    assert.ok(landingCode.includes("Exam Paper") || landingCode.includes("Exam") || landingCode.includes("10-Mark"), "Must showcase exam paper capability");
    assert.ok(landingCode.includes("Viva") || landingCode.includes("Oral Defense"), "Must showcase viva/defense capability");
  });
});

test("Phase D: Routing & Public Entry Integration", async (t) => {
  const appPath = path.resolve("src/app/App.tsx");
  const appCode = fs.readFileSync(appPath, "utf-8");

  const dashboardPath = path.resolve("src/pages/DashboardPage.tsx");
  const dashboardCode = fs.readFileSync(dashboardPath, "utf-8");

  const appShellPath = path.resolve("src/components/layout/AppShell.tsx");
  const appShellCode = fs.readFileSync(appShellPath, "utf-8");

  await t.test("App.tsx registers public landing routes (/landing, /welcome)", () => {
    assert.ok(appCode.includes("/landing"), "App.tsx must register /landing");
    assert.ok(appCode.includes("/welcome"), "App.tsx must register /welcome");
  });

  await t.test("DashboardPage renders PublicLandingPage when unauthenticated", () => {
    assert.ok(dashboardCode.includes("PublicLandingPage"), "DashboardPage must import PublicLandingPage");
    assert.ok(dashboardCode.includes("!isAuthenticated"), "DashboardPage must check !isAuthenticated");
  });

  await t.test("AppShell bypasses application sidebar on public landing page", () => {
    assert.ok(appShellCode.includes("isPublicLanding"), "AppShell must detect public landing mode");
    assert.ok(appShellCode.includes("!isAuthenticated"), "AppShell must check authentication state");
  });
});
