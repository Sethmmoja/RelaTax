import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { BusinessMemberGuard } from "../common/guards/business-member.guard";
import { AiService } from "./ai.types";
import { BusinessFactsService } from "./business-facts.service";
import { AiChatDto } from "./dto/ai-chat.dto";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(
    private aiService: AiService,
    private businessFacts: BusinessFactsService
  ) {}

  @Public()
  @Post("chat")
  async publicChat(@Body() dto: AiChatDto) {
    return this.aiService.chat(dto.message, { history: dto.history });
  }

  @ApiBearerAuth()
  @UseGuards(BusinessMemberGuard)
  @Post("businesses/:businessId/chat")
  async businessChat(@Param("businessId") businessId: string, @Body() dto: AiChatDto) {
    const extraFacts = await this.businessFacts.buildBusinessFacts(businessId);
    return this.aiService.chat(dto.message, { businessId, extraFacts, history: dto.history });
  }
}
