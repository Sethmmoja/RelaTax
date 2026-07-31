export interface RetrievedChunk {
  id: string;
  content: string;
  sourceType: string;
  score: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  businessId?: string;
  extraFacts?: string[];
  history?: ChatMessage[];
}

export interface ChatResult {
  answer: string;
  sources: RetrievedChunk[];
  lowConfidence: boolean;
}

/**
 * Swappable seam: Phase 1 implementation does real pgvector retrieval with a
 * deterministic local embedding (no external calls). Phase 2 swaps embedText's
 * hashing implementation for a real embedding model and chat's templating for
 * a real LLM call — callers (WhatsApp engine, portal, website widget) never change.
 */
export abstract class AiService {
  abstract embedText(text: string): number[];
  abstract retrieve(query: string, businessId: string | null, topK?: number): Promise<RetrievedChunk[]>;
  abstract chat(question: string, context: ChatContext): Promise<ChatResult>;
}
