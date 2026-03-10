> **[English](./authentication.md)** | [Español](./authentication.es.md)

# Authentication & Authorization Module

## Overview

The Authentication & Authorization module is the security backbone of the application. Built on NestJS with a clean architecture (Domain-Driven Design), it provides JWT-based authentication, Role-Based Access Control (RBAC), session management, OTP-based password recovery, rate limiting, and token blacklisting. The module is multi-tenant, scoping all operations to an organization (`orgId`). It leverages Passport.js for strategy-based authentication, Redis (via cache manager) for token blacklisting and rate limiting, and bcrypt for password hashing.

---

## Architecture

The module follows hexagonal architecture with clear separation of concerns:

```
src/authentication/
  authentication.module.ts          -- NestJS module definition
  config/auth.config.ts             -- Configuration (JWT, Redis, rate limits, security)
  domain/
    entities/                       -- Aggregates & entities (User, Role, Permission, Session, Otp)
    valueObjects/                   -- Value objects (Email, Password, JwtToken, RoleName, UserStatus, Username)
    services/                       -- Domain services (Authentication, Authorization, Jwt, TokenBlacklist, RateLimit, OtpCleanup, RoleAssignment, UserManagement)
    events/                         -- Domain events (UserCreated, UserLoggedIn, RoleAssigned, etc.)
    ports/repositories/             -- Repository port interfaces
    types/                          -- Domain type definitions
  security/
    guards/                         -- NestJS guards (JwtAuthGuard, PermissionsGuard, RoleBasedAuthGuard)
    strategies/                     -- Passport strategies (JwtStrategy)
    decorators/                     -- Custom decorators (@JwtAuth, @Public, @RequireRole, etc.)
    interceptors/                   -- Logging & rate limit interceptors
  dto/                              -- Data Transfer Objects for HTTP layer

src/application/
  authUseCases/                     -- Authentication use cases (login, logout, refresh, password reset, OTP)
  userUseCases/                     -- User management use cases (CRUD, role assignment, status changes)
  roleUseCases/                     -- Role management use cases (CRUD, permission assignment)

src/interfaces/http/routes/
  auth.controller.ts                -- Authentication endpoints
  passwordReset.controller.ts       -- Password reset endpoints
  users.controller.ts               -- User management endpoints
  roles.controller.ts               -- Role management endpoints
```

---

## Features

### JWT Authentication

