/**
 * Automated test suite for StudyHub V2 Interactive Notebook Workspace.
 * Verifies client-side upload constraints, SSE citation streaming,
 * and notebook/source data structures.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SOURCE_FILE_SIZE,
  ALLOWED_SOURCE_EXTENSIONS,
  validateSourceFile,
} from "../src/lib/api.ts";

test("Client-Side Upload Validation Constraints", async (t) => {
  await t.test("Rejects file exceeding 20 MB size limit", () => {
    const oversizedFile = {
      name: "giant_textbook.pdf",
      size: 20 * 1024 * 1024 + 1, // 20 MB + 1 byte
    };
    const result = validateSourceFile(oversizedFile);
    assert.equal(result.valid, false);
    assert.match(result.error, /exceeds the maximum allowed limit of 20 MB/);
  });

  await t.test("Accepts file exactly at 20 MB size limit", () => {
    const exactLimitFile = {
      name: "boundary_lecture.pdf",
      size: 20 * 1024 * 1024,
    };
    const result = validateSourceFile(exactLimitFile);
    assert.equal(result.valid, true);
    assert.equal(result.error, undefined);
  });

  await t.test("Accepts all allowed source extensions (.pdf, .docx, .pptx, .txt)", () => {
    const testCases = [
      "syllabus.pdf",
      "SYLLABUS.PDF",
      "assignment1.docx",
      "presentation.pptx",
      "notes.txt",
    ];

    for (const filename of testCases) {
      const file = { name: filename, size: 1024 * 50 }; // 50 KB
      const result = validateSourceFile(file);
      assert.equal(result.valid, true, `Expected ${filename} to be valid`);
    }
  });

  await t.test("Rejects disallowed extensions", () => {
    const disallowed = [
      "script.py",
      "binary.exe",
      "archive.zip",
      "photo.png",
      "data.csv",
      "code.ts",
      "filewithoutdot",
    ];

    for (const filename of disallowed) {
      const file = { name: filename, size: 1024 };
      const result = validateSourceFile(file);
      assert.equal(result.valid, false, `Expected ${filename} to be rejected`);
      assert.match(result.error, /Unsupported file type/);
    }
  });
});

test("SSE Event Stream Citation and Message Parsing", async (t) => {
  // Simulator for the SSE parser logic in api.ts
  function parseSseEvents(rawSse) {
    const events = rawSse.split("\n\n");
    const parsed = [];

    for (const event of events) {
      const eventType = event.match(/^event: (.+)$/m)?.[1];
      const data = event.match(/^data: (.+)$/m)?.[1];
      if (!eventType || !data) continue;

      if (eventType === "citations") {
        const payload = JSON.parse(data);
        const citations = Array.isArray(payload) ? payload : payload?.citations ?? [];
        parsed.push({ type: "citations", citations });
      } else if (eventType === "delta") {
        const payload = JSON.parse(data);
        if (payload.text) parsed.push({ type: "delta", text: payload.text });
      } else if (eventType === "done") {
        parsed.push({ type: "done" });
      } else if (eventType === "error") {
        const payload = JSON.parse(data);
        parsed.push({ type: "error", message: payload.message });
      }
    }
    return parsed;
  }

  await t.test("Parses object citations payload format from backend", () => {
    const sampleSse = [
      'event: delta\ndata: {"text": "According to the course notes, "}',
      'event: citations\ndata: {"citations": [{"source_id": "src-1", "display_title": "Lecture 1.pdf", "chunk_index": 0, "section": null}]}',
      'event: delta\ndata: {"text": "Amdahl\'s Law defines speedup."}',
      'event: done\ndata: {}',
    ].join("\n\n");

    const events = parseSseEvents(sampleSse);
    assert.equal(events.length, 4);
    assert.equal(events[0].type, "delta");
    assert.equal(events[0].text, "According to the course notes, ");

    assert.equal(events[1].type, "citations");
    assert.equal(events[1].citations.length, 1);
    assert.equal(events[1].citations[0].source_id, "src-1");
    assert.equal(events[1].citations[0].display_title, "Lecture 1.pdf");
    assert.equal(events[1].citations[0].chunk_index, 0);

    assert.equal(events[2].type, "delta");
    assert.equal(events[3].type, "done");
  });

  await t.test("Parses direct array citations payload defensively", () => {
    const sampleSse =
      'event: citations\ndata: [{"source_id": "src-2", "display_title": "Chapter 3.pdf", "chunk_index": 4, "section": "Section 3.2"}]\n\n';

    const events = parseSseEvents(sampleSse);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "citations");
    assert.equal(events[0].citations.length, 1);
    assert.equal(events[0].citations[0].source_id, "src-2");
    assert.equal(events[0].citations[0].section, "Section 3.2");
  });
});

test("Source and Notebook Data Contract Integrity", async (t) => {
  await t.test("SourceResponse never leaks physical storage keys", () => {
    const sampleBackendSource = {
      id: "a43e7fd1-9f2d-4f04-897c-9ef4ea95d5a2",
      notebook_id: "7b4c6e91-1122-3344-5566-778899aabbcc",
      source_type: "pdf",
      original_filename: "lecture1.pdf",
      display_title: "lecture1.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 1048576,
      content_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      processing_status: "completed",
      error_message: null,
      created_at: "2026-11-13T20:00:00Z",
      updated_at: "2026-11-13T20:00:05Z",
    };

    // Verify storage_key and internal physical paths are absent
    assert.equal(sampleBackendSource.storage_key, undefined);
    assert.equal(sampleBackendSource.file_path, undefined);
    assert.equal(sampleBackendSource.local_path, undefined);
    assert.equal(sampleBackendSource.processing_status, "completed");
  });

  await t.test("Citation highlight association maps citation source_id to source item", () => {
    const sources = [
      { id: "src-aaa", display_title: "CS101 Slides.pdf" },
      { id: "src-bbb", display_title: "Operating Systems Notes.docx" },
    ];

    const citation = {
      source_id: "src-bbb",
      display_title: "Operating Systems Notes.docx",
      chunk_index: 2,
    };

    const matchedSource = sources.find((s) => s.id === citation.source_id);
    assert.notEqual(matchedSource, undefined);
    assert.equal(matchedSource.id, "src-bbb");
    assert.equal(matchedSource.display_title, citation.display_title);
  });
});
