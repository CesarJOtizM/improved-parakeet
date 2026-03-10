> [English](./authentication.md) | **[Español](./authentication.es.md)**

# Modulo de Autenticacion y Autorizacion

## Descripcion General

El modulo de Autenticacion y Autorizacion es el nucleo de seguridad de la aplicacion. Construido sobre NestJS con arquitectura limpia (Domain-Driven Design), proporciona autenticacion basada en JWT, Control de Acceso Basado en Roles (RBAC), gestion de sesiones, recuperacion de contrasena mediante OTP, limitacion de tasa de peticiones (rate limiting) y lista negra de tokens. El modulo es multi-tenant, delimitando todas las operaciones a una organizacion (`orgId`). Utiliza Passport.js para autenticacion basada en estrategias, Redis (via cache manager) para blacklisting de tokens y rate limiting, y bcrypt para el hashing de contrasenas.

---

## Arquitectura

El modulo sigue una arquitectura hexagonal con clara separacion de responsabilidades:

```
src/authentication/
  authentication.module.ts          -- Definicion del modulo NestJS
  config/auth.config.ts             -- Configuracion (JWT, Redis, rate limits, seguridad)
  domain/
    entities/                       -- Agregados y entidades (User, Role, Permission, Session, Otp)
    valueObjects/                   -- Objetos de valor (Email, Password, JwtToken, RoleName, UserStatus, Username)
    services/                       -- Servicios de dominio (Authentication, Authorization, Jwt, TokenBlacklist, RateLimit, OtpCleanup, RoleAssignment, UserManagement)
    events/                         -- Eventos de dominio (UserCreated, UserLoggedIn, RoleAssigned, etc.)
    ports/repositories/             -- Interfaces de puertos de repositorio
    types/                          -- Definiciones de tipos del dominio
  security/
    guards/                         -- Guards de NestJS (JwtAuthGuard, PermissionsGuard, RoleBasedAuthGuard)
    strategies/                     -- Estrategias de Passport (JwtStrategy)
    decorators/                     -- Decoradores personalizados (@JwtAuth, @Public, @RequireRole, etc.)
    interceptors/                   -- Interceptores de logging y rate limit
  dto/                              -- Objetos de Transferencia de Datos para la capa HTTP

src/application/
  authUseCases/                     -- Casos de uso de autenticacion (login, logout, refresh, reset de contrasena, OTP)
  userUseCases/                     -- Casos de uso de gestion de usuarios (CRUD, asignacion de roles, cambios de estado)
  roleUseCases/                     -- Casos de uso de gestion de roles (CRUD, asignacion de permisos)

src/interfaces/http/routes/
  auth.controller.ts                -- Endpoints de autenticacion
  passwordReset.controller.ts       -- Endpoints de recuperacion de contrasena
  users.controller.ts               -- Endpoints de gestion de usuarios
  roles.controller.ts               -- Endpoints de gestion de roles
```

---

## Caracteristicas

### Autenticacion JWT

- Sistema de doble token: tokens de acceso de corta duracion (30m por defecto) y tokens de refresco de larga duracion (7d por defecto).
- Los tokens de acceso y refresco usan secretos separados (`JWT_SECRET`, `JWT_REFRESH_SECRET`).
- El payload JWT incluye `sub` (userId), `org_id`, `email`, `username`, `roles`, `permissions`, `type` (access/refresh), `iat` y `jti` (ID unico del token).
- La verificacion de tokens rechaza tokens de refresco presentados como tokens de acceso y viceversa.
- Los tokens se extraen del header `Authorization: Bearer <token>`.

**Archivos clave:**
- `src/authentication/domain/services/jwtService.ts` (`JwtService`)
- `src/authentication/domain/valueObjects/jwtToken.valueObject.ts` (`JwtToken`)
- `src/authentication/security/strategies/jwtStrategy.ts` (`JwtStrategy`)

### RBAC (Control de Acceso Basado en Roles)

