const DIMENSIONS = 1536;

/**
 * Deterministic feature-hashing "embedding" — no external model call.
 * Good enough to make retrieval genuinely rank on lexical overlap for a Phase 1
 * demo; Phase 2 replaces this with a real embedding model behind the same signature.
 */
export function hashEmbed(text: string): number[] {
  const vector = new Array(DIMENSIONS).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    }
    vector[hash % DIMENSIONS] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
