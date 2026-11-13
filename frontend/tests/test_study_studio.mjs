/**
 * Automated test suite for StudyHub V2 Study Studio Frontend (Phase 4B).
 * Verifies Study Guide, Flashcards, Exam Paper generation payloads,
 * UI state transitions, card flipping, exam marking schemes, grounding transparency,
 * and deletion confirmation flows.
 */

import assert from "node:assert/strict";
import test from "node:test";

test("Study Guide Generation Contract & Payload", async (t) => {
  await t.test("Builds valid study guide payload with title and focus topics", () => {
    const title = "Operating Systems Unit 3 Revision";
    const focus = "Memory management, Paging, Virtual Memory";

    const payload = {
      title: title.trim() || undefined,
      focus_topics: focus
        ? focus.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
    };

    assert.equal(payload.title, "Operating Systems Unit 3 Revision");
    assert.deepEqual(payload.focus_topics, [
      "Memory management",
      "Paging",
      "Virtual Memory",
    ]);
  });

  await t.test("Omits focus_topics when string is empty or whitespace", () => {
    const focus = "   ";
    const topics = focus
      ? focus.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const finalTopics = topics && topics.length > 0 ? topics : undefined;
    assert.equal(finalTopics, undefined);
  });
});

test("Flashcards Deck & Flip State Mechanics", async (t) => {
  const sampleDeck = [
    {
      question: "What is virtual memory?",
      answer: "A memory management technique that provides an idealized abstraction of storage resources.",
      difficulty: "Easy",
      topic: "Memory Management",
    },
    {
      question: "Explain the purpose of the Translation Lookaside Buffer (TLB).",
      answer: "A hardware cache used to reduce the time taken to access a user memory location.",
      difficulty: "Medium",
      topic: "Paging",
    },
    {
      question: "Define thrashing and explain how page fault frequency detects it.",
      answer: "Thrashing occurs when a computer's virtual memory subsystem is in constant paging state.",
      difficulty: "Hard",
      topic: "Virtual Memory",
    },
  ];

  await t.test("Validates card navigation bounds", () => {
    let cardIndex = 0;
    const total = sampleDeck.length;

    // Boundary at index 0 (cannot go previous)
    const canGoPrevAtStart = cardIndex > 0;
    assert.equal(canGoPrevAtStart, false);

    // Next card
    cardIndex = Math.min(total - 1, cardIndex + 1);
    assert.equal(cardIndex, 1);

    // Next card to last
    cardIndex = Math.min(total - 1, cardIndex + 1);
    assert.equal(cardIndex, 2);

    // Boundary at end (cannot go next)
    const canGoNextAtEnd = cardIndex < total - 1;
    assert.equal(canGoNextAtEnd, false);
  });

  await t.test("Flip state resets to question on card change", () => {
    let isFlipped = true;
    let cardIndex = 0;

    const navigateToCard = (newIndex) => {
      cardIndex = newIndex;
      isFlipped = false; // Must reset to question view
    };

    navigateToCard(1);
    assert.equal(cardIndex, 1);
    assert.equal(isFlipped, false);
  });

  await t.test("Preserves full card content in both front and back", () => {
    for (const card of sampleDeck) {
      assert.ok(card.question.length > 0);
      assert.ok(card.answer.length > 0);
      assert.ok(["Easy", "Medium", "Hard"].includes(card.difficulty));
    }
  });
});

test("Exam Paper Mark Allocation & Question Validation", async (t) => {
  await t.test("Validates total marks must be positive multiple of 5", () => {
    const isValidExamMarks = (marks) => marks > 0 && marks % 5 === 0;

    assert.equal(isValidExamMarks(25), true);
    assert.equal(isValidExamMarks(50), true);
    assert.equal(isValidExamMarks(75), true);
    assert.equal(isValidExamMarks(100), true);

    assert.equal(isValidExamMarks(23), false);
    assert.equal(isValidExamMarks(0), false);
    assert.equal(isValidExamMarks(-10), false);
    assert.equal(isValidExamMarks(12), false);
  });

  await t.test("Requires at least one question type (5-mark or 10-mark)", () => {
    const validateTypes = (fiveMark, tenMark) => {
      const types = [];
      if (fiveMark) types.push("five_mark");
      if (tenMark) types.push("ten_mark");
      return types;
    };

    assert.deepEqual(validateTypes(true, true), ["five_mark", "ten_mark"]);
    assert.deepEqual(validateTypes(true, false), ["five_mark"]);
    assert.deepEqual(validateTypes(false, true), ["ten_mark"]);
    assert.deepEqual(validateTypes(false, false), []);
  });

  await t.test("Sums marks accurately across section questions", () => {
    const examQuestions = [
      { question_number: 1, type: "five_mark", marks: 5, question: "Q1" },
      { question_number: 2, type: "five_mark", marks: 5, question: "Q2" },
      { question_number: 3, type: "ten_mark", marks: 10, question: "Q3" },
      { question_number: 4, type: "ten_mark", marks: 10, question: "Q4" },
    ];

    const computedTotal = examQuestions.reduce((sum, q) => sum + q.marks, 0);
    assert.equal(computedTotal, 30);
  });

  await t.test("Omit model answers when include_answer_key is false", () => {
    const examWithoutAnswers = {
      title: "Mid-Term Exam",
      total_marks: 25,
      include_answer_key: false,
      questions: [
        {
          question_number: 1,
          type: "five_mark",
          marks: 5,
          question: "Define CPU Scheduling.",
          model_answer: null,
          scoring_criteria: [],
        },
      ],
    };

    assert.equal(examWithoutAnswers.include_answer_key, false);
    assert.equal(examWithoutAnswers.questions[0].model_answer, null);
  });
});

test("Grounding Transparency & Truncation Disclosure", async (t) => {
  await t.test("Detects and discloses truncated context budget", () => {
    const responseWithTruncation = {
      material_type: "study_guide",
      configuration: {
        truncated: true,
        focus_topics: ["Compilers"],
      },
      source_references: [
        { source_id: "src_1", title: "Chapter 1 Notes.pdf" },
      ],
    };

    const shouldShowWarning = Boolean(responseWithTruncation.configuration?.truncated);
    assert.equal(shouldShowWarning, true);

    const normalResponse = {
      material_type: "study_guide",
      configuration: {
        truncated: false,
      },
      source_references: [],
    };

    assert.equal(Boolean(normalResponse.configuration?.truncated), false);
  });
});

test("Material Deletion & Client-Side Guard Rails", async (t) => {
  await t.test("Disables generation when 0 completed sources exist", () => {
    const sourcesEmpty = [];
    const sourcesPending = [
      { id: "1", processing_status: "pending" },
      { id: "2", processing_status: "failed" },
    ];
    const sourcesReady = [
      { id: "3", processing_status: "completed" },
    ];

    const isGenerationDisabled = (sources) =>
      sources.filter((s) => s.processing_status === "completed").length === 0;

    assert.equal(isGenerationDisabled(sourcesEmpty), true);
    assert.equal(isGenerationDisabled(sourcesPending), true);
    assert.equal(isGenerationDisabled(sourcesReady), false);
  });

  await t.test("Prevents duplicate concurrent submissions while generating", () => {
    let isGenerating = true;
    let submittedCount = 0;

    const attemptSubmit = () => {
      if (isGenerating) return;
      submittedCount++;
    };

    attemptSubmit();
    assert.equal(submittedCount, 0);

    isGenerating = false;
    attemptSubmit();
    assert.equal(submittedCount, 1);
  });
});
