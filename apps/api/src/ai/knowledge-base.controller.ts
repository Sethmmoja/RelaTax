import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleName } from "@relatax/types";
import { Roles } from "../common/decorators/roles.decorator";
import { AiIndexingService } from "./ai-indexing.service";
import { CreateKnowledgeBaseChunkDto } from "./dto/create-knowledge-base-chunk.dto";

@ApiTags("knowledge-base")
@ApiBearerAuth()
@Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.FINANCE, RoleName.ACCOUNTANT, RoleName.TAX_CONSULTANT, RoleName.SUPPORT)
@Controller("admin/knowledge-base")
export class KnowledgeBaseController {
  constructor(private aiIndexing: AiIndexingService) {}

  @Get()
  list() {
    return this.aiIndexing.listChunks();
  }

  @Post()
  create(@Body() dto: CreateKnowledgeBaseChunkDto) {
    return this.aiIndexing.indexChunk({
      content: dto.content,
      sourceType: "kb_article",
      businessId: dto.businessId ?? null
    });
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.aiIndexing.deleteChunk(id);
  }
}
