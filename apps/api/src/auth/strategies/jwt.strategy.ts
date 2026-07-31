import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../auth.service";
import { JwtPayload } from "../auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me"
    });
  }

  async validate(payload: JwtPayload) {
    // Tokens issued before session tracking existed have no sid — accepted as-is
    // until they naturally expire; tokens with a sid must point at a live session,
    // so revoking a session blocks its access token immediately, not just on refresh.
    if (payload.sid) {
      const session = await this.authService.findActiveSession(payload.sid);
      if (!session) return null;
    }

    const user = await this.authService.findAuthenticatedUser(payload.sub);
    if (!user) return null;
    return { ...user, sessionId: payload.sid };
  }
}
