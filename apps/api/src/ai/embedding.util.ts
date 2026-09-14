const DIMENSIONS = 1536;

/**
 * English function words that carry no topical signal. Without this filter a
 * short chunk sharing "the", "is", "of" and "on" with a question outranks a
 * long chunk sharing its actual subject — observed directly: a lease agreement
 * containing "landlord", "security deposit" and "lease" ranked below a generic
 * VAT sentence for the question "who is the landlord and how much is the
 * security deposit on the lease?", because the VAT chunk was shorter and
 * unit-normalisation rewards brevity.
 *
 * Deliberately short and conservative: nothing here could plausibly be a term
 * someone searches for in an accounting context.
 */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "can", "do", "does", "for", "from",
  "had", "has", "have", "he", "her", "his", "how", "i", "if", "in", "into", "is", "it", "its", "me",
  "much", "my", "of", "on", "or", "our", "she", "so", "than", "that", "the", "their", "them", "then",
  "there", "these", "they", "this", "those", "to", "was", "we", "were", "what", "when", "where",
  "which", "who", "why", "will", "with", "would", "you", "your"
]);

/**
 * Deterministic feature-hashing "embedding" — no external model call. Ranks
 * on overlap of content words, which is what lexical retrieval needs. A real
 * embedding model slots in behind this same signature; when it does, every
 * stored vector must be recomputed (see AiIndexingService.reembedAllChunks).
 */
export function hashEmbed(text: string): number[] {
  const vector = new Array(DIMENSIONS).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));

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
