import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { captureException } from "../../monitoring/sentry";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : { message: "Internal server error" };
    const message = typeof body === "string" ? body : (body as any).message ?? body;

    // 5xx are unexpected — log the stack and forward to error tracking (if configured).
    // 4xx are expected client-facing rejections, logged at a lower level with no stack noise.
    if (statusCode >= 500) {
      const error = exception instanceof Error ? exception : new Error(String(message));
      this.logger.error(`${request.method} ${request.originalUrl} -> ${statusCode}: ${error.message}`, error.stack);
      captureException(exception);
    } else {
      this.logger.warn(`${request.method} ${request.originalUrl} -> ${statusCode}: ${message}`);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: isHttp ? exception.name : "InternalServerError"
    });
  }
}
