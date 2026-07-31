import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedUser } from "../../auth/auth.types";

const AUDITED_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Writes an AuditLog row for every write request that completes successfully.
 * Read-only requests (GET) are not audited here to keep the log signal-dense;
 * downloads are the one GET exception, audited explicitly by DocumentsService
 * and ReportsService instead, since they're a distinct tracked action per spec.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    if (!AUDITED_METHODS.has(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const user: AuthenticatedUser | undefined = request.user;
        const entityType = request.route?.path?.split("/")?.[3] ?? "unknown";
        this.prisma.auditLog
          .create({
            data: {
              userId: user?.id,
              action: `${method} ${request.route?.path ?? request.url}`,
              entityType,
              entityId: request.params?.id ?? request.params?.businessId ?? null,
              metadata: { query: request.query }
            }
          })
          .catch(() => undefined);
      })
    );
  }
}
