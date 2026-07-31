import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AiService, ChatContext, ChatResult, RetrievedChunk } from "./ai.types";
import { hashEmbed, toVectorLiteral } from "./embedding.util";

const CONFIDENCE_THRESHOLD = 0.15;

@Injectable()
export class MockAiService extends AiService {
  private readonly logger = new Logger(MockAiService.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  embedText(text: string): number[] {
    return hashEmbed(text);
  }

  async retrieve(query: string, businessId: string | null, topK = 5): Promise<RetrievedChunk[]> {
    const vectorLiteral = toVectorLiteral(this.embedText(query));

    const rows = await this.prisma.$queryRaw<
      { id: string; content: string; sourceType: string; score: number }[]
    >(Prisma.sql`
      SELECT id, content, "sourceType",
             1 - (embedding <=> ${vectorLiteral}::vector) AS score
      FROM knowledge_base_chunks
      WHERE "businessId" IS NULL ${businessId ? Prisma.sql`OR "businessId" = ${businessId}` : Prisma.empty}
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `);

    return rows.map((r) => ({ id: r.id, content: r.content, sourceType: r.sourceType, score: r.score }));
  }

  async chat(question: string, context: ChatContext): Promise<ChatResult> {
    const chunks = await this.retrieve(question, context.businessId ?? null);
    const relevant = chunks.filter((c) => c.score >= CONFIDENCE_THRESHOLD);

    if (relevant.length === 0 && !context.extraFacts?.length) {
      return {
        answer:
          "I don't have grounded information to answer that confidently. I can connect you with a RelaTax consultant or you can book a consultation.",
        sources: [],
        lowConfidence: true
      };
    }

    const factLines = context.extraFacts?.length ? `\n\n${context.extraFacts.join("\n")}` : "";
    const answer = [
      relevant[0]?.content ?? "",
      relevant.length > 1 ? `\n\nRelated: ${relevant[1].content}` : "",
      factLines
    ]
      .join("")
      .trim();

    return { answer, sources: relevant, lowConfidence: false };
  }
}
