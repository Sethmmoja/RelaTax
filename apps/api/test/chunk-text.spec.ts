import { chunkText } from "../src/ai/chunk-text";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    expect(chunkText("VAT payable for June was KES 36,250.")).toEqual(["VAT payable for June was KES 36,250."]);
  });

  it("returns nothing for empty or whitespace-only input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  \t ")).toEqual([]);
  });

  it("normalises PDF-style whitespace noise before chunking", () => {
    const [chunk] = chunkText("Output   VAT \n  KES 48,250 \r\n\r\n\r\n\r\nInput VAT   KES 12,000");
    expect(chunk).toBe("Output VAT\nKES 48,250\n\nInput VAT KES 12,000");
  });

  it("splits long text at paragraph boundaries, not mid-sentence", () => {
    const para = (n: number) => `Paragraph ${n}. ` + "This sentence pads the paragraph out to a realistic length. ".repeat(6);
    const text = Array.from({ length: 8 }, (_, i) => para(i + 1)).join("\n\n");

    const chunks = chunkText(text, { maxChars: 900, overlapChars: 100 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(900);
      // A chunk that ends mid-word means a boundary cut through a sentence.
      expect(chunk).toMatch(/[.\d)]$/);
    }
  });

  it("carries overlap so a fact on a boundary appears whole in some chunk", () => {
    const filler = "Filler sentence to push the boundary along. ".repeat(30);
    const fact = "Net payable KES 36,250 is due on 20 July 2026.";
    const text = filler + fact + " " + filler;

    const chunks = chunkText(text, { maxChars: 700, overlapChars: 150 });

    expect(chunks.some((c) => c.includes(fact))).toBe(true);
  });

  it("always makes progress on a single unbreakable run of characters", () => {
    const blob = "x".repeat(5000); // no spaces, no sentences, no paragraphs
    const chunks = chunkText(blob, { maxChars: 1000, overlapChars: 100 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("").length).toBeGreaterThanOrEqual(5000);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(1000);
  });
});
