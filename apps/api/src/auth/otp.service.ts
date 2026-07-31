import { Injectable, Logger } from "@nestjs/common";
import { randomInt } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

const OTP_TTL_MS = 5 * 60 * 1000;

/**
 * Shared by WhatsApp login and portal MFA-ready login. Phase 1 "delivery" is a
 * log line; Phase 2 wires this to the real WhatsApp/SMS transport without
 * changing this service's contract.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private prisma: PrismaService) {}

  async requestOtp(phone: string): Promise<void> {
    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.prisma.whatsAppSession.upsert({
      where: { phone },
      create: { phone, otpCode: code, otpExpiresAt: expiresAt, state: "AWAITING_OTP" },
      update: { otpCode: code, otpExpiresAt: expiresAt, state: "AWAITING_OTP" }
    });

    this.logger.log(`OTP for ${phone}: ${code} (expires ${expiresAt.toISOString()})`);
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const session = await this.prisma.whatsAppSession.findUnique({ where: { phone } });
    if (!session || !session.otpCode || session.otpCode !== code) return false;
    if (!session.otpExpiresAt || session.otpExpiresAt < new Date()) return false;

    await this.prisma.whatsAppSession.update({
      where: { phone },
      data: { otpCode: null, otpExpiresAt: null }
    });
    return true;
  }
}
