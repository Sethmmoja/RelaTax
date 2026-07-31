import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MockAiService } from "./mock-ai.service";
import { toVectorLiteral } from "./embedding.util";

@Injectable()
export class AiIndexingService {
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
}