- Roles de sistema predefinidos: `SYSTEM_ADMIN`, `ADMIN`, `SUPERVISOR`, `WAREHOUSE_OPERATOR`, `CONSULTANT`, `IMPORT_OPERATOR`, `SALES_PERSON`.
- Los roles de sistema (`isSystem=true`) estan disponibles para todas las organizaciones; los roles personalizados estan limitados a una sola organizacion.
- Los permisos siguen el formato `MODULO:ACCION` (ej: `USERS:CREATE`, `PRODUCTS:READ`, `INVENTORY:ADJUST`).
- Jerarquia de permisos: los permisos de nivel administrador (ej: `USERS:ADMIN`) otorgan implicitamente sub-permisos.
- La validacion de asignacion de roles previene auto-asignacion, asignacion de roles inactivos y asignacion de roles personalizados entre organizaciones.
- `SYSTEM_ADMIN` solo puede ser asignado/removido por otro `SYSTEM_ADMIN`.

**Archivos clave:**
- `src/shared/constants/security.constants.ts` (`SYSTEM_ROLES`, `SYSTEM_PERMISSIONS`)
- `src/authentication/domain/services/authorizationService.ts` (`AuthorizationService`)
- `src/authentication/domain/services/roleAssignmentService.ts` (`RoleAssignmentService`)
- `src/authentication/domain/entities/role.entity.ts` (`Role`)
- `src/authentication/domain/entities/permission.entity.ts` (`Permission`)

### Gestion de Sesiones

- Las sesiones se crean al iniciar sesion y se vinculan al refresh token.
- Cada sesion registra `userId`, `token`, `expiresAt`, `isActive`, `ipAddress` y `userAgent`.
- Al cerrar sesion, todas las sesiones activas del usuario se desactivan.
- La expiracion de la sesion se extiende al refrescar el token.
- Las sesiones pueden validarse tanto por estado de actividad como por expiracion.
- El endpoint `logout-all` desactiva todas las sesiones y pone en lista negra todos los tokens del usuario.

**Archivos clave:**
- `src/authentication/domain/entities/session.entity.ts` (`Session`)
- `src/authentication/domain/ports/repositories/iSessionRepository.port.ts`

### Lista Negra de Tokens

- Los tokens en lista negra se almacenan en Redis (cache manager) con TTL automatico que coincide con la expiracion del token.
- Razones para inclusion en lista negra: `LOGOUT`, `SECURITY`, `ADMIN_ACTION`.
- El seguimiento de tokens por usuario permite el blacklisting masivo de todos los tokens de un usuario especifico.
- El `JwtAuthGuard` verifica la lista negra en cada peticion autenticada (configurable).
- Diseno fail-closed: si la cache no esta disponible, los tokens se tratan como si estuvieran en la lista negra.

**Archivo clave:**
- `src/authentication/domain/services/tokenBlacklistService.ts` (`TokenBlacklistService`)

### OTP y Recuperacion de Contrasena

- Codigos OTP de 6 digitos con expiracion configurable (15 minutos por defecto).
- Tipos de OTP: `PASSWORD_RESET`, `ACCOUNT_ACTIVATION`, `TWO_FACTOR`.
- Maximo 3 intentos de verificacion por OTP.
- Limpieza automatica: los OTPs expirados se eliminan cada hora; los usados se eliminan diariamente a medianoche.
- Seguridad primero: las respuestas de recuperacion de contrasena nunca revelan si un email existe en el sistema.

**Archivos clave:**
- `src/authentication/domain/entities/otp.entity.ts` (`Otp`)
- `src/authentication/domain/services/otpCleanupService.ts` (`OtpCleanupService`)

---

## Componentes de Seguridad

### Guards

| Guard | Archivo | Descripcion |
|-------|---------|-------------|
| `JwtAuthGuard` | `security/guards/jwtAuthGuard.ts` | Valida tokens JWT de acceso, verifica lista negra, aplica limites de tasa. Extrae informacion del usuario en `request.user`. |
| `PermissionsGuard` | `security/guards/permissionsGuard.ts` | Verifica permisos y roles del usuario. Soporta modo `requireAll`. Valida acceso a la organizacion. |
| `RoleBasedAuthGuard` | `security/guards/roleBasedAuthGuard.ts` | Aplica requisitos de roles con soporte para bypass de super admin y admin de organizacion. |

### Estrategias

| Estrategia | Archivo | Descripcion |
|------------|---------|-------------|
| `JwtStrategy` | `security/strategies/jwtStrategy.ts` | Estrategia JWT de Passport. Extrae Bearer token, verifica firma, consulta blacklist, valida estructura del payload. |

