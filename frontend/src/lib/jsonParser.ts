/**
 * Robust JSON parsing & repair utility for AI responses.
 * Prevents raw JSON strings from leaking to the UI and guarantees validated structured objects.
 */

export interface MCQQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty?: string;
  topic?: string;
}

export interface MCQResponse {
  metadata: {
    title: string;
    totalQuestions: number;
    estimatedTime?: string;
  };
  questions: MCQQuestion[];
}

export interface VivaQuestion {
  id: number;
  question: string;
  expectedAnswer: string;
  keyPoints: string[];
  difficulty?: string;
  topic?: string;
}

export interface VivaResponse {
  metadata: {
    title: string;
    totalQuestions: number;
  };
  questions: VivaQuestion[];
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardResponse {
  flashcards: Flashcard[];
}

/**
 * Attempts to repair malformed JSON string returned by LLMs
 * (e.g. trailing commas, missing closing brackets, unescaped line breaks inside strings).
 */
export function repairJsonString(input: string): string {
  if (!input || typeof input !== "string") return "";

  let cleaned = input.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  }

  // Find first opening brace/bracket and last closing brace/bracket
  const firstBrace = cleaned.search(/[\{\[]/);
  if (firstBrace !== -1) {
    const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      cleaned = cleaned.substring(firstBrace);
    }
  }

  // Replace trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\}\]])/g, "$1");

  // Fix unescaped control characters in strings
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
    if (c === "\n") return "\\n";
    if (c === "\r") return "\\r";
    if (c === "\t") return "\\t";
    return "";
  });

  // Attempt auto-closing unclosed brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const prevChar = i > 0 ? cleaned[i - 1] : "";
    if (char === '"' && prevChar !== "\\") {
      inString = !inString;
    } else if (!inString) {
      if (char === "{") openBraces++;
      if (char === "}") openBraces = Math.max(0, openBraces - 1);
      if (char === "[") openBrackets++;
      if (char === "]") openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  if (inString) {
    cleaned += '"';
  }
  while (openBrackets > 0) {
    cleaned += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    cleaned += "}";
    openBraces--;
  }

  return cleaned;
}

/**
 * Safely parses MCQ JSON response with schema validation and structural defaults.
 */
export function parseMCQResponse(rawInput: string | object): MCQResponse | null {
  if (!rawInput) return null;

  let obj: any = rawInput;
  if (typeof rawInput === "string") {
    try {
      obj = JSON.parse(rawInput);
    } catch {
      try {
        const repaired = repairJsonString(rawInput);
        obj = JSON.parse(repaired);
      } catch {
        return null;
      }
    }
  }

  if (!obj || typeof obj !== "object") return null;

  const rawQuestions = Array.isArray(obj.questions) ? obj.questions : Array.isArray(obj) ? obj : [];
  if (rawQuestions.length === 0) return null;

  const validatedQuestions: MCQQuestion[] = rawQuestions.map((q: any, index: number) => {
    const opts = Array.isArray(q.options)
      ? q.options.map((o: any) => String(o || ""))
      : ["Option A", "Option B", "Option C", "Option D"];

    let correctIdx = typeof q.correctAnswer === "number" ? q.correctAnswer : 0;
    if (correctIdx < 0 || correctIdx >= opts.length) correctIdx = 0;

    return {
      id: typeof q.id === "number" ? q.id : index + 1,
      question: String(q.question || `Question ${index + 1}`),
      options: opts.length >= 2 ? opts : ["True", "False"],
      correctAnswer: correctIdx,
      explanation: String(q.explanation || "No explanation provided."),
      difficulty: String(q.difficulty || "Medium"),
      topic: String(q.topic || "General")
    };
  });

  return {
    metadata: {
      title: String(obj.metadata?.title || "Multiple Choice Quiz"),
      totalQuestions: validatedQuestions.length,
      estimatedTime: String(obj.metadata?.estimatedTime || `${Math.ceil(validatedQuestions.length * 0.8)} mins`)
    },
    questions: validatedQuestions
  };
}

/**
 * Safely parses Viva Questions JSON response with schema validation.
 */
export function parseVivaResponse(rawInput: string | object): VivaResponse | null {
  if (!rawInput) return null;

  let obj: any = rawInput;
  if (typeof rawInput === "string") {
    try {
      obj = JSON.parse(rawInput);
    } catch {
      try {
        const repaired = repairJsonString(rawInput);
        obj = JSON.parse(repaired);
      } catch {
        return null;
      }
    }
  }

  if (!obj || typeof obj !== "object") return null;

  const rawQuestions = Array.isArray(obj.questions) ? obj.questions : Array.isArray(obj) ? obj : [];
  if (rawQuestions.length === 0) return null;

  const validatedQuestions: VivaQuestion[] = rawQuestions.map((q: any, index: number) => ({
    id: typeof q.id === "number" ? q.id : index + 1,
    question: String(q.question || `Viva Question ${index + 1}`),
    expectedAnswer: String(q.expectedAnswer || q.answer || "No response provided."),
    keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints.map((k: any) => String(k)) : [],
    difficulty: String(q.difficulty || "Medium"),
    topic: String(q.topic || "General")
  }));

  return {
    metadata: {
      title: String(obj.metadata?.title || "Viva Exam Preparation"),
      totalQuestions: validatedQuestions.length
    },
    questions: validatedQuestions
  };
}

/**
 * Safely parses Flashcards JSON response with schema validation.
 */
export function parseFlashcardResponse(rawInput: string | object): FlashcardResponse | null {
  if (!rawInput) return null;

  let obj: any = rawInput;
  if (typeof rawInput === "string") {
    try {
      obj = JSON.parse(rawInput);
    } catch {
      try {
        const repaired = repairJsonString(rawInput);
        obj = JSON.parse(repaired);
      } catch {
        return null;
      }
    }
  }

  if (!obj || typeof obj !== "object") return null;

  const rawCards = Array.isArray(obj.flashcards)
    ? obj.flashcards
    : Array.isArray(obj.cards)
    ? obj.cards
    : Array.isArray(obj)
    ? obj
    : [];

  if (rawCards.length === 0) return null;

  const validatedCards: Flashcard[] = rawCards.map((c: any, index: number) => ({
    front: String(c.front || c.question || c.term || `Flashcard ${index + 1}`),
    back: String(c.back || c.answer || c.definition || "No details provided.")
  }));

  return {
    flashcards: validatedCards
  };
}

/**
 * Helper to check if a string contains raw unparsed JSON.
 */
export function isRawJsonString(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const trimmed = input.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
