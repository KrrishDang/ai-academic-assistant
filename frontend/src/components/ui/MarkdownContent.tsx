import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

function parseInlineStyles(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={index} className="italic text-foreground/90">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-xl border border-border/80 bg-muted/40 overflow-hidden shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-card/60 text-[11px] font-mono text-muted-foreground font-bold">
        <span>{lang || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-500" />
              <span className="text-green-500 font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-4 overflow-x-auto font-mono text-xs text-foreground leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function TableBlock({ rows }: { rows: string[] }) {
  if (rows.length < 2) return null;

  const headerCells = rows[0]
    .split("|")
    .map((c) => c.trim())
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  // Skip separator row (row 1 containing ---)
  const bodyRows = rows.slice(2).map((row) =>
    row
      .split("|")
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
  );

  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-border/80 shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-muted/60 border-b border-border/80 text-foreground font-bold">
          <tr>
            {headerCells.map((header, idx) => (
              <th key={idx} className="p-3 border-r border-border/40 last:border-r-0">
                {parseInlineStyles(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 bg-card/40">
          {bodyRows.map((rowCells, rIdx) => (
            <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
              {rowCells.map((cell, cIdx) => (
                <td key={cIdx} className="p-3 border-r border-border/40 last:border-r-0 text-muted-foreground font-medium">
                  {parseInlineStyles(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
          return <CodeBlock key={partIndex} code={part.content} lang={part.lang} />;
        }

        const textLines = part.content.split("\n");
        const elements: React.ReactNode[] = [];
        let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
        let currentParagraph: string[] = [];
        let tableRows: string[] = [];

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

        const flushTable = (key: string | number) => {
          if (tableRows.length === 0) return;
          elements.push(<TableBlock key={key} rows={[...tableRows]} />);
          tableRows = [];
        };

        for (let i = 0; i < textLines.length; i++) {
          const line = textLines[i];
          const trimmed = line.trim();

          // Table row detection
          if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            flushParagraph(`para-pre-tbl-${i}`);
            flushList(`list-pre-tbl-${i}`);
            tableRows.push(trimmed);
            continue;
          } else {
            flushTable(`tbl-flush-${i}`);
          }

          // Blockquote / Callouts
          if (trimmed.startsWith("> ")) {
            flushParagraph(`para-pre-bq-${i}`);
            flushList(`list-pre-bq-${i}`);
            const quoteContent = trimmed.substring(2);
            elements.push(
              <blockquote
                key={`bq-${i}`}
                className="my-3 pl-4 py-2 border-l-3 border-[#b4befe] bg-[#b4befe]/[0.05] rounded-r-lg text-xs font-medium text-foreground/90 italic"
              >
                {parseInlineStyles(quoteContent)}
              </blockquote>
            );
            continue;
          }

          // Unordered list
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            flushParagraph(`para-pre-ul-${i}`);
            const contentText = trimmed.substring(2);
            if (currentList && currentList.type === "ul") {
              currentList.items.push(contentText);
            } else {
              flushList(`list-pre-${i}`);
              currentList = { type: "ul", items: [contentText] };
            }
          }
          // Ordered list
          else if (/^\d+\.\s/.test(trimmed)) {
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

            if (trimmed.startsWith("#### ")) {
              flushParagraph(`para-pre-h4-${i}`);
              elements.push(
                <h4
                  key={`h4-${i}`}
                  className="text-xs font-extrabold tracking-tight text-foreground uppercase pt-3 pb-0.5"
                >
                  {parseInlineStyles(trimmed.slice(5))}
                </h4>
              );
            } else if (trimmed.startsWith("### ")) {
              flushParagraph(`para-pre-h3-${i}`);
              elements.push(
                <h3
                  key={`h3-${i}`}
                  className="text-sm font-extrabold tracking-tight text-foreground pt-4 pb-0.5"
                >
                  {parseInlineStyles(trimmed.slice(4))}
                </h3>
              );
            } else if (trimmed.startsWith("## ")) {
              flushParagraph(`para-pre-h2-${i}`);
              elements.push(
                <h2
                  key={`h2-${i}`}
                  className="text-base font-extrabold tracking-tight text-foreground border-b border-border/80 pt-4 pb-1 mb-2"
                >
                  {parseInlineStyles(trimmed.slice(3))}
                </h2>
              );
            } else if (trimmed.startsWith("# ")) {
              flushParagraph(`para-pre-h1-${i}`);
              elements.push(
                <h1
                  key={`h1-${i}`}
                  className="text-lg font-extrabold tracking-tight text-foreground pt-5 pb-1 mb-3"
                >
                  {parseInlineStyles(trimmed.slice(2))}
                </h1>
              );
            } else if (trimmed) {
              currentParagraph.push(trimmed);
            } else {
              flushParagraph(`para-pre-space-${i}`);
              elements.push(<div key={`space-${i}`} className="h-1.5" />);
            }
          }
        }
        flushTable(`tbl-final-${partIndex}`);
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
