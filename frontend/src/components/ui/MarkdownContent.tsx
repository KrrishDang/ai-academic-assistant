import React from "react";

function parseInlineStyles(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="bg-primary/5 text-primary border border-primary/10 px-1.5 py-0.5 rounded font-mono text-xs font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

interface MarkdownContentProps {
  content: string;
  showCursor?: boolean;
}

export function MarkdownContent({ content, showCursor = false }: MarkdownContentProps) {
  const parts: { type: "text" | "code"; content: string; lang?: string }[] = [];
  let currentText = "";
  const lines = content.split("\n");

  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        parts.push({ type: "code", content: codeLines.join("\n"), lang: codeLang });
        codeLines = [];
        inCodeBlock = false;
      } else {
        if (currentText) {
          parts.push({ type: "text", content: currentText });
          currentText = "";
        }
        inCodeBlock = true;
        codeLang = line.replace("```", "").trim();
      }
    } else {
      if (inCodeBlock) {
        codeLines.push(line);
      } else {
        currentText += line + "\n";
      }
    }
  }
  if (inCodeBlock && codeLines.length > 0) {
    parts.push({ type: "code", content: codeLines.join("\n"), lang: codeLang });
  } else if (currentText) {
    parts.push({ type: "text", content: currentText });
  }

  return (
    <div className="space-y-3 text-foreground leading-relaxed text-sm">
      {parts.map((part, partIndex) => {
        if (part.type === "code") {
          return (
            <pre
              key={partIndex}
              className="bg-muted border border-border rounded-lg p-3 overflow-x-auto font-mono text-[11px] sm:text-xs leading-relaxed my-2"
            >
              <code className="text-foreground">{part.content}</code>
            </pre>
          );
        }

        const textLines = part.content.split("\n");
        const elements: React.ReactNode[] = [];
        let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
        let currentParagraph: string[] = [];

        const flushList = (key: string | number) => {
          if (!currentList) return;
          const Tag = currentList.type;
          elements.push(
            <Tag
              key={key}
              className={
                currentList.type === "ul"
                  ? "list-disc pl-5 space-y-1.5 my-2"
                  : "list-decimal pl-5 space-y-1.5 my-2"
              }
            >
              {currentList.items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-muted-foreground font-medium pl-0.5">
                  {parseInlineStyles(item)}
                </li>
              ))}
            </Tag>
          );
          currentList = null;
        };

        const flushParagraph = (key: string | number) => {
          if (currentParagraph.length === 0) return;
          const isLastElement = partIndex === parts.length - 1;
          elements.push(
            <p key={key} className="text-muted-foreground font-medium leading-relaxed my-2">
              {parseInlineStyles(currentParagraph.join(" "))}
              {isLastElement && showCursor && (
                <span className="inline-block h-3.5 w-1.5 bg-primary ml-1 animate-pulse rounded-sm align-middle" />
              )}
            </p>
          );
          currentParagraph = [];
        };

        for (let i = 0; i < textLines.length; i++) {
          const line = textLines[i];
          const trimmed = line.trim();

          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            flushParagraph(`para-pre-ul-${i}`);
            const contentText = trimmed.substring(2);
            if (currentList && currentList.type === "ul") {
              currentList.items.push(contentText);
            } else {
              flushList(`list-pre-${i}`);
              currentList = { type: "ul", items: [contentText] };
            }
          } else if (/^\d+\.\s/.test(trimmed)) {
            flushParagraph(`para-pre-ol-${i}`);
            const match = trimmed.match(/^\d+\.\s(.*)/);
            const contentText = match ? match[1] : trimmed;
            if (currentList && currentList.type === "ol") {
              currentList.items.push(contentText);
            } else {
              flushList(`list-pre-${i}`);
              currentList = { type: "ol", items: [contentText] };
            }
          } else {
            flushList(`list-flush-${i}`);

            if (trimmed.startsWith("### ")) {
              flushParagraph(`para-pre-h4-${i}`);
              elements.push(
                <h4
                  key={`h4-${i}`}
                  className="text-sm font-bold tracking-tight text-foreground pt-3 pb-0.5"
                >
                  {parseInlineStyles(trimmed.slice(4))}
                </h4>
              );
            } else if (trimmed.startsWith("## ")) {
              flushParagraph(`para-pre-h3-${i}`);
              elements.push(
                <h3
                  key={`h3-${i}`}
                  className="text-base font-bold tracking-tight text-foreground border-b border-border/80 pt-4 pb-1 mb-2"
                >
                  {parseInlineStyles(trimmed.slice(3))}
                </h3>
              );
            } else if (trimmed.startsWith("# ")) {
              flushParagraph(`para-pre-h2-${i}`);
              elements.push(
                <h2
                  key={`h2-${i}`}
                  className="text-lg font-extrabold tracking-tight text-foreground pt-5 pb-1 mb-3"
                >
                  {parseInlineStyles(trimmed.slice(2))}
                </h2>
              );
            } else if (trimmed) {
              currentParagraph.push(trimmed);
            } else {
              flushParagraph(`para-pre-space-${i}`);
              elements.push(<div key={`space-${i}`} className="h-1.5" />);
            }
          }
        }
        flushList(`list-final-${partIndex}`);
        flushParagraph(`para-final-${partIndex}`);
        return elements;
      })}
      {parts.length === 0 && showCursor && (
        <span className="inline-block h-3.5 w-1.5 bg-primary animate-pulse rounded-sm align-middle" />
      )}
    </div>
  );
}
