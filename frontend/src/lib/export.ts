/** Utility helpers to export markdown study materials and conversations to PDF, Word, and Markdown. */

function markdownToHtml(markdown: string): string {
  // Safe regex-based markdown to HTML converter for formatted downloads
  return markdown
    .replace(/^### (.*$)/gim, "<h4 style='font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; margin-top: 15px; margin-bottom: 5px; color: #1e293b;'>$1</h4>")
    .replace(/^## (.*$)/gim, "<h3 style='font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 8px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;'>$1</h3>")
    .replace(/^# (.*$)/gim, "<h2 style='font-family: Arial, sans-serif; font-size: 22px; font-weight: 800; margin-top: 25px; margin-bottom: 12px; color: #0f172a;'>$1</h2>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code style='background-color: #f1f5f9; padding: 2px 4px; rounded: 3px; font-family: monospace; font-size: 13px;'>$1</code>")
    .replace(/^- \s*(.*$)/gim, "<li style='font-family: Arial, sans-serif; font-size: 14px; margin-left: 20px; margin-bottom: 5px; color: #334155;'>$1</li>")
    .replace(/^\d+\.\s(.*$)/gim, "<li style='font-family: Arial, sans-serif; font-size: 14px; margin-left: 20px; margin-bottom: 5px; color: #334155;'>$1</li>")
    .split("\n")
    .map(line => {
      if (line.trim().startsWith("<li") || line.trim().startsWith("<h") || line.trim().startsWith("<pre") || line.trim() === "") {
        return line;
      }
      return `<p style='font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 10px;'>${line}</p>`;
    })
    .join("\n");
}

export function exportToMarkdown(title: string, content: string) {
  const filename = `${title.replace(/\s+/g, "_")}.md`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToDocx(title: string, content: string) {
  const filename = `${title.replace(/\s+/g, "_")}.docx`;
  const htmlContent = markdownToHtml(content);
  
  // Word HTML Document Container Envelope
  const docxTemplate = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Arial', sans-serif; padding: 40px; }
      </style>
    </head>
    <body>
      <h1 style="font-size: 26px; color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px;">${title}</h1>
      ${htmlContent}
    </body>
    </html>
  `;

  const blob = new Blob([docxTemplate], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPdf(title: string, content: string) {
  const htmlContent = markdownToHtml(content);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to export to PDF.");
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto; 
            background: #ffffff;
            color: #0f172a;
          }
          h1 {
            font-size: 28px;
            font-weight: 800;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 12px;
            margin-bottom: 25px;
          }
          p {
            line-height: 1.6;
            margin-bottom: 14px;
            color: #334155;
          }
          code {
            background-color: #f1f5f9;
            padding: 2px 4px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
          }
          @media print {
            body { padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div>${htmlContent}</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
