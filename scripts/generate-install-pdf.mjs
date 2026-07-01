import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mdToPdf } from "md-to-pdf";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = `
  @page {
    margin: 20mm 18mm 22mm 18mm;
  }
  html {
    font-size: 11pt;
  }
  body {
    font-family: "Segoe UI", "DejaVu Sans", Arial, sans-serif;
    color: #1a1a1a;
    line-height: 1.55;
  }
  h1 {
    font-size: 22pt;
    margin-bottom: 0.3em;
    border-bottom: 2px solid #0b5cab;
    padding-bottom: 0.25em;
  }
  h2 {
    font-size: 15pt;
    margin-top: 1.4em;
    color: #0b5cab;
    page-break-after: avoid;
  }
  h3 {
    font-size: 12.5pt;
    margin-top: 1.1em;
    page-break-after: avoid;
  }
  h4 {
    font-size: 11.5pt;
    margin-top: 1em;
    page-break-after: avoid;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #c8c8c8;
    padding: 0.45em 0.6em;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f3f6fa;
  }
  code {
    font-family: Consolas, "Courier New", monospace;
    font-size: 0.92em;
    background: #f4f4f4;
    padding: 0.1em 0.35em;
    border-radius: 3px;
  }
  pre {
    background: #f6f8fa;
    border: 1px solid #dde3ea;
    border-radius: 4px;
    padding: 0.75em 1em;
    overflow-x: auto;
    page-break-inside: avoid;
  }
  pre code {
    background: transparent;
    padding: 0;
  }
  blockquote {
    border-left: 4px solid #0b5cab;
    margin: 1em 0;
    padding: 0.4em 0 0.4em 1em;
    background: #f7fafc;
    color: #333;
  }
  ul, ol {
    padding-left: 1.4em;
  }
  li {
    margin: 0.25em 0;
  }
  hr {
    border: none;
    border-top: 1px solid #ddd;
    margin: 1.5em 0;
  }
  a {
    color: #0b5cab;
    text-decoration: none;
  }
`;

const readme = readFileSync(join(root, "README.md"), "utf8");
const settings = readFileSync(join(root, "install-settings.txt"), "utf8");

const markdown = `${readme}

---

## Приложение: настройки за \`settings_schema.json\`

Следващият JSON блок се копира от файла \`install-settings.txt\` в инсталационния архив и се поставя в \`config/settings_schema.json\` според инструкциите по-горе.

\`\`\`json
${settings.trim()}
\`\`\`
`;

const pdf = await mdToPdf(
  { content: markdown },
  {
    dest: join(root, "install.pdf"),
    css,
    pdf_options: {
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "18mm", bottom: "22mm", left: "18mm" },
    },
    launch_options: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
);

if (!pdf?.filename) {
  throw new Error("PDF generation failed");
}

console.log(`Created: ${pdf.filename}`);