- Dual-token system: short-lived access tokens (default 30m) and long-lived refresh tokens (default 7d).
- Access and refresh tokens use separate secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`).
- JWT payload includes `sub` (userId), `org_id`, `email`, `username`, `roles`, `permissions`, `type` (access/refresh), `iat`, and `jti` (unique token ID).
- Token verification rejects refresh tokens presented as access tokens and vice versa.
- Tokens are extracted from the `Authorization: Bearer <token>` header.

**Key files:**
- `src/authentication/domain/services/jwtService.ts` (`JwtService`)
- `src/authentication/domain/valueObjects/jwtToken.valueObject.ts` (`JwtToken`)
- `src/authentication/security/strategies/jwtStrategy.ts` (`JwtStrategy`)

### RBAC (Role-Based Access Control)

- Predefined system roles: `SYSTEM_ADMIN`, `ADMIN`, `SUPERVISOR`, `WAREHOUSE_OPERATOR`, `CONSULTANT`, `IMPORT_OPERATOR`, `SALES_PERSON`.
- System roles (`isSystem=true`) are available to all organizations; custom roles are scoped to a single organization.
- Permissions follow the `MODULE:ACTION` format (e.g., `USERS:CREATE`, `PRODUCTS:READ`, `INVENTORY:ADJUST`).
- Permission hierarchy: admin-level permissions (e.g., `USERS:ADMIN`) implicitly grant sub-permissions.
- Role assignment validation prevents self-assignment, assignment of inactive roles, and cross-organization custom role assignment.
- `SYSTEM_ADMIN` can only be assigned/removed by another `SYSTEM_ADMIN`.

**Key files:**
- `src/shared/constants/security.constants.ts` (`SYSTEM_ROLES`, `SYSTEM_PERMISSIONS`)
- `src/authentication/domain/services/authorizationService.ts` (`AuthorizationService`)
- `src/authentication/domain/services/roleAssignmentService.ts` (`RoleAssignmentService`)
- `src/authentication/domain/entities/role.entity.ts` (`Role`)
- `src/authentication/domain/entities/permission.entity.ts` (`Permission`)

### Session Management

- Sessions are created upon login and linked to the refresh token.
- Each session tracks `userId`, `token`, `expiresAt`, `isActive`, `ipAddress`, and `userAgent`.
- On logout, all active sessions for the user are deactivated.
- Session expiration is extended on token refresh.
- Sessions can be validated for both activity status and expiration.
- `logout-all` endpoint deactivates all sessions and blacklists all tokens for the user.

**Key files:**
- `src/authentication/domain/entities/session.entity.ts` (`Session`)
- `src/authentication/domain/ports/repositories/iSessionRepository.port.ts`

### Token Blacklisting

- Blacklisted tokens are stored in Redis (cache manager) with automatic TTL matching the token expiration.
- Reasons for blacklisting: `LOGOUT`, `SECURITY`, `ADMIN_ACTION`.
- Per-user token tracking allows bulk blacklisting of all tokens for a specific user.
- The `JwtAuthGuard` checks the blacklist on every authenticated request (configurable).
- Fail-closed design: if the cache is unavailable, tokens are treated as blacklisted.

**Key file:**
- `src/authentication/domain/services/tokenBlacklistService.ts` (`TokenBlacklistService`)

### OTP & Password Reset

- 6-digit OTP codes with configurable expiration (default 15 minutes).
- OTP types: `PASSWORD_RESET`, `ACCOUNT_ACTIVATION`, `TWO_FACTOR`.
- Maximum 3 verification attempts per OTP.
- Automatic cleanup: expired OTPs are deleted hourly; used OTPs are deleted daily at midnight.
- Security-first: password reset responses never reveal whether an email exists in the system.

**Key files:**
- `src/authentication/domain/entities/otp.entity.ts` (`Otp`)
- `src/authentication/domain/services/otpCleanupService.ts` (`OtpCleanupService`)

---

## Security Components

### Guards

| Guard | File | Description |
|-------|------|-------------|
| `JwtAuthGuard` | `security/guards/jwtAuthGuard.ts` | Validates JWT access tokens, checks blacklist, enforces rate limits. Extracts user info into `request.user`. |
| `PermissionsGuard` | `security/guards/permissionsGuard.ts` | Checks user permissions and roles. Supports `requireAll` mode. Validates organization access. |
| `RoleBasedAuthGuard` | `security/guards/roleBasedAuthGuard.ts` | Enforces role requirements with support for super admin and org admin bypass. |

### Strategies

| Strategy | File | Description |
|----------|------|-------------|
| `JwtStrategy` | `security/strategies/jwtStrategy.ts` | Passport JWT strategy. Extracts Bearer token, verifies signature, checks blacklist, validates payload structure. |

### Decorators

| Decorator | File | Description |
|-----------|------|-------------|
| `@JwtAuth(options?)` | `security/decorators/auth.decorators.ts` | Configures JWT authentication with custom options. |
| `@Public()` | `security/decorators/auth.decorators.ts` | Marks endpoint as public (no authentication). |
| `@AuthOnly()` | `security/decorators/auth.decorators.ts` | Requires authentication but skips blacklist check. |
| `@RateLimited(type)` | `security/decorators/auth.decorators.ts` | Enables rate limiting by IP or USER. |
| `@RequireRole(role)` | `security/decorators/auth.decorators.ts` | Requires a specific role. |
| `@RequireRoles(roles, requireAll?)` | `security/decorators/auth.decorators.ts` | Requires one or all specified roles. |
| `@RequirePermission(perm)` | `security/decorators/auth.decorators.ts` | Requires a specific permission. |
| `@AdminOnly()` | `security/decorators/auth.decorators.ts` | Shortcut for requiring `ADMIN` role. |
| `@SupervisorOnly()` | `security/decorators/auth.decorators.ts` | Shortcut for requiring `SUPERVISOR` role. |
| `@OrgScoped()` | `security/decorators/auth.decorators.ts` | Enforces organization boundary check. |
| `@CrossOrg()` | `security/decorators/auth.decorators.ts` | Disables organization boundary check. |
| `@CanManageUsers()` | `security/decorators/auth.decorators.ts` | Requires `USERS:CREATE` permission. |
| `@CanViewReports()` | `security/decorators/auth.decorators.ts` | Requires `REPORTS:READ` permission. |
| `@SuperAdminOnly()` | `security/decorators/roleBasedAuth.decorator.ts` | Restricts access to `SYSTEM_ADMIN` role only. |
| `@OrganizationAdminOnly()` | `security/decorators/roleBasedAuth.decorator.ts` | Restricts access to `ADMIN` role only. |
| `@AllowSuperAdmin()` | `security/decorators/roleBasedAuth.decorator.ts` | Allows super admin bypass. |
| `@AllowOrganizationAdmin()` | `security/decorators/roleBasedAuth.decorator.ts` | Allows org admin bypass. |

### Interceptors

| Interceptor | File | Description |
|-------------|------|-------------|
| `AuthenticationLoggingInterceptor` | `security/interceptors/authenticationLoggingInterceptor.ts` | Logs authentication events (start, success, error) with timing, IP, and user info. |
| `AuthorizationLoggingInterceptor` | `security/interceptors/authorizationLoggingInterceptor.ts` | Logs authorization events with roles, failure reasons (`INSUFFICIENT_ROLES`, `ORGANIZATION_ACCESS_DENIED`, etc.). |
| `RateLimitInterceptor` | `security/interceptors/rateLimitInterceptor.ts` | Applies configurable rate limiting per endpoint. Returns `429 Too Many Requests` with `X-RateLimit-*` headers. Fail-closed: denies requests when cache is unavailable. |

---

## Use Cases

### Authentication Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `LoginUseCase` | `src/application/authUseCases/loginUseCase.ts` | Authenticates user with email/password, generates JWT token pair, creates session. Enforces rate limiting and account lockout. |
| `LogoutUseCase` | `src/application/authUseCases/logoutUseCase.ts` | Blacklists access and refresh tokens, deactivates all active sessions. Handles invalid tokens gracefully with security measures. |
| `RefreshTokenUseCase` | `src/application/authUseCases/refreshTokenUseCase.ts` | Validates refresh token, generates new token pair, blacklists old refresh token, updates session. Verifies user is still active. |
| `ChangePasswordUseCase` | `src/application/authUseCases/changePasswordUseCase.ts` | Changes authenticated user's password. Verifies current password, validates strength, ensures new password differs from current. |
| `RequestPasswordResetUseCase` | `src/application/authUseCases/requestPasswordResetUseCase.ts` | Creates OTP and sends password reset email. Never reveals whether the email exists (security by design). Rate-limited. |
| `VerifyOtpUseCase` | `src/application/authUseCases/verifyOtpUseCase.ts` | Verifies OTP code. Tracks attempts and reports remaining attempts. Max 3 attempts per OTP. |
| `ResetPasswordUseCase` | `src/application/authUseCases/resetPasswordUseCase.ts` | Resets password using verified OTP. Validates password strength, ensures it differs from current, marks OTP as used. |

### User Management Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `CreateUserUseCase` | `src/application/userUseCases/createUserUseCase.ts` | Creates a new user in the organization. |
| `GetUserUseCase` | `src/application/userUseCases/getUserUseCase.ts` | Retrieves a user by ID. |
| `GetUsersUseCase` | `src/application/userUseCases/getUsersUseCase.ts` | Lists users with pagination, filtering, and sorting. |
| `UpdateUserUseCase` | `src/application/userUseCases/updateUserUseCase.ts` | Updates user profile information. |
| `ChangeUserStatusUseCase` | `src/application/userUseCases/changeUserStatusUseCase.ts` | Changes user status (ACTIVE, INACTIVE, LOCKED) with reason tracking. |
| `AssignRoleToUserUseCase` | `src/application/userUseCases/assignRoleToUserUseCase.ts` | Assigns a role to a user with validation rules. |
| `RemoveRoleFromUserUseCase` | `src/application/userUseCases/removeRoleFromUserUseCase.ts` | Removes a role from a user. Prevents removing the last role. |

### Role Management Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `CreateRoleUseCase` | `src/application/roleUseCases/createRoleUseCase.ts` | Creates a custom role for an organization. |
| `GetRolesUseCase` | `src/application/roleUseCases/getRolesUseCase.ts` | Lists all roles (system + custom) available to the organization. |
| `GetRoleUseCase` | `src/application/roleUseCases/getRoleUseCase.ts` | Retrieves a specific role by ID. |
| `UpdateRoleUseCase` | `src/application/roleUseCases/updateRoleUseCase.ts` | Updates a custom role. System roles cannot be modified. |
| `DeleteRoleUseCase` | `src/application/roleUseCases/deleteRoleUseCase.ts` | Deletes a custom role. System roles cannot be deleted. |
| `GetPermissionsUseCase` | `src/application/roleUseCases/getPermissionsUseCase.ts` | Lists all available system permissions. |
| `GetRolePermissionsUseCase` | `src/application/roleUseCases/getRolePermissionsUseCase.ts` | Lists permissions assigned to a specific role. |
| `AssignPermissionsToRoleUseCase` | `src/application/roleUseCases/assignPermissionsToRoleUseCase.ts` | Assigns permissions to a role. |

---

## Entities & Value Objects

### Entities

| Entity | File | Description |
|--------|------|-------------|
| `User` | `domain/entities/user.entity.ts` | Aggregate root. Manages authentication state (login, lockout, password changes, status transitions). Emits `UserCreatedEvent` and `UserStatusChangedEvent`. |
| `Role` | `domain/entities/role.entity.ts` | Aggregate root. Represents system or custom roles. Protects system role invariants (name immutability, no orgId). Emits `RoleCreatedEvent` and `RoleUpdatedEvent`. |
| `Permission` | `domain/entities/permission.entity.ts` | Entity with `module` and `action` fields. Full permission string: `module:action`. |
| `Session` | `domain/entities/session.entity.ts` | Tracks active sessions. Supports deactivation, expiration check, and token refresh. |
| `Otp` | `domain/entities/otp.entity.ts` | Aggregate root for OTP codes. Auto-generates 6-digit codes. Manages verification attempts and expiration. Types: `PASSWORD_RESET`, `ACCOUNT_ACTIVATION`, `TWO_FACTOR`. |

### Value Objects

| Value Object | File | Validation Rules |
|--------------|------|------------------|
| `Email` | `domain/valueObjects/email.valueObject.ts` | RFC-compliant format, no consecutive dots, max 254 chars. Auto-lowercased and trimmed. |
| `Password` | `domain/valueObjects/password.valueObject.ts` | Min 8 chars, max 128. Requires uppercase, lowercase, digit, special char. Rejects common patterns (`password`, `123456`, `qwerty`, `admin`). |
| `JwtToken` | `domain/valueObjects/jwtToken.valueObject.ts` | Validates 3-part JWT format, non-empty parts, type (ACCESS/REFRESH), and future expiration. |
| `RoleName` | `domain/valueObjects/roleName.valueObject.ts` | UPPER_SNAKE_CASE format. No leading/trailing underscores, no consecutive underscores. Max 50 chars for custom roles. |
| `UserStatus` | `domain/valueObjects/userStatus.valueObject.ts` | Allowed values: `ACTIVE`, `INACTIVE`, `LOCKED`. Only `ACTIVE` allows login. |
| `Username` | `domain/valueObjects/username.valueObject.ts` | 3-50 chars, alphanumeric plus `_` and `-`. Cannot start/end with `_` or `-`. Cannot be only digits. |

---

## Domain Services

| Service | File | Description |
|---------|------|-------------|
| `AuthenticationService` | `domain/services/authenticationService.ts` | Static methods for credential validation (bcrypt), password hashing (12 salt rounds), password strength validation, and permission checking. |
| `AuthorizationService` | `domain/services/authorizationService.ts` | Static methods for permission checks (single, any, all), module access, role checks, admin/superuser detection, and permission hierarchy validation. |
| `JwtService` | `domain/services/jwtService.ts` | Injectable service wrapping NestJS JwtService. Generates token pairs, verifies access/refresh tokens with separate secrets, checks near-expiration. |
| `TokenBlacklistService` | `domain/services/tokenBlacklistService.ts` | Redis-backed token blacklist with automatic TTL. Supports single-token and bulk (per-user) blacklisting. |
| `RateLimitService` | `domain/services/rateLimitService.ts` | Redis-backed rate limiting with configurable windows per type (IP, USER, LOGIN, REFRESH_TOKEN, PASSWORD_RESET). Supports automatic blocking on limit exceeded. |
| `OtpCleanupService` | `domain/services/otpCleanupService.ts` | Scheduled cleanup of expired OTPs (hourly) and used OTPs (daily). Iterates over all active organizations. |
| `RoleAssignmentService` | `domain/services/roleAssignmentService.ts` | Validates role assignment/removal rules, computes effective permissions from roles, validates role name format. |
| `UserManagementService` | `domain/services/userManagementService.ts` | Validates user creation/update data, checks status transition rules (activate, deactivate, lock, unlock), validates email/username changes. |

---

## Domain Events

| Event | File | Trigger |
|-------|------|---------|
| `UserCreatedEvent` | `domain/events/userCreated.event.ts` | User entity creation. |
| `UserLoggedInEvent` | `domain/events/userLoggedIn.event.ts` | Successful login. |
| `UserStatusChangedEvent` | `domain/events/userStatusChanged.event.ts` | Status change (activate, deactivate, lock, unlock). |
| `RoleCreatedEvent` | `domain/events/roleCreated.event.ts` | Role creation. |
| `RoleUpdatedEvent` | `domain/events/roleUpdated.event.ts` | Role update or activation/deactivation. |
| `RoleAssignedEvent` | `domain/events/roleAssigned.event.ts` | Role assigned to user. |
| `PermissionChangedEvent` | `domain/events/permissionChanged.event.ts` | Permission changes on a role. |
| `SessionExpiredEvent` | `domain/events/sessionExpired.event.ts` | Session expiration. |

Events are dispatched through `DomainEventBus` and handled by registered event handlers (`RoleAssignedEventHandler`, `UserStatusChangedEventHandler`, `PermissionChangedEventHandler`).

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | Public | Authenticate with email/password, receive JWT tokens. |
| `POST` | `/auth/logout` | Bearer | Blacklist tokens and deactivate session. |
| `POST` | `/auth/refresh` | Public | Refresh access token using refresh token. |
| `POST` | `/auth/logout-all` | Bearer | Logout from all active sessions. |

### Password Reset

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/password-reset/request` | Public | Request OTP code via email. |
| `POST` | `/password-reset/verify-otp` | Public | Verify OTP code. |
| `POST` | `/password-reset/reset` | Public | Reset password with verified OTP. |

