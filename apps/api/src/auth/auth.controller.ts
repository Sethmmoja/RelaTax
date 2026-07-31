import { Body, Controller, Delete, Get, Logger, Param, Post, Query, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedUser } from "./auth.types";
import { AuthService } from "./auth.service";
import { OtpService } from "./otp.service";
import { GoogleAuthService } from "./google-auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { OtpRequestDto, OtpVerifyDto } from "./dto/otp.dto";
import { ConfirmPasswordResetDto, RequestPasswordResetDto } from "./dto/password-reset.dto";
import { ConfirmEmailVerificationDto } from "./dto/email-verification.dto";
import { DisableMfaDto, EnableMfaDto } from "./dto/mfa.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private otpService: OtpService,
    private googleAuthService: GoogleAuthService
  ) {}

  /** Full-page redirect target for a "Continue with Google" link/button. */
  @Public()
  @Get("google")
  redirectToGoogle(@Res() res: Response) {
    res.redirect(this.googleAuthService.getAuthorizationUrl());
  }

  /**
   * Google redirects the user's real browser here after consent. Tokens are
   * passed to the frontend via the URL fragment (#...), not a query string —
   * fragments are never sent to any server (ours or Google's) on the
   * redirect, so they can't leak into server access logs or Referer headers.
   */
  @Public()
  @Get("google/callback")
  async googleCallback(@Query("code") code: string, @Res() res: Response) {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    try {
      const tokens = await this.googleAuthService.handleCallback(code);
      return res.redirect(`${appUrl}/auth/google/callback#accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
    } catch (error) {
      this.logger.error(`Google sign-in failed: ${(error as Error).message}`);
      return res.redirect(`${appUrl}/login?error=google_sign_in_failed`);
    }
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const user = await this.authService.validateCredentials(dto.email, dto.password);

    if (user.mfaEnabled && user.phone) {
      await this.otpService.requestOtp(user.phone);
      return { mfaRequired: true, phone: user.phone };
    }

    return this.authService.issueTokens(user, { userAgent: req.headers["user-agent"] });
  }

  @Public()
  @Post("refresh")
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("otp/request")
  async requestOtp(@Body() dto: OtpRequestDto) {
    await this.otpService.requestOtp(dto.phone);
    return { message: "OTP sent" };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("otp/verify")
  async verifyOtp(@Body() dto: OtpVerifyDto, @Req() req: Request) {
    const valid = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!valid) return { verified: false, tokens: null };

    const user = await this.authService.findAuthenticatedUserByPhone(dto.phone);
    if (!user) return { verified: true, tokens: null };

    return { verified: true, tokens: await this.authService.issueTokens(user, { userAgent: req.headers["user-agent"] }) };
  }

  @ApiBearerAuth()
  @Post("mfa/enable")
  async enableMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: EnableMfaDto) {
    await this.authService.enableMfa(user.id, dto.phone, dto.code);
    return { mfaEnabled: true };
  }

  @ApiBearerAuth()
  @Post("mfa/disable")
  async disableMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: DisableMfaDto) {
    await this.authService.disableMfa(user.id, dto.password);
    return { mfaEnabled: false };
  }

  @ApiBearerAuth()
  @Get("sessions")
  async listSessions(@CurrentUser() user: AuthenticatedUser) {
    const sessions = await this.authService.listSessions(user.id);
    return sessions.map((s) => ({ ...s, current: s.id === user.sessionId }));
  }

  @ApiBearerAuth()
  @Delete("sessions/:id")
  async revokeSession(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.authService.revokeSession(user.id, id);
    return { revoked: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("password-reset/request")
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { message: "If that email exists, a reset link has been sent." };
  }

  @Public()
  @Post("password-reset/confirm")
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: "Password updated. You can now sign in." };
  }

  @ApiBearerAuth()
  @Post("email-verification/request")
  async requestEmailVerification(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.requestEmailVerification(user.id);
    return { message: "Verification email sent." };
  }

  @Public()
  @Post("email-verification/confirm")
  async confirmEmailVerification(@Body() dto: ConfirmEmailVerificationDto) {
    await this.authService.confirmEmailVerification(dto.token);
    return { message: "Email verified." };
  }
}
