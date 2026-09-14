import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MockAiService } from "./mock-ai.service";
import { toVectorLiteral } from "./embedding.util";
import { chunkText } from "./chunk-text";

@Injectable()
export class AiIndexingService {
  private readonly logger = new Logger(AiIndexingService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: MockAiService
  ) {}

  async indexChunk(input: {
    content: string;
    sourceType: string;
    sourceRef?: string;
    businessId?: string | null;
  }): Promise<{ id: string }> {
    const id = randomUUID();
    const vectorLiteral = toVectorLiteral(this.aiService.embedText(input.content));

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO knowledge_base_chunks (id, "businessId", "sourceType", "sourceRef", content, embedding, "createdAt")
      VALUES (${id}, ${input.businessId ?? null}, ${input.sourceType}, ${input.sourceRef ?? null}, ${input.content}, ${vectorLiteral}::vector, now())
    `);
    return { id };
  }

  async listChunks() {
    return this.prisma.knowledgeBaseChunk.findMany({
      select: { id: true, businessId: true, sourceType: true, sourceRef: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async deleteChunk(id: string): Promise<void> {
    await this.prisma.knowledgeBaseChunk.delete({ where: { id } });
  }

  /**
   * Recomputes every stored embedding from its chunk's content. Required
   * whenever the embedding function changes — query vectors are computed with
   * the current function, so any chunk still carrying a vector from the old one
   * ranks wrongly or not at all. This is also the migration path for swapping
   * to a real embedding model. Content is untouched; only vectors change.
   */
  async reembedAllChunks(): Promise<number> {
    const chunks = await this.prisma.knowledgeBaseChunk.findMany({ select: { id: true, content: true } });
    for (const chunk of chunks) {
      const vectorLiteral = toVectorLiteral(this.aiService.embedText(chunk.content));
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE knowledge_base_chunks SET embedding = ${vectorLiteral}::vector WHERE id = ${chunk.id}
      `);
    }
    this.logger.log(`Re-embedded ${chunks.length} knowledge base chunk(s)`);
    return chunks.length;
  }

  /**
   * The metadata chunk: lets the assistant answer "what documents do I have"
   * and cite a file by name even when its content couldn't be extracted.
   */
  async indexDocument(documentId: string): Promise<void> {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) return;

    await this.indexChunk({
      content: `Document "${document.originalName}" (${document.category}${document.reportType ? `, ${document.reportType}` : ""}) uploaded for this business.`,
      sourceType: "document",
      sourceRef: document.id,
      businessId: document.businessId
    });
  }

  /**
   * Content chunks: the document's actual text, split for retrieval. Each
   * chunk is prefixed with the filename so a retrieved passage is attributable
   * — the mock responder returns chunk text verbatim, and a real model uses
   * the prefix to say which file an answer came from.
   *
   * Uses the same sourceType/sourceRef as the metadata chunk, so the existing
   * delete/replace cleanup in DocumentsService removes both together.
   */
  async indexDocumentContent(documentId: string, text: string): Promise<number> {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) return 0;

    const chunks = chunkText(text);
    for (const [i, chunk] of chunks.entries()) {
      await this.indexChunk({
        content: `From "${document.originalName}" (part ${i + 1} of ${chunks.length}):\n${chunk}`,
        sourceType: "document",
        sourceRef: document.id,
        businessId: document.businessId
      });
    }

    this.logger.log(`Indexed ${chunks.length} content chunk(s) for document ${document.id} (${document.originalName})`);
    return chunks.length;
  }

  /** Removes every chunk derived from a document, so re-indexing never duplicates. */
  async clearDocumentChunks(documentId: string): Promise<void> {
    await this.prisma.knowledgeBaseChunk.deleteMany({ where: { sourceType: "document", sourceRef: documentId } });
  }
}
