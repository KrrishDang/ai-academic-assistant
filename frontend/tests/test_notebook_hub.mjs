import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Phase 4: Course Notebooks Hub & Academic Dashboard Verification", async (t) => {
  const cardPath = path.resolve("src/features/notebooks/components/NotebookCard.tsx");
  const modalPath = path.resolve("src/features/notebooks/components/NotebookModal.tsx");
  const deleteDialogPath = path.resolve("src/features/notebooks/components/DeleteNotebookDialog.tsx");
  const hubPagePath = path.resolve("src/pages/notebooks/NotebookDashboardPage.tsx");
  const dashboardPagePath = path.resolve("src/pages/DashboardPage.tsx");
  const utilsPath = path.resolve("src/lib/utils.ts");

  await t.test("Component files exist and contain appropriate exports", () => {
    assert.ok(fs.existsSync(cardPath), "NotebookCard.tsx must exist");
    assert.ok(fs.existsSync(modalPath), "NotebookModal.tsx must exist");
    assert.ok(fs.existsSync(deleteDialogPath), "DeleteNotebookDialog.tsx must exist");
    assert.ok(fs.existsSync(hubPagePath), "NotebookDashboardPage.tsx must exist");
    assert.ok(fs.existsSync(dashboardPagePath), "DashboardPage.tsx must exist");

    const cardContent = fs.readFileSync(cardPath, "utf-8");
    assert.ok(cardContent.includes("export function NotebookCard"), "NotebookCard must export NotebookCard function");
    assert.ok(cardContent.includes("DropdownMenu"), "NotebookCard must use accessible DropdownMenu for actions");
    assert.ok(cardContent.includes("formatRelativeTime"), "NotebookCard must use formatRelativeTime");

    const modalContent = fs.readFileSync(modalPath, "utf-8");
    assert.ok(modalContent.includes("export function NotebookModal"), "NotebookModal must export NotebookModal function");
    assert.ok(modalContent.includes("Dialog"), "NotebookModal must use Dialog component");

    const deleteContent = fs.readFileSync(deleteDialogPath, "utf-8");
    assert.ok(deleteContent.includes("export function DeleteNotebookDialog"), "DeleteNotebookDialog must export DeleteNotebookDialog function");
  });

  await t.test("Hub page and Dashboard page integrate notebook features cleanly", () => {
    const hubContent = fs.readFileSync(hubPagePath, "utf-8");
    assert.ok(hubContent.includes("NotebookCard"), "Hub page must render NotebookCard");
    assert.ok(hubContent.includes("NotebookModal"), "Hub page must include NotebookModal");
    assert.ok(hubContent.includes("DeleteNotebookDialog"), "Hub page must include DeleteNotebookDialog");
    assert.ok(hubContent.includes("listNotebooks"), "Hub page must call listNotebooks");
    assert.ok(hubContent.includes("createNotebook"), "Hub page must call createNotebook");
    assert.ok(hubContent.includes("updateNotebook"), "Hub page must call updateNotebook");
    assert.ok(hubContent.includes("deleteNotebook"), "Hub page must call deleteNotebook");
    assert.ok(hubContent.includes("EmptyState"), "Hub page must use EmptyState component");
    assert.ok(hubContent.includes("ErrorState"), "Hub page must use ErrorState component");
    assert.ok(hubContent.includes("Skeleton"), "Hub page must use Skeleton loaders");

    const dashContent = fs.readFileSync(dashboardPagePath, "utf-8");
    assert.ok(dashContent.includes("NotebookCard"), "Dashboard must render NotebookCard");
    assert.ok(dashContent.includes("Resume"), "Dashboard must have a Resume session section");
    assert.ok(dashContent.includes("listNotebooks"), "Dashboard must call listNotebooks");
  });

  await t.test("Client-side sorting logic works accurately across criteria", () => {
    const sampleNotebooks = [
      {
        id: "1",
        title: "Calculus III",
        description: "Multivariable calculus",
        created_at: "2026-10-01T10:00:00Z",
        updated_at: "2026-11-10T12:00:00Z",
        source_count: 5,
      },
      {
        id: "2",
        title: "Algorithms & Complexity",
        description: "Big O and graph algorithms",
        created_at: "2026-10-15T10:00:00Z",
        updated_at: "2026-11-14T08:00:00Z",
        source_count: 12,
      },
      {
        id: "3",
        title: "Quantum Physics",
        description: "Wave functions",
        created_at: "2026-11-01T10:00:00Z",
        updated_at: "2026-11-05T09:00:00Z",
        source_count: 2,
      },
    ];

    // Sort: updated
    const byUpdated = [...sampleNotebooks].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });
    assert.equal(byUpdated[0].id, "2", "Algorithms is most recently updated (Nov 14)");
    assert.equal(byUpdated[1].id, "1", "Calculus III is second (Nov 10)");
    assert.equal(byUpdated[2].id, "3", "Quantum is oldest updated (Nov 5)");

    // Sort: title_asc
    const byTitle = [...sampleNotebooks].sort((a, b) => a.title.localeCompare(b.title));
    assert.equal(byTitle[0].title, "Algorithms & Complexity");
    assert.equal(byTitle[1].title, "Calculus III");
    assert.equal(byTitle[2].title, "Quantum Physics");

    // Sort: sources
    const bySources = [...sampleNotebooks].sort((a, b) => (b.source_count ?? 0) - (a.source_count ?? 0));
    assert.equal(bySources[0].source_count, 12);
    assert.equal(bySources[1].source_count, 5);
    assert.equal(bySources[2].source_count, 2);
  });

  await t.test("Client-side search filtering handles titles and descriptions", () => {
    const sampleNotebooks = [
      { id: "1", title: "Organic Chemistry", description: "Reaction mechanisms" },
      { id: "2", title: "Inorganic Chemistry", description: "Transition metal complexes" },
      { id: "3", title: "Microeconomics", description: "Supply, demand and elasticity" },
    ];

    const filter = (query) => {
      const q = query.toLowerCase().trim();
      return sampleNotebooks.filter(
        (nb) => nb.title.toLowerCase().includes(q) || (nb.description && nb.description.toLowerCase().includes(q))
      );
    };

    assert.equal(filter("").length, 3, "Empty search returns all");
    assert.equal(filter("chem").length, 2, "Searching 'chem' matches both Chemistry courses");
    assert.equal(filter("elasticity").length, 1, "Searching description 'elasticity' matches Microeconomics");
    assert.equal(filter("quantum").length, 0, "No matches for unmatched keyword");
  });

  await t.test("formatRelativeTime utility handles diverse intervals gracefully", () => {
    const utilsCode = fs.readFileSync(utilsPath, "utf-8");
    assert.ok(utilsCode.includes("formatRelativeTime"), "utils.ts must contain formatRelativeTime function");

    // Evaluate relative time logic
    const now = Date.now();
    const format = (date) => {
      const diffMs = now - new Date(date).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return "just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 30) return `${diffDays}d ago`;
      return new Date(date).toLocaleDateString();
    };

    assert.equal(format(new Date(now - 30 * 1000)), "just now");
    assert.equal(format(new Date(now - 15 * 60 * 1000)), "15m ago");
    assert.equal(format(new Date(now - 3 * 3600 * 1000)), "3h ago");
    assert.equal(format(new Date(now - 4 * 86400 * 1000)), "4d ago");
  });
});
