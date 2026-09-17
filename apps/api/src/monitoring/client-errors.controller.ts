import { Body, Controller, HttpCode, Logger, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { ClientErrorDto } from "./dto/client-error.dto";
import { captureClientError } from "./sentry";

/**
 * The browser has no Sentry SDK of its own — that's 30–50 KB in every
 * visitor's bundle and a second DSN to manage. Instead the web app posts
 * failures here and they land in the same Sentry project as API errors,
 * tagged as client-side. When no DSN is configured they're logged, so a
 * production error is never silently lost.
 *
 * Public because the error boundary may fire before or without a session.
 * Tightly throttled and size-capped because it is public.
 */
@ApiTags("monitoring")
@Controller("client-errors")
export class ClientErrorsController {
  private readonly logger = new Logger("ClientError");

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(202)
  @Post()
  report(@Body() dto: ClientErrorDto, @Req() req: Request) {
    const userAgent = req.headers["user-agent"]?.slice(0, 300);
    this.logger.warn(`[${dto.source}] ${dto.name ?? "Error"}: ${dto.message} at ${dto.url ?? "?"}`);
    captureClientError(dto, { userAgent });
    return { received: true };
  }
}
