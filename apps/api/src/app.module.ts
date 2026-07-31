import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { validateEnv } from "./config/env.schema";
import { PrismaModule } from "./prisma/prisma.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { AuditLogInterceptor } from "./common/interceptors/audit-log.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { BusinessesModule } from "./businesses/businesses.module";
import { DocumentsModule } from "./documents/documents.module";
import { ReportsModule } from "./reports/reports.module";
import { TaxesModule } from "./taxes/taxes.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { AiModule } from "./ai/ai.module";
import { WhatsAppModule } from "./whatsapp/whatsapp.module";
import { QuickBooksModule } from "./quickbooks/quickbooks.module";
import { CloudDriveModule } from "./cloud-drive/cloud-drive.module";
import { HealthModule } from "./health/health.module";
import { ContactModule } from "./contact/contact.module";
import { InvoicingModule } from "./invoicing/invoicing.module";
import { PayrollModule } from "./payroll/payroll.module";
import { CatalogModule } from "./catalog/catalog.module";
import { PosModule } from "./pos/pos.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Global default: 60 requests/min per IP. Auth endpoints (login, OTP,
    // password reset) apply a much stricter @Throttle() on top of this.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    BullModule.forRoot({ connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" } }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    DocumentsModule,
    ReportsModule,
    TaxesModule,
    NotificationsModule,
    AuditLogModule,
    AiModule,
    WhatsAppModule,
    QuickBooksModule,
    CloudDriveModule,
    HealthModule,
    ContactModule,
    InvoicingModule,
    PayrollModule,
    CatalogModule,
    PosModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter }
  ]
})
export class AppModule {}