### User Management

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/users` | Bearer | `USERS:CREATE` | Create new user. |
| `GET` | `/users/me` | Bearer | -- | Get own profile. |
| `PUT` | `/users/me` | Bearer | -- | Update own profile. |
| `PUT` | `/users/me/password` | Bearer | -- | Change own password. |
| `GET` | `/users` | Bearer | `USERS:READ` | List users (paginated). |
| `GET` | `/users/:id` | Bearer | `USERS:READ` | Get user by ID. |
| `PUT` | `/users/:id` | Bearer | `USERS:UPDATE` | Update user. |
| `PATCH` | `/users/:id/status` | Bearer | `USERS:UPDATE` | Change user status. |
| `POST` | `/users/:id/roles` | Bearer | `USERS:MANAGE_ROLES` | Assign role to user. |
| `DELETE` | `/users/:id/roles/:roleId` | Bearer | `USERS:MANAGE_ROLES` | Remove role from user. |

### Role Management

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/roles` | Bearer | `ROLES:CREATE` | Create custom role. |
| `GET` | `/roles` | Bearer | `ROLES:READ` | List all roles. |
| `GET` | `/roles/permissions` | Bearer | `ROLES:READ` | List all system permissions. |
| `GET` | `/roles/:id` | Bearer | `ROLES:READ` | Get role by ID. |
| `PATCH` | `/roles/:id` | Bearer | `ROLES:UPDATE` | Update custom role. |
| `DELETE` | `/roles/:id` | Bearer | `ROLES:DELETE` | Delete custom role. |
| `GET` | `/roles/:id/permissions` | Bearer | `ROLES:READ` | Get role permissions. |
| `POST` | `/roles/:id/permissions` | Bearer | `ROLES:UPDATE` | Assign permissions to role. |

