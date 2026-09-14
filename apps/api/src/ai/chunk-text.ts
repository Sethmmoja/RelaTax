export interface ChunkOptions {
  /** Target upper bound per chunk, in characters. */
  maxChars?: number;
  /** Characters carried over from the end of one chunk into the start of the next. */
  overlapChars?: number;
}

const DEFAULTS: Required<ChunkOptions> = { maxChars: 1500, overlapChars: 150 };

/**
 * Splits extracted document text into retrieval-sized chunks.
 *
 * Splitting prefers paragraph boundaries, then sentence boundaries, and only
 * cuts mid-sentence as a last resort — a chunk that ends "the VAT payable for
 * June was" and a next one beginning "KES 48,250" retrieves badly for both
 * halves. The overlap exists for the same reason: a fact straddling a boundary
 * still appears whole in at least one chunk.
 *
 * Whitespace is normalised first because PDF extraction in particular emits
 * runs of spaces and stray newlines that would otherwise fragment sentences.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const { maxChars, overlapChars } = { ...DEFAULTS, ...options };

  const normalised = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalised) return [];
  if (normalised.length <= maxChars) return [normalised];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalised.length) {
    let end = Math.min(cursor + maxChars, normalised.length);

    if (end < normalised.length) {
      const window = normalised.slice(cursor, end);
      // Prefer the last paragraph break, then sentence end, then any space —
      // but only if it leaves a chunk of reasonable size, so a single very long
      // paragraph can't collapse every chunk to a few characters.
      const floor = Math.floor(maxChars * 0.5);
      const candidates = [
        window.lastIndexOf("\n\n"),
        Math.max(window.lastIndexOf(". "), window.lastIndexOf(".\n")) + 1,
        window.lastIndexOf(" ")
      ];
      const cut = candidates.find((c) => c > floor);
      if (cut !== undefined) end = cursor + cut;
    }

    const chunk = normalised.slice(cursor, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= normalised.length) break;
    // Step back for overlap, but never so far that we fail to advance.
    cursor = Math.max(end - overlapChars, cursor + 1);
  }

  return chunks;
}
