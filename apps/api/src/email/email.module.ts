import { Logger, Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { MockEmailService } from "./mock-email.service";
import { SmtpEmailService } from "./smtp-email.service";

@Module({
  providers: [
    MockEmailService,
    SmtpEmailService,
    {
      provide: EmailService,
      // Real SMTP only when explicitly selected and fully configured (host + credentials);
      // otherwise the offline mock so a half-entered credential can't silently break sending.
      useFactory: (mock: MockEmailService, smtp: SmtpEmailService) => {
        const useSmtp =
          process.env.EMAIL_PROVIDER === "smtp" &&
          !!process.env.SMTP_HOST &&
          !!process.env.SMTP_USER &&
          !!process.env.SMTP_PASS;
        new Logger("EmailModule").log(`Email provider: ${useSmtp ? "smtp" : "mock"}`);
        return useSmtp ? smtp : mock;
      },
      inject: [MockEmailService, SmtpEmailService]
    }
  ],
  exports: [EmailService]
})
export class EmailModule {}