---

## Configuration

**File:** `src/authentication/config/auth.config.ts`

### JWT Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | (required) | Secret key for signing access tokens. |
| `JWT_REFRESH_SECRET` | (required) | Separate secret for signing refresh tokens. |
| `JWT_ACCESS_TOKEN_EXPIRY` | `30m` | Access token lifetime. |
| `JWT_REFRESH_TOKEN_EXPIRY` | `7d` | Refresh token lifetime. |
| `BCRYPT_SALT_ROUNDS` | `12` | bcrypt cost factor for password hashing. |

### Redis Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server host. |
| `REDIS_PORT` | `6379` | Redis server port. |
| `REDIS_PASSWORD` | -- | Redis password (optional). |
| `REDIS_DB` | `0` | Redis database number. |
| `REDIS_TTL` | `3600` | Default TTL in seconds (1 hour). |

### Rate Limiting

| Type | Max Requests | Window | Block Duration | Description |
|------|-------------|--------|----------------|-------------|
| IP | 100 | 1 min | 5 min | General per-IP limit. |
| USER | 1000 | 1 hour | 15 min | Per-authenticated-user limit. |
| LOGIN | 5 | 15 min | 30 min | Login attempt limit. |
| REFRESH_TOKEN | 10 | 1 min | 10 min | Token refresh limit. |
| PASSWORD_RESET | 3 | 1 hour | 1 hour | Password reset request limit. |