### Decoradores

| Decorador | Archivo | Descripcion |
|-----------|---------|-------------|
| `@JwtAuth(options?)` | `security/decorators/auth.decorators.ts` | Configura autenticacion JWT con opciones personalizadas. |
| `@Public()` | `security/decorators/auth.decorators.ts` | Marca endpoint como publico (sin autenticacion). |
| `@AuthOnly()` | `security/decorators/auth.decorators.ts` | Requiere autenticacion pero omite verificacion de blacklist. |
| `@RateLimited(type)` | `security/decorators/auth.decorators.ts` | Habilita limitacion de tasa por IP o USER. |
| `@RequireRole(role)` | `security/decorators/auth.decorators.ts` | Requiere un rol especifico. |
| `@RequireRoles(roles, requireAll?)` | `security/decorators/auth.decorators.ts` | Requiere uno o todos los roles especificados. |
| `@RequirePermission(perm)` | `security/decorators/auth.decorators.ts` | Requiere un permiso especifico. |
| `@AdminOnly()` | `security/decorators/auth.decorators.ts` | Atajo para requerir rol `ADMIN`. |
| `@SupervisorOnly()` | `security/decorators/auth.decorators.ts` | Atajo para requerir rol `SUPERVISOR`. |
| `@OrgScoped()` | `security/decorators/auth.decorators.ts` | Aplica verificacion de limite organizacional. |
| `@CrossOrg()` | `security/decorators/auth.decorators.ts` | Desactiva verificacion de limite organizacional. |
| `@CanManageUsers()` | `security/decorators/auth.decorators.ts` | Requiere permiso `USERS:CREATE`. |
| `@CanViewReports()` | `security/decorators/auth.decorators.ts` | Requiere permiso `REPORTS:READ`. |
| `@SuperAdminOnly()` | `security/decorators/roleBasedAuth.decorator.ts` | Restringe acceso solo al rol `SYSTEM_ADMIN`. |
| `@OrganizationAdminOnly()` | `security/decorators/roleBasedAuth.decorator.ts` | Restringe acceso solo al rol `ADMIN`. |
| `@AllowSuperAdmin()` | `security/decorators/roleBasedAuth.decorator.ts` | Permite bypass de super admin. |
| `@AllowOrganizationAdmin()` | `security/decorators/roleBasedAuth.decorator.ts` | Permite bypass de admin de organizacion. |

### Interceptores

| Interceptor | Archivo | Descripcion |
|-------------|---------|-------------|
| `AuthenticationLoggingInterceptor` | `security/interceptors/authenticationLoggingInterceptor.ts` | Registra eventos de autenticacion (inicio, exito, error) con tiempos, IP e info del usuario. |
| `AuthorizationLoggingInterceptor` | `security/interceptors/authorizationLoggingInterceptor.ts` | Registra eventos de autorizacion con roles, razones de fallo (`INSUFFICIENT_ROLES`, `ORGANIZATION_ACCESS_DENIED`, etc.). |
| `RateLimitInterceptor` | `security/interceptors/rateLimitInterceptor.ts` | Aplica rate limiting configurable por endpoint. Retorna `429 Too Many Requests` con headers `X-RateLimit-*`. Fail-closed: deniega peticiones cuando la cache no esta disponible. |

---

## Casos de Uso

### Casos de Uso de Autenticacion

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `LoginUseCase` | `src/application/authUseCases/loginUseCase.ts` | Autentica usuario con email/contrasena, genera par de tokens JWT, crea sesion. Aplica rate limiting y bloqueo de cuenta. |
| `LogoutUseCase` | `src/application/authUseCases/logoutUseCase.ts` | Pone en lista negra tokens de acceso y refresco, desactiva todas las sesiones activas. Maneja tokens invalidos con medidas de seguridad. |
| `RefreshTokenUseCase` | `src/application/authUseCases/refreshTokenUseCase.ts` | Valida refresh token, genera nuevo par de tokens, pone en lista negra el refresh token anterior, actualiza sesion. Verifica que el usuario siga activo. |
| `ChangePasswordUseCase` | `src/application/authUseCases/changePasswordUseCase.ts` | Cambia la contrasena del usuario autenticado. Verifica contrasena actual, valida fortaleza, asegura que la nueva sea diferente. |
| `RequestPasswordResetUseCase` | `src/application/authUseCases/requestPasswordResetUseCase.ts` | Crea OTP y envia email de recuperacion. Nunca revela si el email existe (seguridad por diseno). Con rate limiting. |
| `VerifyOtpUseCase` | `src/application/authUseCases/verifyOtpUseCase.ts` | Verifica codigo OTP. Registra intentos e informa intentos restantes. Maximo 3 intentos por OTP. |
| `ResetPasswordUseCase` | `src/application/authUseCases/resetPasswordUseCase.ts` | Restablece contrasena usando OTP verificado. Valida fortaleza, asegura que difiera de la actual, marca OTP como usado. |

