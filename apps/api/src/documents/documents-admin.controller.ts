import { Controller, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleName } from "@relatax/types";
import { Roles } from "../common/decorators/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentsService } from "./documents.service";

// RolesGuard is registered globally in AppModule; @Roles alone enforces it.
@ApiTags("documents")
@ApiBearerAuth()
@Controller("admin/documents")
export class DocumentsAdminController {
  constructor(
    private prisma: PrismaService,
    private documentsService: DocumentsService
  ) {}

  /**
   * Queues every document (or one business's) for text extraction. Exists for
   * the backlog: documents uploaded before content indexing shipped have only
   * a metadata chunk, and this is how they get their text read without being
   * re-uploaded. Safe to run repeatedly — the worker rebuilds rather than
   * appends.
   */
  @Roles(RoleName.SUPER_ADMIN)
  @Post("reindex")
  async reindex(@Query("businessId") businessId?: string) {
    const documents = await this.prisma.document.findMany({
      where: businessId ? { businessId } : undefined,
      select: { id: true }
    });

    for (const { id } of documents) {
      await this.documentsService.enqueueIndexing(id);
    }

    return { queued: documents.length };
  }
}