### Security Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_FAILED_LOGIN_ATTEMPTS` | `5` | Failed logins before account lockout. |
| `LOCKOUT_DURATION_MINUTES` | `30` | Account lockout duration. |
| `SESSION_TIMEOUT_MINUTES` | `480` | Session timeout (8 hours). |
| `REQUIRE_MFA` | `false` | Whether MFA is required. |

### Password Policy

| Rule |
|------|
| Minimum 8 characters |
| Maximum 128 characters |
| At least one uppercase letter |
| At least one lowercase letter |
| At least one digit |
| At least one special character (`!@#$%^&*(),.?":{}|<>`) |
| Must not contain common patterns (`password`, `123456`, `qwerty`, `admin`) |

### Security Headers

Defined in `src/shared/constants/security.constants.ts`:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Repository Ports

| Interface | File | Description |
|-----------|------|-------------|
| `IUserRepository` | `domain/ports/repositories/iUserRepository.port.ts` | User persistence operations. |
| `IRoleRepository` | `domain/ports/repositories/iRoleRepository.port.ts` | Role persistence operations. |
| `IPermissionRepository` | `domain/ports/repositories/iPermissionRepository.port.ts` | Permission persistence operations. |
| `ISessionRepository` | `domain/ports/repositories/iSessionRepository.port.ts` | Session persistence operations. |
| `IOtpRepository` | `domain/ports/repositories/iOtpRepository.port.ts` | OTP persistence and cleanup operations. |

---

## Module Exports

The `AuthenticationModule` exports the following for use by other modules:

- `AuthenticationService`, `JwtService`, `TokenBlacklistService`, `RateLimitService`
- `JwtAuthGuard`, `PermissionsGuard`, `RoleBasedAuthGuard`, `PermissionGuard`
- `JwtStrategy`
- `DomainEventBus`, `EventIdempotencyService`, `DomainEventDispatcher`
- `EmailService`
- `AuditLogRepository`
