"""Backend JSON repair, parsing, and validation utility for structured AI outputs."""

import json
import logging
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ── Pydantic Schemas for Strict Response Validation ─────────────────────────────

class MCQQuestionSchema(BaseModel):
    id: int = 1
    question: str
    options: List[str] = Field(min_length=2)
    correctAnswer: int = 0
    explanation: str = ""
    difficulty: str = "Medium"
    topic: str = "General"


class MCQMetadataSchema(BaseModel):
    title: str = "Multiple Choice Quiz"
    totalQuestions: int = 0
    estimatedTime: str = "5-10 minutes"


class MCQResponseSchema(BaseModel):
    metadata: MCQMetadataSchema = Field(default_factory=MCQMetadataSchema)
    questions: List[MCQQuestionSchema] = Field(min_length=1)


class VivaQuestionSchema(BaseModel):
    id: int = 1
    question: str
    expectedAnswer: str
    keyPoints: List[str] = Field(default_factory=list)
    difficulty: str = "Medium"
    topic: str = "General"


class VivaMetadataSchema(BaseModel):
    title: str = "Viva Exam Preparation"
    totalQuestions: int = 0


class VivaResponseSchema(BaseModel):
    metadata: VivaMetadataSchema = Field(default_factory=VivaMetadataSchema)
    questions: List[VivaQuestionSchema] = Field(min_length=1)


class FlashcardSchema(BaseModel):
    front: str
    back: str


class FlashcardsResponseSchema(BaseModel):
    flashcards: List[FlashcardSchema] = Field(min_length=1)


# ── Robust Repair & Parsing Utilities ─────────────────────────────────────────

