import { hashEmbed, toVectorLiteral } from "../src/ai/embedding.util";

describe("hashEmbed", () => {
  it("produces a unit-normalized 1536-dimension vector", () => {
    const vector = hashEmbed("VAT filing is due on the 20th");
    expect(vector).toHaveLength(1536);
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it("gives near-identical text a higher cosine similarity than unrelated text", () => {
    const base = hashEmbed("VAT filing is due on the 20th of the month");
    const similar = hashEmbed("VAT filing due date is the 20th of the month");
    const unrelated = hashEmbed("Nairobi weather forecast for the weekend");

    const cosine = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);

    expect(cosine(base, similar)).toBeGreaterThan(cosine(base, unrelated));
  });

  it("serializes to a pgvector literal", () => {
    expect(toVectorLiteral([1, 2, 3])).toBe("[1,2,3]");
  });
});
