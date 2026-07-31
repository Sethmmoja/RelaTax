import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { RoleName } from "@relatax/types";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { OtpService } from "./otp.service";
import { AuthenticatedUser, JwtPayload } from "./auth.types";

type UserWithRelations = Awaited<ReturnType<AuthService["loadUser"]>>;

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
    private otpService: OtpService
  ) {}

  async validateCredentials(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roleAssignments: { include: { role: true } }, businessMemberships: true, staffAssignments: true }
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    return this.toAuthenticatedUser(user);
  }

  /** Creates a new tracked session (a new "device" entry) and issues its first token pair. */
  async issueTokens(user: AuthenticatedUser, meta?: { userAgent?: string }) {
    const session = await this.prisma.userSession.create({
      data: { userId: user.id, refreshTokenHash: "", userAgent: meta?.userAgent?.slice(0, 255) }
    });
    const tokens = this.signTokenPair(user, session.id);
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: this.hashToken(tokens.refreshToken) }
    });
    return tokens;
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Tokens issued before session tracking existed have no sid — let them
    // finish their natural 30-day lifetime unchecked rather than breaking them.
    if (payload.sid) {
      const session = await this.prisma.userSession.findUnique({ where: { id: payload.sid } });
      if (!session || session.revokedAt) throw new UnauthorizedException("Session has been revoked");
      if (session.refreshTokenHash !== this.hashToken(refreshToken)) {
        // Reused/stale refresh token — treat as possible theft and kill the session.
        await this.prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        throw new UnauthorizedException("Session has been revoked");
      }
    }

    const user = await this.findAuthenticatedUser(payload.sub);
    if (!user) throw new UnauthorizedException("User not found");

    if (payload.sid) {
      const tokens = this.signTokenPair(user, payload.sid);
      await this.prisma.userSession.update({
        where: { id: payload.sid },
        data: { refreshTokenHash: this.hashToken(tokens.refreshToken), lastUsedAt: new Date() }
      });
      return tokens;
    }

    return this.issueTokens(user);
  }

  async findActiveSession(sessionId: string) {
    const session = await this.prisma.userSession.findUnique({ where: { id: sessionId } });
    return session && !session.revokedAt ? session : null;
  }

  async listSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastUsedAt: "desc" },
      select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true }
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.userSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new BadRequestException("Session not found");
    await this.prisma.userSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }

  async enableMfa(userId: string, phone: string, code: string): Promise<void> {
    const valid = await this.otpService.verifyOtp(phone, code);
    if (!valid) throw new BadRequestException("Invalid or expired code");
    await this.prisma.user.update({ where: { id: userId }, data: { phone, mfaEnabled: true } });
  }

  async disableMfa(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ForbiddenException("Incorrect password");
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false } });
  }

  private signTokenPair(user: AuthenticatedUser, sessionId: string) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isStaff: user.isStaff,
      roles: user.roles,
      sid: sessionId
    };
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL ?? "15m"
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_TTL ?? "30d"
    });
    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async findAuthenticatedUser(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.loadUser({ id: userId });
    return user ? this.toAuthenticatedUser(user) : null;
  }

  async findAuthenticatedUserByPhone(phone: string): Promise<AuthenticatedUser | null> {
    const user = await this.loadUser({ phone });
    return user ? this.toAuthenticatedUser(user) : null;
  }

  /** Always succeeds from the caller's perspective, whether or not the email exists. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = randomBytes(32).toString("hex");
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) }
    });

    await this.emailService.send({
      to: user.email,
      subject: "Reset your RelaTax password",
      body: `Reset your password: ${APP_URL}/reset-password?token=${token}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { passwordResetToken: token } });
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null }
    });
  }

  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) return;

    const token = randomBytes(32).toString("hex");
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)
      }
    });

    await this.emailService.send({
      to: user.email,
      subject: "Verify your RelaTax email",
      body: `Verify your email: ${APP_URL}/verify-email?token=${token}\n\nThis link expires in 24 hours.`
    });
  }

  async confirmEmailVerification(token: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { emailVerificationToken: token } });
    if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), emailVerificationToken: null, emailVerificationExpiresAt: null }
    });
  }

  private loadUser(where: { id: string } | { phone: string }) {
    return this.prisma.user.findUnique({
      where: where as any,
      include: { roleAssignments: { include: { role: true } }, businessMemberships: true, staffAssignments: true }
    });
  }

  private toAuthenticatedUser(user: NonNullable<UserWithRelations>): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isStaff: user.isStaff,
      roles: user.roleAssignments.map((ra) => ra.role.name as RoleName),
      businessIds: user.businessMemberships.map((bm) => bm.businessId),
      staffBusinessIds: user.staffAssignments.map((sa) => sa.businessId),
      mfaEnabled: user.mfaEnabled,
      phone: user.phone
    };
  }
}