def repair_json_string(text: str) -> str:
    """Clean markdown code fences and repair malformed JSON strings."""
    if not text:
        return ""

    cleaned = text.strip()

    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\n?```\s*$", "", cleaned).strip()

    # Locate first opening brace/bracket and last closing brace/bracket
    first_brace = re.search(r"[\{\[]", cleaned)
    if first_brace:
        start_idx = first_brace.start()
        end_brace_matches = [m.start() for m in re.finditer(r"[\}\]]", cleaned)]
        if end_brace_matches:
            last_idx = end_brace_matches[-1]
            if last_idx > start_idx:
                cleaned = cleaned[start_idx:last_idx + 1]
            else:
                cleaned = cleaned[start_idx:]
        else:
            cleaned = cleaned[start_idx:]

    # Remove trailing commas before closing braces/brackets
    cleaned = re.sub(r",\s*([\}\]])", r"\1", cleaned)

    # Balance unclosed quotes and brackets if necessary
    open_braces = 0
    open_brackets = 0
    in_string = False
    escaped = False

    for char in cleaned:
        if char == '"' and not escaped:
            in_string = not in_string
        elif not in_string:
            if char == "{":
                open_braces += 1
            elif char == "}":
                open_braces = max(0, open_braces - 1)
            elif char == "[":
                open_brackets += 1
            elif char == "]":
                open_brackets = max(0, open_brackets - 1)

        escaped = (char == "\\" and not escaped)

    if in_string:
        cleaned += '"'
    cleaned += "]" * open_brackets
    cleaned += "}" * open_braces

    return cleaned


def parse_and_validate_mcqs(raw_text: str) -> MCQResponseSchema:
    """Parse raw text from Gemini into a validated MCQResponseSchema object."""
    cleaned = repair_json_string(raw_text)
    try:
        data = json.loads(cleaned)
    except Exception as err:
        logger.warning("Initial JSON parse failed for MCQs: %s. Raw text snippet: %s", err, raw_text[:200])
        raise ValueError(f"Failed to parse MCQ JSON: {err}") from err

    # Handle array-only responses
    if isinstance(data, list):
        data = {"questions": data}

    if not isinstance(data, dict):
        raise ValueError("MCQ JSON output must be a JSON object.")

    questions_raw = data.get("questions", [])
    if not isinstance(questions_raw, list) or len(questions_raw) == 0:
        raise ValueError("MCQ response must contain at least one question in 'questions' list.")

    validated_questions: List[MCQQuestionSchema] = []
    for idx, q in enumerate(questions_raw):
        if not isinstance(q, dict):
            continue
        opts = q.get("options", ["Option A", "Option B", "Option C", "Option D"])
        if not isinstance(opts, list) or len(opts) < 2:
            opts = ["True", "False"]
        opts = [str(o) for o in opts]

        correct_idx = q.get("correctAnswer", 0)
        if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx >= len(opts):
            correct_idx = 0

        validated_questions.append(
            MCQQuestionSchema(
                id=q.get("id", idx + 1),
                question=str(q.get("question", f"Question {idx + 1}")),
                options=opts,
                correctAnswer=correct_idx,
                explanation=str(q.get("explanation", "Base factual explanation from source text.")),
                difficulty=str(q.get("difficulty", "Medium")),
                topic=str(q.get("topic", "General")),
            )
        )

    meta = data.get("metadata", {})
    if not isinstance(meta, dict):
        meta = {}

    return MCQResponseSchema(
        metadata=MCQMetadataSchema(
            title=str(meta.get("title", "Multiple Choice Quiz")),
            totalQuestions=len(validated_questions),
            estimatedTime=str(meta.get("estimatedTime", f"{max(5, len(validated_questions))} minutes")),
        ),
        questions=validated_questions,
    )


def parse_and_validate_viva(raw_text: str) -> VivaResponseSchema:
    """Parse raw text from Gemini into a validated VivaResponseSchema object."""
    cleaned = repair_json_string(raw_text)
    try:
        data = json.loads(cleaned)
    except Exception as err:
        logger.warning("Initial JSON parse failed for Viva: %s. Raw text snippet: %s", err, raw_text[:200])
        raise ValueError(f"Failed to parse Viva JSON: {err}") from err

    if isinstance(data, list):
        data = {"questions": data}

    if not isinstance(data, dict):
        raise ValueError("Viva JSON output must be a JSON object.")

    questions_raw = data.get("questions", [])
    if not isinstance(questions_raw, list) or len(questions_raw) == 0:
        raise ValueError("Viva response must contain at least one question in 'questions' list.")

    validated_questions: List[VivaQuestionSchema] = []
    for idx, q in enumerate(questions_raw):
        if not isinstance(q, dict):
            continue
        k_points = q.get("keyPoints", [])
        if not isinstance(k_points, list):
            k_points = [str(k_points)]
        k_points = [str(kp) for kp in k_points if kp]

        validated_questions.append(
            VivaQuestionSchema(
                id=q.get("id", idx + 1),
                question=str(q.get("question", f"Examiner Question {idx + 1}")),
                expectedAnswer=str(q.get("expectedAnswer") or q.get("answer") or "Model verbal response based on source material."),
                keyPoints=k_points,
                difficulty=str(q.get("difficulty", "Medium")),
                topic=str(q.get("topic", "General")),
            )
        )

    meta = data.get("metadata", {})
    if not isinstance(meta, dict):
        meta = {}

    return VivaResponseSchema(
        metadata=VivaMetadataSchema(
            title=str(meta.get("title", "Viva Exam Preparation")),
            totalQuestions=len(validated_questions),
        ),
        questions=validated_questions,
    )


def parse_and_validate_flashcards(raw_text: str) -> FlashcardsResponseSchema:
    """Parse raw text from Gemini into a validated FlashcardsResponseSchema object."""
    cleaned = repair_json_string(raw_text)
    try:
        data = json.loads(cleaned)
    except Exception as err:
        logger.warning("Initial JSON parse failed for Flashcards: %s. Raw text snippet: %s", err, raw_text[:200])
        raise ValueError(f"Failed to parse Flashcards JSON: {err}") from err

    cards_raw = []
    if isinstance(data, dict):
        cards_raw = data.get("flashcards") or data.get("cards") or []
    elif isinstance(data, list):
        cards_raw = data

    if not isinstance(cards_raw, list) or len(cards_raw) == 0:
        raise ValueError("Flashcard response must contain a list of flashcards.")

    validated_cards: List[FlashcardSchema] = []
    for idx, c in enumerate(cards_raw):
        if not isinstance(c, dict):
            continue
        front_text = str(c.get("front") or c.get("question") or c.get("term") or f"Concept {idx + 1}")
        back_text = str(c.get("back") or c.get("answer") or c.get("definition") or "Explanation details.")
        validated_cards.append(FlashcardSchema(front=front_text, back=back_text))

    if len(validated_cards) == 0:
        raise ValueError("No valid flashcards parsed.")

    return FlashcardsResponseSchema(flashcards=validated_cards)
