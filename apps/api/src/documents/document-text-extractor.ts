import { Logger } from "@nestjs/common";

const logger = new Logger("DocumentTextExtractor");

/**
 * Longest text we'll hand to the indexer, in characters. A 25 MB scanned
 * statement can decode to megabytes of text; past this point additional
 * chunks add retrieval noise, not answers, and the embedding work is wasted.
 */
const MAX_TEXT_CHARS = 400_000;

export interface ExtractionResult {
  /** Plain text, or null when the format has no text layer we can read. */
  text: string | null;
  /** Why text is null — surfaced in logs so a silent "no content" is explainable. */
  reason?: "unsupported-format" | "no-text-layer" | "encrypted" | "parse-failed";
}

/**
 * Pulls the readable text out of an uploaded document so the AI assistant can
 * answer from what the file actually says, not just its filename.
 *
 * Formats match the upload allow-list in DocumentsController. Parsers are
 * loaded lazily and independently: a failure in one format's library affects
 * only documents of that format, never API startup or the other formats.
 */
export async function extractDocumentText(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  try {
    switch (mimeType) {
      case "application/pdf":
        return finish(await extractPdf(buffer));

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return finish(await extractDocx(buffer));

      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      case "application/vnd.ms-excel":
        return finish(await extractSpreadsheet(buffer));

      // Images have no text layer without OCR, and legacy .doc is a binary
      // format mammoth doesn't read. Both keep their metadata chunk (name,
      // category) so the assistant still knows the document exists.
      case "image/jpeg":
      case "image/png":
      case "application/msword":
        return { text: null, reason: "unsupported-format" };

      default:
        return { text: null, reason: "unsupported-format" };
    }
  } catch (error) {
    // Payslips are deliberately encrypted with the employee's National ID so
    // only they can open them. Indexing their contents would undo that, so an
    // encrypted file keeps its metadata chunk only — and is reported as such
    // rather than as a parser bug.
    if (isPasswordProtected(error)) return { text: null, reason: "encrypted" };
    logger.warn(`Text extraction failed for ${mimeType}: ${(error as Error).message}`);
    return { text: null, reason: "parse-failed" };
  }
}

/** pdf.js raises PasswordException ("No password given") for an encrypted PDF. */
function isPasswordProtected(error: unknown): boolean {
  const e = error as { name?: string; message?: string };
  return e?.name === "PasswordException" || /password/i.test(e?.message ?? "");
}

function finish(text: string): ExtractionResult {
  const cleaned = text.replace(/\u0000/g, "").trim();
  if (!cleaned) return { text: null, reason: "no-text-layer" };
  return { text: cleaned.length > MAX_TEXT_CHARS ? cleaned.slice(0, MAX_TEXT_CHARS) : cleaned };
}

/**
 * pdf-parse v2 (a maintained wrapper over current pdf.js). v1 was tried first
 * and rejected: it bundles a 2018 pdf.js that fails with "bad XRef entry" on
 * files produced by pdfkit 0.15 — which is what generates every payslip,
 * invoice and report in this system, so it would have failed on exactly the
 * documents clients ask about most.
 */
async function extractPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  // pdf.js is strict about receiving a Uint8Array, not a Node Buffer.
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const { text } = await parser.getText();
    return text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

/**
 * Spreadsheets become one line per row, cells joined by tabs, each sheet
 * headed by its name. That keeps a row's figures on the same line as its
 * label — "PAYE  96,400" — which is what a question like "what was PAYE?"
 * needs to retrieve.
 */
async function extractSpreadsheet(buffer: Buffer): Promise<string> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const lines: string[] = [];
  workbook.eachSheet((sheet) => {
    lines.push(`Sheet: ${sheet.name}`);
    sheet.eachRow((row) => {
      const cells = (row.values as unknown[])
        .slice(1) // exceljs row.values is 1-indexed; index 0 is always empty
        .map(cellToText)
        .filter((c) => c !== "");
      if (cells.length) lines.push(cells.join("\t"));
    });
    lines.push("");
  });
  return lines.join("\n");
}

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const v = value as { result?: unknown; richText?: { text: string }[]; text?: string; hyperlink?: string };
    if (v.richText) return v.richText.map((r) => r.text).join("");
    if (v.result !== undefined) return String(v.result); // formula cell: use the cached result
    if (v.text !== undefined) return String(v.text);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return "";
  }
  return String(value);
}
