import { LoginUseCase } from '@application/authUseCases/loginUseCase';
import { LogoutUseCase } from '@application/authUseCases/logoutUseCase';
import { RefreshTokenUseCase } from '@application/authUseCases/refreshTokenUseCase';
import { RegisterUserUseCase } from '@application/authUseCases/registerUserUseCase';
import { RequestPasswordResetUseCase } from '@application/authUseCases/requestPasswordResetUseCase';
import { ResetPasswordUseCase } from '@application/authUseCases/resetPasswordUseCase';
import { VerifyOtpUseCase } from '@application/authUseCases/verifyOtpUseCase';
import authConfig from '@auth/config/auth.config';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { JwtService } from '@auth/domain/services/jwtService';
import { OtpCleanupService } from '@auth/domain/services/otpCleanupService';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { TokenBlacklistService } from '@auth/domain/services/tokenBlacklistService';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { PermissionsGuard } from '@auth/security/guards/permissionsGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { JwtStrategy } from '@auth/security/strategies/jwtStrategy';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  OrganizationRepository,
  OtpRepository,
  SessionRepository,
  UserRepository,
} from '@infrastructure/database/repositories';
import { EmailService } from '@infrastructure/externalServices';
import { AuthController } from '@interface/http/routes/auth.controller';
import { PasswordResetController } from '@interface/http/routes/passwordReset.controller';
import { RegisterController } from '@interface/http/routes/register.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const auth = configService.get('auth');
        return {
          secret: auth?.jwt?.secret || 'your-super-secret-jwt-key-change-in-production',
        };
      },
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const auth = configService.get('auth');
        return {
          store: 'redis',
          host: auth?.redis?.host || 'localhost',
          port: auth?.redis?.port || 6379,
          password: auth?.redis?.password,
          db: auth?.redis?.db || 0,
          ttl: auth?.redis?.ttl || 3600, // Usar TTL de la configuración
          max: 1000, // Máximo 1000 items en cache
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule.forFeature(authConfig),
  ],
  controllers: [AuthController, RegisterController, PasswordResetController],
  providers: [
    // Domain services
    AuthenticationService,
    JwtService,
    TokenBlacklistService,
    RateLimitService,
    OtpCleanupService,

    // Security guards
    JwtAuthGuard,
    PermissionsGuard,
    RoleBasedAuthGuard,

    // Passport strategies
    JwtStrategy,

    // Application use cases
    LoginUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
    RegisterUserUseCase,
    RequestPasswordResetUseCase,
    VerifyOtpUseCase,
    ResetPasswordUseCase,

    // Infrastructure services
    PrismaService,
    EmailService,

    // Repositories
    {
      provide: 'UserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'SessionRepository',
      useClass: SessionRepository,
    },
    {
      provide: 'OrganizationRepository',
      useClass: OrganizationRepository,
    },
    {
      provide: 'OtpRepository',
      useClass: OtpRepository,
    },
  ],
  exports: [
    // Exportar servicios para uso en otros módulos
    AuthenticationService,
    JwtService,
    TokenBlacklistService,
    RateLimitService,
    JwtAuthGuard,
    PermissionsGuard,
    RoleBasedAuthGuard,
    JwtStrategy,
  ],
})
export class AuthenticationModule {}