### Casos de Uso de Gestion de Usuarios

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `CreateUserUseCase` | `src/application/userUseCases/createUserUseCase.ts` | Crea un nuevo usuario en la organizacion. |
| `GetUserUseCase` | `src/application/userUseCases/getUserUseCase.ts` | Obtiene un usuario por ID. |
| `GetUsersUseCase` | `src/application/userUseCases/getUsersUseCase.ts` | Lista usuarios con paginacion, filtrado y ordenamiento. |
| `UpdateUserUseCase` | `src/application/userUseCases/updateUserUseCase.ts` | Actualiza informacion del perfil de usuario. |
| `ChangeUserStatusUseCase` | `src/application/userUseCases/changeUserStatusUseCase.ts` | Cambia estado del usuario (ACTIVE, INACTIVE, LOCKED) con seguimiento de razon. |
| `AssignRoleToUserUseCase` | `src/application/userUseCases/assignRoleToUserUseCase.ts` | Asigna un rol a un usuario con reglas de validacion. |
| `RemoveRoleFromUserUseCase` | `src/application/userUseCases/removeRoleFromUserUseCase.ts` | Remueve un rol de un usuario. Previene eliminar el ultimo rol. |

### Casos de Uso de Gestion de Roles

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `CreateRoleUseCase` | `src/application/roleUseCases/createRoleUseCase.ts` | Crea un rol personalizado para una organizacion. |
| `GetRolesUseCase` | `src/application/roleUseCases/getRolesUseCase.ts` | Lista todos los roles (sistema + personalizados) disponibles para la organizacion. |
| `GetRoleUseCase` | `src/application/roleUseCases/getRoleUseCase.ts` | Obtiene un rol especifico por ID. |
| `UpdateRoleUseCase` | `src/application/roleUseCases/updateRoleUseCase.ts` | Actualiza un rol personalizado. Los roles de sistema no pueden modificarse. |
| `DeleteRoleUseCase` | `src/application/roleUseCases/deleteRoleUseCase.ts` | Elimina un rol personalizado. Los roles de sistema no pueden eliminarse. |
| `GetPermissionsUseCase` | `src/application/roleUseCases/getPermissionsUseCase.ts` | Lista todos los permisos de sistema disponibles. |
| `GetRolePermissionsUseCase` | `src/application/roleUseCases/getRolePermissionsUseCase.ts` | Lista permisos asignados a un rol especifico. |
| `AssignPermissionsToRoleUseCase` | `src/application/roleUseCases/assignPermissionsToRoleUseCase.ts` | Asigna permisos a un rol. |

---

## Entidades y Objetos de Valor

### Entidades

| Entidad | Archivo | Descripcion |
|---------|---------|-------------|
| `User` | `domain/entities/user.entity.ts` | Raiz de agregado. Gestiona estado de autenticacion (login, bloqueo, cambios de contrasena, transiciones de estado). Emite `UserCreatedEvent` y `UserStatusChangedEvent`. |
| `Role` | `domain/entities/role.entity.ts` | Raiz de agregado. Representa roles de sistema o personalizados. Protege invariantes de roles de sistema (inmutabilidad de nombre, sin orgId). Emite `RoleCreatedEvent` y `RoleUpdatedEvent`. |
| `Permission` | `domain/entities/permission.entity.ts` | Entidad con campos `module` y `action`. Cadena de permiso completa: `module:action`. |
| `Session` | `domain/entities/session.entity.ts` | Rastrea sesiones activas. Soporta desactivacion, verificacion de expiracion y refresco de token. |
| `Otp` | `domain/entities/otp.entity.ts` | Raiz de agregado para codigos OTP. Auto-genera codigos de 6 digitos. Gestiona intentos de verificacion y expiracion. Tipos: `PASSWORD_RESET`, `ACCOUNT_ACTIVATION`, `TWO_FACTOR`. |

