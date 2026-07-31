import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { OtpService } from "./otp.service";
import { GoogleAuthService } from "./google-auth.service";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [PassportModule, JwtModule.register({}), EmailModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OtpService, GoogleAuthService],
  exports: [AuthService, OtpService]
})
export class AuthModule {}
