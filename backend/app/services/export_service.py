"""Document formatting and exports formatting service."""

import re

class ExportService:
    """Service responsible for cleaning and formatting generated content for download formats."""

    @staticmethod
    def to_plain_text(markdown_text: str) -> str:
        """Strip basic Markdown formatting to return clean plain text."""
        # Strip header markers (#)
        text = re.sub(r'#+\s+', '', markdown_text)
        # Strip bold (**text**) and italic (*text*) markers
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
        text = re.sub(r'\*([^*]+)\*', r'\1', text)
        # Strip inline code ticks
        text = re.sub(r'`([^`]+)`', r'\1', text)
        # Normalize code block lines
        text = text.replace("```", "")
        return text.strip()

    @staticmethod
    def to_formatted_markdown(title: str, content: str) -> str:
        """Format the title and text body as a standard Markdown document."""
        return f"# {title}\n\n{content.strip()}\n"