### Objetos de Valor

| Objeto de Valor | Archivo | Reglas de Validacion |
|-----------------|---------|----------------------|
| `Email` | `domain/valueObjects/email.valueObject.ts` | Formato compatible con RFC, sin puntos consecutivos, max 254 caracteres. Auto-minuscula y recortado. |
| `Password` | `domain/valueObjects/password.valueObject.ts` | Min 8 caracteres, max 128. Requiere mayuscula, minuscula, digito, caracter especial. Rechaza patrones comunes (`password`, `123456`, `qwerty`, `admin`). |
| `JwtToken` | `domain/valueObjects/jwtToken.valueObject.ts` | Valida formato JWT de 3 partes, partes no vacias, tipo (ACCESS/REFRESH) y expiracion futura. |
| `RoleName` | `domain/valueObjects/roleName.valueObject.ts` | Formato UPPER_SNAKE_CASE. Sin guiones bajos al inicio/final, sin guiones bajos consecutivos. Max 50 caracteres para roles personalizados. |
| `UserStatus` | `domain/valueObjects/userStatus.valueObject.ts` | Valores permitidos: `ACTIVE`, `INACTIVE`, `LOCKED`. Solo `ACTIVE` permite login. |
| `Username` | `domain/valueObjects/username.valueObject.ts` | 3-50 caracteres, alfanumerico mas `_` y `-`. No puede comenzar/terminar con `_` o `-`. No puede ser solo digitos. |

---

## Servicios de Dominio

| Servicio | Archivo | Descripcion |
|----------|---------|-------------|
| `AuthenticationService` | `domain/services/authenticationService.ts` | Metodos estaticos para validacion de credenciales (bcrypt), hashing de contrasenas (12 salt rounds), validacion de fortaleza y verificacion de permisos. |
| `AuthorizationService` | `domain/services/authorizationService.ts` | Metodos estaticos para verificacion de permisos (unico, cualquiera, todos), acceso a modulos, verificacion de roles, deteccion de admin/superusuario y validacion de jerarquia de permisos. |
| `JwtService` | `domain/services/jwtService.ts` | Servicio inyectable que envuelve NestJS JwtService. Genera pares de tokens, verifica tokens de acceso/refresco con secretos separados, verifica cercania a expiracion. |
| `TokenBlacklistService` | `domain/services/tokenBlacklistService.ts` | Lista negra de tokens respaldada por Redis con TTL automatico. Soporta blacklisting de token unico y masivo (por usuario). |
| `RateLimitService` | `domain/services/rateLimitService.ts` | Rate limiting respaldado por Redis con ventanas configurables por tipo (IP, USER, LOGIN, REFRESH_TOKEN, PASSWORD_RESET). Soporta bloqueo automatico al exceder limite. |
| `OtpCleanupService` | `domain/services/otpCleanupService.ts` | Limpieza programada de OTPs expirados (cada hora) y usados (diariamente). Itera sobre todas las organizaciones activas. |
| `RoleAssignmentService` | `domain/services/roleAssignmentService.ts` | Valida reglas de asignacion/remocion de roles, calcula permisos efectivos a partir de roles, valida formato de nombre de rol. |
| `UserManagementService` | `domain/services/userManagementService.ts` | Valida datos de creacion/actualizacion de usuarios, verifica reglas de transicion de estado (activar, desactivar, bloquear, desbloquear), valida cambios de email/username. |

---

## Eventos de Dominio

