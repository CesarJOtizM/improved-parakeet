import {
  GetAuditLogUseCase,
  GetAuditLogsUseCase,
  GetEntityHistoryUseCase,
  GetUserActivityUseCase,
} from '@application/auditUseCases';
import { LoginUseCase } from '@application/authUseCases/loginUseCase';
import { LogoutUseCase } from '@application/authUseCases/logoutUseCase';
import { RefreshTokenUseCase } from '@application/authUseCases/refreshTokenUseCase';
import { RequestPasswordResetUseCase } from '@application/authUseCases/requestPasswordResetUseCase';
import { ResetPasswordUseCase } from '@application/authUseCases/resetPasswordUseCase';
import { VerifyOtpUseCase } from '@application/authUseCases/verifyOtpUseCase';
import {
  PermissionChangedEventHandler,
  RoleAssignedEventHandler,
  UserStatusChangedEventHandler,
} from '@application/eventHandlers';
import {
  AssignPermissionsToRoleUseCase,
  CreateRoleUseCase,
  DeleteRoleUseCase,
  GetPermissionsUseCase,
  GetRolePermissionsUseCase,
  GetRoleUseCase,
  GetRolesUseCase,
  UpdateRoleUseCase,
} from '@application/roleUseCases';
import {
  AssignRoleToUserUseCase,
  ChangeUserStatusUseCase,
  CreateUserUseCase,
  GetUserUseCase,
  GetUsersUseCase,
  RemoveRoleFromUserUseCase,
  UpdateUserUseCase,
} from '@application/userUseCases';
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
import { PermissionGuard } from '@shared/guards/permission.guard';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  OrganizationRepository,
  OtpRepository,
  PrismaAuditLogRepository,
  RoleRepository,
  SessionRepository,
  UserRepository,
} from '@infrastructure/database/repositories';
import { EmailService } from '@infrastructure/externalServices';
import { AuditController } from '@interface/http/audit/audit.controller';
import { AuthController } from '@interface/http/routes/auth.controller';
import { PasswordResetController } from '@interface/http/routes/passwordReset.controller';
import { RolesController } from '@interface/http/routes/roles.controller';
import { UsersController } from '@interface/http/routes/users.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DomainEventBus } from '@shared/domain/events/domainEventBus.service';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import { EventIdempotencyService } from '@shared/domain/events/eventIdempotency.service';
import { FunctionalCacheService } from '@shared/infrastructure/cache';

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
  controllers: [
    AuthController,
    PasswordResetController,
    UsersController,
    RolesController,
    AuditController,
  ],
  providers: [
    // Event Bus, Dispatcher and Idempotency
    DomainEventBus,
    EventIdempotencyService,
    {
      provide: 'DomainEventDispatcher',
      useClass: DomainEventDispatcher,
    },

    // Event Handlers
    RoleAssignedEventHandler,
    UserStatusChangedEventHandler,
    PermissionChangedEventHandler,

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
    PermissionGuard,

    // Passport strategies
    JwtStrategy,

    // Application use cases
    LoginUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
    RequestPasswordResetUseCase,
    VerifyOtpUseCase,
    ResetPasswordUseCase,
    // User management use cases
    CreateUserUseCase,
    GetUserUseCase,
    GetUsersUseCase,
    UpdateUserUseCase,
    ChangeUserStatusUseCase,
    AssignRoleToUserUseCase,
    RemoveRoleFromUserUseCase,
    // Role management use cases
    CreateRoleUseCase,
    GetRolesUseCase,
    GetRoleUseCase,
    GetPermissionsUseCase,
    GetRolePermissionsUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    AssignPermissionsToRoleUseCase,
    // Audit use cases
    GetAuditLogsUseCase,
    GetAuditLogUseCase,
    GetUserActivityUseCase,
    GetEntityHistoryUseCase,

    // Infrastructure services
    PrismaService,
    EmailService,
    // Cache service
    {
      provide: 'CacheService',
      useClass: FunctionalCacheService,
    },

    // Repositories
    {
      provide: 'UserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'RoleRepository',
      useClass: RoleRepository,
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
    {
      provide: 'AuditLogRepository',
      useClass: PrismaAuditLogRepository,
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
    PermissionGuard,
    JwtStrategy,
    DomainEventBus,
    EventIdempotencyService,
    'DomainEventDispatcher',
    EmailService,
    // Export repositories for cross-module access (e.g., InventoryModule event handlers)
    'AuditLogRepository',
  ],
})
export class AuthenticationModule implements OnModuleInit {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly roleAssignedHandler: RoleAssignedEventHandler,
    private readonly userStatusChangedHandler: UserStatusChangedEventHandler,
    private readonly permissionChangedHandler: PermissionChangedEventHandler
  ) {}

  onModuleInit() {
    // Register event handlers
    this.eventBus.registerHandler('RoleAssigned', this.roleAssignedHandler);
    this.eventBus.registerHandler('UserStatusChanged', this.userStatusChangedHandler);
    this.eventBus.registerHandler('PermissionChanged', this.permissionChangedHandler);
  }
}
