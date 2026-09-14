import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { extractDocumentText } from "../src/documents/document-text-extractor";

/**
 * Fixtures are generated with the same libraries the API already uses to
 * render payslips and reports, so these tests exercise real parsers against
 * real files rather than mocking the extraction away.
 */

async function makePdf(lines: string[]): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument();
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve) => doc.on("end", () => resolve()));
  for (const line of lines) doc.text(line).moveDown(0.5);
  doc.end();
  await done;
  return Buffer.concat(chunks);
}

async function makeXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PAYE July 2026");
  ws.addRow(["Employee", "Gross", "PAYE"]);
  ws.addRow(["Faith Njeri", 85000, 15269.6]);
  ws.addRow(["Brian Otieno", 45000, 4499.6]);
  ws.addRow(["Total", { formula: "SUM(B2:B3)", result: 130000 }, { formula: "SUM(C2:C3)", result: 19769.2 }]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("extractDocumentText", () => {
  it("reads the text layer of a PDF", async () => {
    const pdf = await makePdf(["VAT Return June 2026", "Output VAT KES 48,250", "Net payable KES 36,250"]);

    const { text, reason } = await extractDocumentText(pdf, "application/pdf");

    expect(reason).toBeUndefined();
    expect(text).toContain("VAT Return June 2026");
    expect(text).toContain("36,250");
  });

  it("flattens a spreadsheet to one row per line so a label stays with its figure", async () => {
    const xlsx = await makeXlsx();

    const { text } = await extractDocumentText(
      xlsx,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    expect(text).toContain("Sheet: PAYE July 2026");
    // Label and its numbers on the same line — that's what retrieval needs.
    expect(text).toMatch(/Faith Njeri\t85000\t15269\.6/);
    // Formula cells resolve to their cached result, not the formula string.
    expect(text).toMatch(/Total\t130000\t19769\.2/);
    expect(text).not.toContain("SUM(");
  });

  it("declares images unsupported rather than returning empty text silently", async () => {
    const { text, reason } = await extractDocumentText(Buffer.from("not really an image"), "image/png");
    expect(text).toBeNull();
    expect(reason).toBe("unsupported-format");
  });

  it("reports a parse failure instead of throwing on a corrupt file", async () => {
    const { text, reason } = await extractDocumentText(Buffer.from("this is not a pdf"), "application/pdf");
    expect(text).toBeNull();
    expect(reason).toBe("parse-failed");
  });

  it("strips NUL bytes that PDF extraction can emit", async () => {
    // Exercised through the spreadsheet path, where we control the cell value.
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("S").addRow(["before\u0000after"]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());

    const { text } = await extractDocumentText(
      buf,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    expect(text).toContain("beforeafter");
    expect(text).not.toContain("\u0000");
  });
});