| Evento | Archivo | Disparador |
|--------|---------|------------|
| `UserCreatedEvent` | `domain/events/userCreated.event.ts` | Creacion de entidad User. |
| `UserLoggedInEvent` | `domain/events/userLoggedIn.event.ts` | Login exitoso. |
| `UserStatusChangedEvent` | `domain/events/userStatusChanged.event.ts` | Cambio de estado (activar, desactivar, bloquear, desbloquear). |
| `RoleCreatedEvent` | `domain/events/roleCreated.event.ts` | Creacion de rol. |
| `RoleUpdatedEvent` | `domain/events/roleUpdated.event.ts` | Actualizacion o activacion/desactivacion de rol. |
| `RoleAssignedEvent` | `domain/events/roleAssigned.event.ts` | Rol asignado a usuario. |
| `PermissionChangedEvent` | `domain/events/permissionChanged.event.ts` | Cambios de permisos en un rol. |
| `SessionExpiredEvent` | `domain/events/sessionExpired.event.ts` | Expiracion de sesion. |

Los eventos se despachan a traves de `DomainEventBus` y son manejados por event handlers registrados (`RoleAssignedEventHandler`, `UserStatusChangedEventHandler`, `PermissionChangedEventHandler`).

---

## Endpoints de la API

### Autenticacion

| Metodo | Endpoint | Autenticacion | Descripcion |
|--------|----------|---------------|-------------|
| `POST` | `/auth/login` | Publico | Autenticar con email/contrasena, recibir tokens JWT. |
| `POST` | `/auth/logout` | Bearer | Poner tokens en lista negra y desactivar sesion. |
| `POST` | `/auth/refresh` | Publico | Refrescar token de acceso usando refresh token. |
| `POST` | `/auth/logout-all` | Bearer | Cerrar sesion de todas las sesiones activas. |

### Recuperacion de Contrasena

| Metodo | Endpoint | Autenticacion | Descripcion |
|--------|----------|---------------|-------------|
| `POST` | `/password-reset/request` | Publico | Solicitar codigo OTP por email. |
| `POST` | `/password-reset/verify-otp` | Publico | Verificar codigo OTP. |
| `POST` | `/password-reset/reset` | Publico | Restablecer contrasena con OTP verificado. |

### Gestion de Usuarios

| Metodo | Endpoint | Autenticacion | Permiso | Descripcion |
|--------|----------|---------------|---------|-------------|
| `POST` | `/users` | Bearer | `USERS:CREATE` | Crear nuevo usuario. |
| `GET` | `/users/me` | Bearer | -- | Obtener perfil propio. |
| `PUT` | `/users/me` | Bearer | -- | Actualizar perfil propio. |
| `PUT` | `/users/me/password` | Bearer | -- | Cambiar contrasena propia. |
| `GET` | `/users` | Bearer | `USERS:READ` | Listar usuarios (paginado). |
| `GET` | `/users/:id` | Bearer | `USERS:READ` | Obtener usuario por ID. |
| `PUT` | `/users/:id` | Bearer | `USERS:UPDATE` | Actualizar usuario. |
| `PATCH` | `/users/:id/status` | Bearer | `USERS:UPDATE` | Cambiar estado de usuario. |
| `POST` | `/users/:id/roles` | Bearer | `USERS:MANAGE_ROLES` | Asignar rol a usuario. |
| `DELETE` | `/users/:id/roles/:roleId` | Bearer | `USERS:MANAGE_ROLES` | Remover rol de usuario. |

### Gestion de Roles

| Metodo | Endpoint | Autenticacion | Permiso | Descripcion |
|--------|----------|---------------|---------|-------------|
| `POST` | `/roles` | Bearer | `ROLES:CREATE` | Crear rol personalizado. |
| `GET` | `/roles` | Bearer | `ROLES:READ` | Listar todos los roles. |
| `GET` | `/roles/permissions` | Bearer | `ROLES:READ` | Listar todos los permisos del sistema. |
| `GET` | `/roles/:id` | Bearer | `ROLES:READ` | Obtener rol por ID. |
| `PATCH` | `/roles/:id` | Bearer | `ROLES:UPDATE` | Actualizar rol personalizado. |
| `DELETE` | `/roles/:id` | Bearer | `ROLES:DELETE` | Eliminar rol personalizado. |
| `GET` | `/roles/:id/permissions` | Bearer | `ROLES:READ` | Obtener permisos del rol. |
| `POST` | `/roles/:id/permissions` | Bearer | `ROLES:UPDATE` | Asignar permisos a un rol. |

---

## Configuracion

