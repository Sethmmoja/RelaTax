import { Logger, Module } from "@nestjs/common";
import { AiService } from "./ai.types";
import { MockAiService } from "./mock-ai.service";
import { AnthropicAiService } from "./anthropic-ai.service";
import { AiIndexingService } from "./ai-indexing.service";
import { BusinessFactsService } from "./business-facts.service";
import { AiController } from "./ai.controller";
import { KnowledgeBaseController } from "./knowledge-base.controller";

@Module({
  controllers: [AiController, KnowledgeBaseController],
  providers: [
    MockAiService,
    AnthropicAiService,
    AiIndexingService,
    BusinessFactsService,
    {
      provide: AiService,
      // Use real Claude generation only when explicitly enabled and a key is present;
      // otherwise fall back to the offline mock so local dev works with no credentials.
      useFactory: (mock: MockAiService, anthropic: AnthropicAiService) => {
        const useAnthropic = process.env.AI_PROVIDER === "anthropic" && !!process.env.ANTHROPIC_API_KEY;
        new Logger("AiModule").log(`AI generation provider: ${useAnthropic ? "anthropic (Claude)" : "mock"}`);
        return useAnthropic ? anthropic : mock;
      },
      inject: [MockAiService, AnthropicAiService]
    }
  ],
  exports: [AiService, AiIndexingService, BusinessFactsService]
})
export class AiModule {}
