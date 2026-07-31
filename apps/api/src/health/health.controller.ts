import { Controller, Get, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../common/decorators/public.decorator";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private health: HealthService) {}

  @Public()
  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const report = await this.health.check();
    res.status(report.status === "ok" ? 200 : 503);
    return report;
  }
}