**Archivo:** `src/authentication/config/auth.config.ts`

### Configuracion JWT

| Variable | Valor por Defecto | Descripcion |
|----------|-------------------|-------------|
| `JWT_SECRET` | (requerido) | Clave secreta para firmar tokens de acceso. |
| `JWT_REFRESH_SECRET` | (requerido) | Secreto separado para firmar tokens de refresco. |
| `JWT_ACCESS_TOKEN_EXPIRY` | `30m` | Tiempo de vida del token de acceso. |
| `JWT_REFRESH_TOKEN_EXPIRY` | `7d` | Tiempo de vida del token de refresco. |
| `BCRYPT_SALT_ROUNDS` | `12` | Factor de costo bcrypt para hashing de contrasenas. |

### Configuracion Redis

| Variable | Valor por Defecto | Descripcion |
|----------|-------------------|-------------|
| `REDIS_HOST` | `localhost` | Host del servidor Redis. |
| `REDIS_PORT` | `6379` | Puerto del servidor Redis. |
| `REDIS_PASSWORD` | -- | Contrasena de Redis (opcional). |
| `REDIS_DB` | `0` | Numero de base de datos Redis. |
| `REDIS_TTL` | `3600` | TTL por defecto en segundos (1 hora). |

### Limitacion de Tasa

| Tipo | Peticiones Max | Ventana | Duracion de Bloqueo | Descripcion |
|------|---------------|---------|---------------------|-------------|
| IP | 100 | 1 min | 5 min | Limite general por IP. |
| USER | 1000 | 1 hora | 15 min | Limite por usuario autenticado. |
| LOGIN | 5 | 15 min | 30 min | Limite de intentos de login. |
| REFRESH_TOKEN | 10 | 1 min | 10 min | Limite de refresco de token. |
| PASSWORD_RESET | 3 | 1 hora | 1 hora | Limite de solicitudes de reset. |

### Configuracion de Seguridad

| Variable | Valor por Defecto | Descripcion |
|----------|-------------------|-------------|
| `MAX_FAILED_LOGIN_ATTEMPTS` | `5` | Intentos fallidos antes de bloqueo de cuenta. |
| `LOCKOUT_DURATION_MINUTES` | `30` | Duracion del bloqueo de cuenta. |
| `SESSION_TIMEOUT_MINUTES` | `480` | Timeout de sesion (8 horas). |
| `REQUIRE_MFA` | `false` | Si se requiere MFA. |

### Politica de Contrasenas

| Regla |
|-------|
| Minimo 8 caracteres |
| Maximo 128 caracteres |
| Al menos una letra mayuscula |
| Al menos una letra minuscula |
| Al menos un digito |
| Al menos un caracter especial (`!@#$%^&*(),.?":{}|<>`) |
| No debe contener patrones comunes (`password`, `123456`, `qwerty`, `admin`) |

### Headers de Seguridad

Definidos en `src/shared/constants/security.constants.ts`:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Puertos de Repositorio

| Interfaz | Archivo | Descripcion |
|----------|---------|-------------|
| `IUserRepository` | `domain/ports/repositories/iUserRepository.port.ts` | Operaciones de persistencia de usuarios. |
| `IRoleRepository` | `domain/ports/repositories/iRoleRepository.port.ts` | Operaciones de persistencia de roles. |
| `IPermissionRepository` | `domain/ports/repositories/iPermissionRepository.port.ts` | Operaciones de persistencia de permisos. |
| `ISessionRepository` | `domain/ports/repositories/iSessionRepository.port.ts` | Operaciones de persistencia de sesiones. |
| `IOtpRepository` | `domain/ports/repositories/iOtpRepository.port.ts` | Operaciones de persistencia y limpieza de OTPs. |

---

## Exportaciones del Modulo

El `AuthenticationModule` exporta lo siguiente para uso de otros modulos:

- `AuthenticationService`, `JwtService`, `TokenBlacklistService`, `RateLimitService`
- `JwtAuthGuard`, `PermissionsGuard`, `RoleBasedAuthGuard`, `PermissionGuard`
- `JwtStrategy`
- `DomainEventBus`, `EventIdempotencyService`, `DomainEventDispatcher`
- `EmailService`
- `AuditLogRepository`
