import { IsOptional, IsString } from "class-validator";

export class CreateKnowledgeBaseChunkDto {
  @IsString()
  content!: string;

  /** Defaults to a general "kb_article" — pass a business id to scope it privately. */
  @IsOptional()
  @IsString()
  businessId?: string;
}
