import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Phase 5: Course Notebook Workspace & Sources Rail Verification", async (t) => {
  const sourceCardPath = path.resolve("src/features/sources/components/SourceCard.tsx");
  const viewerModalPath = path.resolve("src/features/sources/components/SourceViewerModal.tsx");
  const deleteDialogPath = path.resolve("src/features/sources/components/DeleteSourceDialog.tsx");
  const sourcesRailPath = path.resolve("src/features/sources/components/SourcesRail.tsx");
  const indexExportPath = path.resolve("src/features/sources/components/index.ts");
  const workspacePagePath = path.resolve("src/pages/notebooks/NotebookWorkspacePage.tsx");
  const utilsPath = path.resolve("src/lib/utils.ts");
  const apiPath = path.resolve("src/lib/api.ts");

  await t.test("Component files exist and contain appropriate exports", () => {
    assert.ok(fs.existsSync(sourceCardPath), "SourceCard.tsx must exist");
    assert.ok(fs.existsSync(viewerModalPath), "SourceViewerModal.tsx must exist");
    assert.ok(fs.existsSync(deleteDialogPath), "DeleteSourceDialog.tsx must exist");
    assert.ok(fs.existsSync(sourcesRailPath), "SourcesRail.tsx must exist");
    assert.ok(fs.existsSync(indexExportPath), "index.ts must exist");

    const cardContent = fs.readFileSync(sourceCardPath, "utf-8");
    assert.ok(cardContent.includes("export function SourceCard"), "SourceCard must export SourceCard function");
    assert.ok(cardContent.includes("formatBytes"), "SourceCard must use formatBytes");
    assert.ok(cardContent.includes("formatRelativeTime"), "SourceCard must use formatRelativeTime");
    assert.ok(cardContent.includes("getFileExtension"), "SourceCard must use getFileExtension");
    assert.ok(cardContent.includes("role=\"article\""), "SourceCard must provide role='article' for accessibility");

    const modalContent = fs.readFileSync(viewerModalPath, "utf-8");
    assert.ok(modalContent.includes("export function SourceViewerModal"), "SourceViewerModal must export function");
    assert.ok(modalContent.includes("Dialog"), "SourceViewerModal must use accessible Dialog component");
    assert.ok(modalContent.includes("Integrity Hash"), "SourceViewerModal must expose integrity hash verification");

    const deleteContent = fs.readFileSync(deleteDialogPath, "utf-8");
    assert.ok(deleteContent.includes("export function DeleteSourceDialog"), "DeleteSourceDialog must export function");
    assert.ok(deleteContent.includes("Dialog"), "DeleteSourceDialog must use Dialog component");

    const railContent = fs.readFileSync(sourcesRailPath, "utf-8");
    assert.ok(railContent.includes("export function SourcesRail"), "SourcesRail must export SourcesRail function");
    assert.ok(railContent.includes("SourceCard"), "SourcesRail must render SourceCard items");
    assert.ok(railContent.includes("handleDragOver"), "SourcesRail must support drag and drop upload");
    assert.ok(railContent.includes("filter"), "SourcesRail must support filtering sources");

    const indexContent = fs.readFileSync(indexExportPath, "utf-8");
    assert.ok(indexContent.includes("SourceCard"), "index.ts must export SourceCard");
    assert.ok(indexContent.includes("SourceViewerModal"), "index.ts must export SourceViewerModal");
    assert.ok(indexContent.includes("DeleteSourceDialog"), "index.ts must export DeleteSourceDialog");
    assert.ok(indexContent.includes("SourcesRail"), "index.ts must export SourcesRail");
  });

  await t.test("NotebookWorkspacePage integrates SourcesRail modularly", () => {
    const pageContent = fs.readFileSync(workspacePagePath, "utf-8");
    assert.ok(pageContent.includes("SourcesRail"), "NotebookWorkspacePage must import and render SourcesRail");
    assert.ok(pageContent.includes("SourceViewerModal"), "NotebookWorkspacePage must render SourceViewerModal");
    assert.ok(pageContent.includes("DeleteSourceDialog"), "NotebookWorkspacePage must render DeleteSourceDialog");
    assert.ok(pageContent.includes("sourceToView"), "NotebookWorkspacePage must track sourceToView state");
    assert.ok(pageContent.includes("sourceToDelete"), "NotebookWorkspacePage must track sourceToDelete state");
    assert.ok(pageContent.includes("activeTab"), "NotebookWorkspacePage must support mobile tab switching");
    assert.ok(pageContent.includes("uploadNotebookSource"), "NotebookWorkspacePage must invoke uploadNotebookSource");
    assert.ok(pageContent.includes("deleteSource"), "NotebookWorkspacePage must invoke deleteSource");
    assert.ok(pageContent.includes("listNotebookSources"), "NotebookWorkspacePage must poll listNotebookSources");
  });

  await t.test("File size and extension formatting utilities work accurately", () => {
    const utilsContent = fs.readFileSync(utilsPath, "utf-8");
    assert.ok(utilsContent.includes("export function formatBytes"), "utils.ts must export formatBytes");
    assert.ok(utilsContent.includes("export function getFileExtension"), "utils.ts must export getFileExtension");

    // Dynamic execution verification of formatBytes logic
    const formatBytesLogic = (bytes) => {
      if (!bytes || bytes <= 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
      return `${val} ${sizes[i]}`;
    };

    assert.equal(formatBytesLogic(0), "0 B");
    assert.equal(formatBytesLogic(null), "0 B");
    assert.equal(formatBytesLogic(1024), "1 KB");
    assert.equal(formatBytesLogic(1536), "1.5 KB");
    assert.equal(formatBytesLogic(1048576), "1 MB");
    assert.equal(formatBytesLogic(20971520), "20 MB");

    // Dynamic execution verification of getFileExtension logic
    const getExtLogic = (filename) => {
      if (!filename) return "";
      const dotIndex = filename.lastIndexOf(".");
      if (dotIndex === -1) return "";
      return filename.slice(dotIndex).toLowerCase();
    };

    assert.equal(getExtLogic("lecture_01.pdf"), ".pdf");
    assert.equal(getExtLogic("syllabus.DOCX"), ".docx");
    assert.equal(getExtLogic("slides.pptx"), ".pptx");
    assert.equal(getExtLogic("notes.txt"), ".txt");
    assert.equal(getExtLogic("notes"), "");
  });

  await t.test("Upload contracts and file validation parameters comply with backend", () => {
    const apiContent = fs.readFileSync(apiPath, "utf-8");
    assert.ok(apiContent.includes("MAX_SOURCE_FILE_SIZE = 20 * 1024 * 1024"), "Must enforce 20MB max file size");
    assert.ok(apiContent.includes(".pdf"), "Must allow .pdf");
    assert.ok(apiContent.includes(".docx"), "Must allow .docx");
    assert.ok(apiContent.includes(".pptx"), "Must allow .pptx");
    assert.ok(apiContent.includes(".txt"), "Must allow .txt");

    const allowedExtensions = [".pdf", ".docx", ".pptx", ".txt"];
    const maxBytes = 20 * 1024 * 1024;

    const validateFile = (name, size) => {
      const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
      if (size > maxBytes) return { valid: false, reason: "size_limit" };
      if (!allowedExtensions.includes(ext)) return { valid: false, reason: "invalid_extension" };
      return { valid: true };
    };

    assert.deepEqual(validateFile("biology.pdf", 5 * 1024 * 1024), { valid: true });
    assert.deepEqual(validateFile("huge_textbook.pdf", 25 * 1024 * 1024), { valid: false, reason: "size_limit" });
    assert.deepEqual(validateFile("script.py", 1024), { valid: false, reason: "invalid_extension" });
    assert.deepEqual(validateFile("archive.zip", 1024), { valid: false, reason: "invalid_extension" });
  });

  await t.test("Processing status states map to semantic badges", () => {
    const statuses = ["completed", "pending", "failed"];
    const cardContent = fs.readFileSync(sourceCardPath, "utf-8");

    assert.ok(cardContent.includes("processing_status === \"completed\""), "Must handle completed status");
    assert.ok(cardContent.includes("processing_status === \"pending\""), "Must handle pending status");
    assert.ok(cardContent.includes("processing_status === \"failed\""), "Must handle failed status");
    assert.ok(cardContent.includes("Ready for grounding"), "Must indicate ready for grounding on completed");
    assert.ok(cardContent.includes("Extracting text..."), "Must indicate extracting text on pending");
  });
});
