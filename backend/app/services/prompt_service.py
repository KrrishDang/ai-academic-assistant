"""Prompt engineering templates and helpers service."""

class PromptService:
    """Service responsible for building system instructions and templates for Gemini."""

    @staticmethod
    def build_notes_prompt() -> str:
        """System instruction for generating structured academic notes."""
        return (
            "Create high-quality, exam-oriented study notes based ONLY on the source text. "
            "Follow these strict formatting and content rules:\n"
            "1. Content Scope: Base all notes ONLY on the provided text. Do not introduce outside knowledge or unsupported facts.\n"
            "2. Tone and Style: Maintain a clean, professional academic tone. Avoid introductory remarks, filler text, conversational language, or generic summaries.\n"
            "3. Structure & Formatting:\n"
            "   - Use clear markdown headings (##) and subheadings (###).\n"
            "   - Prefer concise, easy-to-scan bullet points over long paragraphs.\n"
            "   - Highlight key terms and crucial keywords in **bold**.\n"
            "   - Do not include any placeholder student details (e.g. name, roll number, class) unless explicitly requested.\n"
            "4. Required Sections (include all of these in order):\n"
            "   - ## Key Concepts & Explanations: Extract and explain all major concepts. Use comparison tables if two or more concepts are compared in the source text. Use numbered lists for processes, steps, or sequential methods. Include examples only if they are directly supported by the source.\n"
            "   - ## Definitions: Dedicated list of all important definitions from the text.\n"
            "   - ## Key Terms: Terminology list with brief, precise meanings.\n"
            "   - ## Key Takeaways: Summary of the most important core ideas.\n"
            "   - ## Important Exam Points: Crucial points, formulas, or concepts students must memorize for exams.\n"
            "   - ## Quick Revision: Short, one-line bullet points for rapid scan-reading.\n"
            "   - ## Simple Memory Tricks & Mnemonics: Include easy memory tricks or mnemonics *only* if they naturally fit the source material (otherwise omit this section).\n"
            "   - ## Possible Exam Questions: Likely questions based strictly on the source, categorized into Short-Answer, Long-Answer, and Viva Questions."
        )

    @staticmethod
    def build_mcq_prompt() -> str:
        """System instruction for generating interactive multiple-choice questions as structured JSON."""
        return (
            "Generate high-quality, interactive multiple-choice questions based ONLY on the source text. "
            "Output the results as a single valid JSON object containing quiz metadata and a list of questions. "
            "Follow these rules:\n"
            "1. Factuality: Base every question strictly on the uploaded text. Do not invent facts, options, or explanations.\n"
            "2. Distribution: Cover all major topics from the text. Generate a balanced mix of Easy, Medium, and Hard difficulty levels. Include conceptual and application-based questions where supported.\n"
            "3. Structure:\n"
            "   - Return ONLY a raw JSON block, no markdown formatting (do not wrap in ```json ... ``` blocks, do not add any text before or after the JSON).\n"
            "   - The JSON object must match this exact format:\n"
            "     {\n"
            "       \"metadata\": {\n"
            "         \"title\": \"Quiz Title (based on document content)\",\n"
            "         \"totalQuestions\": 10,\n"
            "         \"estimatedTime\": \"5-10 minutes\"\n"
            "       },\n"
            "       \"questions\": [\n"
            "         {\n"
            "           \"id\": 1,\n"
            "           \"question\": \"Question text here...\",\n"
            "           \"options\": [\n"
            "             \"Option A text\",\n"
            "             \"Option B text\",\n"
            "             \"Option C text\",\n"
            "             \"Option D text\"\n"
            "           ],\n"
            "           \"correctAnswer\": 0,\n"
            "           \"explanation\": \"Precise educational explanation referencing document facts...\",\n"
            "           \"difficulty\": \"Medium\",\n"
            "           \"topic\": \"Topic or category name\"\n"
            "         }\n"
            "       ]\n"
            "     }\n"
            "4. Options & Distractors: Provide exactly four plausible options (A, B, C, D). Ensure only one option is correct. Avoid obvious or repetitive distractors. The `correctAnswer` field must be a 0-indexed integer (0 for A, 1 for B, 2 for C, 3 for D)."
        )

    @staticmethod
    def build_viva_prompt() -> str:
        """System instruction for generating interactive viva (oral exam) questions as structured JSON."""
        return (
            "Generate high-quality, exam-oriented oral viva questions based ONLY on the source text. "
            "Output the results as a single valid JSON object containing quiz metadata and a list of questions. "
            "Follow these rules:\n"
            "1. Factuality: Base every question strictly on the uploaded text. Do not invent facts or external context.\n"
            "2. examiner tone: Write questions as an active examiner would ask them in an oral exam (focusing on conceptual understanding, definitions, and reasoning).\n"
            "3. Distribution: Cover all major topics. Mix Easy, Medium, and Hard difficulty levels.\n"
            "4. Structure:\n"
            "   - Return ONLY a raw JSON block, no markdown formatting (do not wrap in ```json ... ``` blocks, do not add any text before or after the JSON).\n"
            "   - The JSON object must match this exact format:\n"
            "     {\n"
            "       \"metadata\": {\n"
            "         \"title\": \"Viva Prep Title (based on document content)\",\n"
            "         \"totalQuestions\": 10\n"
            "       },\n"
            "       \"questions\": [\n"
            "         {\n"
            "           \"id\": 1,\n"
            "           \"question\": \"Examiner question here?\",\n"
            "           \"expectedAnswer\": \"Concise, accurate model response suitable for a 30-120 second oral reply...\",\n"
            "           \"keyPoints\": [\n"
            "             \"Critical point or keyword that must be mentioned\",\n"
            "             \"Another key fact that should be highlighted\"\n"
            "           ],\n"
            "           \"difficulty\": \"Medium\",\n"
            "           \"topic\": \"Topic or category name\"\n"
            "         }\n"
            "       ]\n"
            "     }\n"
            "5. Expected Answer: Keep it educational, practical, and optimized for speaking confidently."
        )

    @staticmethod
    def build_five_mark_prompt() -> str:
        """System instruction for generating structured 5-mark exam answers."""
        return (
            "Create a high-quality, university-style 5-mark examination answer based ONLY on the source text. "
            "Follow these strict formatting and content rules:\n"
            "1. Content Scope: Base the answer strictly on the provided text. Do not introduce outside facts or external knowledge.\n"
            "2. Tone & Style: Maintain a formal, academic, exam-oriented tone. Target approximately 250–350 words. Avoid filler, introductory chat, or conversational remarks.\n"
            "3. Required Structure (using clear markdown headings):\n"
            "   - # Title: Describing the question/topic\n"
            "   - ## Introduction: Concise overview of the concept (2-3 sentences)\n"
            "   - ## Key Points: Main body consisting of 4-5 numbered key points or headings. Highlight important keywords using **bold** formatting. Use a comparison table if two or more concepts are compared. Include examples *only* if they are explicitly present or supported by the source text.\n"
            "   - ## Diagram / Flowchart Suggestion: Provide a practical suggestion or text representation of a flowchart/diagram that would help the student score maximum marks (e.g., [Flowchart: Stage A -> Stage B]).\n"
            "   - ## Conclusion: Brief concluding summary (1-2 sentences)\n"
            "   - ## Key Keywords: Bulleted list of critical academic terms used in the answer.\n"
            "   - ## Quick Revision Points: Bulleted one-liner highlights for rapid revision.\n"
            "   - ## Exam Tip: A strategic tip on what examiners look for or common pitfalls to avoid (only if supported by the topic context)."
        )

    @staticmethod
    def build_ten_mark_prompt() -> str:
        """System instruction for generating structured 10-mark exam answers."""
        return (
            "Create a detailed, high-scoring, university-style 10-mark examination answer based ONLY on the source text. "
            "Follow these strict formatting and content rules:\n"
            "1. Content Scope: Base the answer strictly on the provided text. Do not introduce outside facts or external knowledge.\n"
            "2. Tone & Style: Maintain a formal, academic, exam-oriented tone. Target approximately 500–700 words (adjust naturally based on the source text depth). Avoid generic filler, introductory chat, or conversational remarks.\n"
            "3. Required Structure (using clear markdown headings):\n"
            "   - # Title: Describing the question/topic\n"
            "   - ## Introduction: Concise overview of the concept (3-4 sentences)\n"
            "   - ## Detailed Explanations: Main body consisting of clearly numbered headings and subheadings (###) for major concepts. Highlight important keywords using **bold** formatting. Prefer bullet points for details instead of long paragraphs. Use a comparison table if two or more concepts are compared. Include examples *only* if they are explicitly present or supported by the source text.\n"
            "   - ## Diagram / Flowchart Suggestion: Suggest a simple diagram or flowchart layout that would help the student score maximum marks (e.g., [Flowchart: Stage A -> Stage B]).\n"
            "   - ## Conclusion: Brief concluding summary (2-3 sentences)\n"
            "   - ## Key Keywords: Bulleted list of critical academic terms used in the answer.\n"
            "   - ## Quick Revision Points: Bulleted one-liner highlights for rapid revision.\n"
            "   - ## Possible Exam Questions: A list of likely related exam questions (e.g. short-answer and long-answer) based strictly on the text."
        )

    @staticmethod
    def build_simple_prompt() -> str:
        """System instruction for generating engaging, beginner-friendly explanations."""
        return (
            "Create an engaging, student-friendly explanation of the topic based ONLY on the source text. "
            "Follow these strict formatting and content rules:\n"
            "1. Content Scope: Base the explanation strictly on the provided text. Do not introduce outside facts or external knowledge. Do not reference 'the uploaded document' or mention any student names.\n"
            "2. Tone & Style: Explain the topic directly in simple, beginner-friendly language while preserving essential academic terminology. The tone should feel like a skilled teacher guiding a student. Avoid filler, repetition, or generic AI phrasing.\n"
            "3. Required Structure (using clear markdown headings):\n"
            "   - # Title: Describing the topic\n"
            "   - ## Introduction: Start by explaining the topic directly in plain language.\n"
            "   - ## Step-by-Step Explanation: Break down complex concepts step-by-step. Use subheadings (###) for distinct concepts, and prefer bullet points over long paragraphs. Highlight key terms in **bold**.\n"
            "   - ## Plain-Language Jargon Buster: List technical or academic terms from the text alongside plain-language explanations.\n"
            "   - ## Diagram / Flowchart Suggestion: Suggest a simple visual model or flowchart layout that would help clarify the explanation (e.g., [Flowchart: Input -> Process -> Output]).\n"
            "   - ## Key Takeaways: Bulleted list of the core ideas to remember.\n"
            "   - ## Quick Summary: A concise 1-2 sentence final summary.\n"
            "   - ## Check Your Understanding: A list of 3-4 short conceptual questions (based strictly on the text) to help students self-test their understanding."
        )

    @staticmethod
    def build_flashcards_prompt() -> str:
        """System instruction for generating flashcards as structured JSON."""
        return (
            "Generate a set of high-quality, exam-oriented study flashcards based ONLY on the source text. "
            "Output the results as a single valid JSON object. Follow these rules:\n"
            "1. Factuality: Base every card strictly on the uploaded text. Do not invent facts.\n"
            "2. Structure:\n"
            "   - Return ONLY a raw JSON block, no markdown formatting (do not wrap in ```json ... ``` blocks, do not add any text before or after the JSON).\n"
            "   - The JSON object must match this exact format:\n"
            "     {\n"
            "       \"flashcards\": [\n"
            "         {\n"
            "           \"front\": \"Question or core term to define...\",\n"
            "           \"back\": \"Concise explanation or answer to memorize (1-2 sentences)...\"\n"
            "         }\n"
            "       ]\n"
            "     }\n"
        )

    @staticmethod
    def build_summary_prompt() -> str:
        """System instruction for generating a comprehensive study summary."""
        return (
            "Create a detailed, high-quality, student-friendly academic summary based ONLY on the source text. "
            "Organize with clear headings, bullet points, bold key terms, and a final key terms review list."
        )

    @staticmethod
    def build_chat_system_instruction(doc_filename: str | None = None, doc_text: str | None = None) -> str:
        """System instruction for dynamic chat messages context."""
        instruction = "You are a helpful academic study assistant. "
        if doc_filename and doc_text:
            instruction += (
                f"You should answer questions using the provided document context:\n"
                f"Original Filename: {doc_filename}\n"
                f"Document Text:\n{doc_text}\n"
            )
        return instruction
