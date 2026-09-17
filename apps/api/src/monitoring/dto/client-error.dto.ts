import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

/** A browser-side failure, as posted by the web app's error boundary. */
export class ClientErrorDto {
  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  stack?: string;

  /** Next's server-side error digest, when the failure happened during render. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  digest?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @IsIn(["error-boundary", "window-error", "unhandled-rejection"])
  source!: "error-boundary" | "window-error" | "unhandled-rejection";

  @IsOptional()
  @IsInt()
  @Min(0)
  occurredAt?: number;
}
