import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "./storage/storage.service";
import { AiIndexingService } from "../ai/ai-indexing.service";
import { extractDocumentText } from "./document-text-extractor";

export const DOCUMENT_INDEXING_QUEUE = "document-indexing";

export interface DocumentIndexingJob {
  documentId: string;
}

/**
 * Turns an uploaded file into something the AI assistant can actually read.
 *
 * Runs off the request path because parsing a 25 MB PDF can take seconds and
 * the upload response shouldn't wait on it. It is the single owner of a
 * document's chunks: it wipes whatever exists and rebuilds — metadata chunk
 * plus content chunks — so upload, replace and a manual re-index are all the
 * same idempotent operation, and a retried job never duplicates.
 */
@Processor(DOCUMENT_INDEXING_QUEUE)
export class DocumentIndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentIndexingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private aiIndexing: AiIndexingService
  ) {
    super();
  }

  async process(job: Job<DocumentIndexingJob>): Promise<{ chunks: number; reason?: string }> {
    const { documentId } = job.data;
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });

    // Deleted between enqueue and run — nothing to index, and not an error.
    if (!document) {
      this.logger.log(`Document ${documentId} no longer exists; skipping`);
      return { chunks: 0, reason: "deleted" };
    }

    await this.aiIndexing.clearDocumentChunks(document.id);
    await this.aiIndexing.indexDocument(document.id);

    const buffer = await this.storage.download(document.storageKey);
    const { text, reason } = await extractDocumentText(buffer, document.mimeType);

    if (!text) {
      this.logger.log(`No text extracted from ${document.originalName} (${reason}); metadata chunk only`);
      return { chunks: 0, reason };
    }

    const chunks = await this.aiIndexing.indexDocumentContent(document.id, text);
    return { chunks };
  }
}
