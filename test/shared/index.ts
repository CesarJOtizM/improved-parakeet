// Tests para @shared/ - Archivo de índice
// Este archivo exporta todos los tests de la carpeta @shared/

// Config tests
export * from './config/logging.config.spec';
export * from './config/rateLimit.config.spec';
export * from './config/security.config.spec';
export * from './config/validation.config.spec';

// Constants tests
export * from './constants/httpStatusMessages.spec';
export * from './constants/security.constants.spec';

// Decorators tests
export * from './decorators/apiResponse.decorator.spec';
export * from './decorators/orgId.decorator.spec';
export * from './decorators/requirePermissions.decorator.spec';

// Domain tests
export * from './domain/base/aggregateRoot.base.spec';
export * from './domain/base/entity.base.spec';
export * from './domain/base/valueObject.base.spec';
export * from './domain/events/domainEvent.base.spec';
export * from './domain/repository/repository.interface.spec';

// Filters tests
export * from './filters/globalExceptionFilter.spec';

// Guards tests
export * from './guards/permission.guard.spec';

// Interceptors tests
export * from './interceptors/audit.interceptor.spec';
export * from './interceptors/responseInterceptor.spec';

// Middleware tests
export * from './middleware/securityMiddleware.spec';

// Types tests
export * from './types/apiResponse.types.spec';
export * from './types/database.types.spec';
export * from './types/http.types.spec';
export * from './types/index.spec';

// Utils tests
export * from './utils/responseUtils.spec';

// Shared index exports tests
export * from './index.spec';
