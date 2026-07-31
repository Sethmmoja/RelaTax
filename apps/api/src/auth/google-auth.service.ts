import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { google } from "googleapis";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

const SCOPES = ["openid", "email", "profile"];

/**
 * "Sign in with Google" for the client portal — reuses the same Google OAuth
 * client already set up for Cloud Drive (Google allows multiple redirect URIs
 * and per-request scopes on one client), so this needed no new Google Cloud
 * project. A first-time Google sign-in auto-creates a User with no usable
 * password (a random bcrypt hash they'll never see) — they simply never use
 * the password login path. Matching by googleId first, then by email, means
 * an existing staff-created client account gets linked on first Google login
 * rather than getting a duplicate account.
 */
@Injectable()
export class GoogleAuthService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService
  ) {}

  private get redirectUri(): string {
    return `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/auth/google/callback`;
  }

  private buildClient() {
    return new google.auth.OAuth2(
      process.env.CLOUD_DRIVE_CLIENT_ID,
      process.env.CLOUD_DRIVE_CLIENT_SECRET,
      this.redirectUri
    );
  }

  getAuthorizationUrl(): string {
    return this.buildClient().generateAuthUrl({
      scope: SCOPES,
      prompt: "select_account"
    });
  }

  async handleCallback(code: string) {
    const client = this.buildClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email || !profile.id) {
      throw new UnauthorizedException("Google account has no accessible email");
    }

    let user = await this.prisma.user.findUnique({ where: { googleId: profile.id } });

    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (user && !user.googleId) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { googleId: profile.id } });
      }
    }

    if (!user) {
      const unusablePassword = randomBytes(32).toString("hex");
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name ?? profile.email.split("@")[0],
          passwordHash: await bcrypt.hash(unusablePassword, 12),
          googleId: profile.id,
          emailVerifiedAt: profile.verified_email ? new Date() : null
        }
      });
    }

    const authenticatedUser = await this.authService.findAuthenticatedUser(user.id);
    if (!authenticatedUser) throw new UnauthorizedException("Could not load account after sign-in");

    return this.authService.issueTokens(authenticatedUser);
  }
}
