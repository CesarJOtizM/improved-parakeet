import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
  IsBoolean,
  Length,
  Matches,
  Min,
  Max,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  // =============================================================================
  // GENERAL APPLICATION CONFIGURATION
  // =============================================================================

  @IsEnum(Environment)
  @IsNotEmpty()
  NODE_ENV: Environment = Environment.Development;

  @IsEnum(Environment)
  @IsOptional()
  BUN_ENV?: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  APP_VERSION?: string = '1.0.0';

  // =============================================================================
  // DATABASE CONFIGURATION
  // =============================================================================

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  DIRECT_DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  DB_HOST?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  DB_PORT?: number;

  @IsString()
  @IsOptional()
  DB_NAME?: string;

  @IsString()
  @IsOptional()
  DB_USER?: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsString()
  @IsOptional()
  DB_SCHEMA?: string = 'public';

  // =============================================================================
  // REDIS CONFIGURATION
  // =============================================================================

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  REDIS_DB?: number = 0;

  // =============================================================================
  // JWT CONFIGURATION
  // =============================================================================

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TOKEN_EXPIRES_IN: string = '900'; // 15 minutes

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TOKEN_EXPIRES_IN: string = '604800'; // 7 days

  @IsString()
  @IsOptional()
  JWT_ALGORITHM?: string = 'HS256';

  @IsString()
  @IsOptional()
  JWT_ACCESS_TOKEN_EXPIRY?: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_TOKEN_EXPIRY?: string = '7d';

  // =============================================================================
  // ENCRYPTION AND SECURITY
  // =============================================================================

  @IsNumber()
  @Min(10)
  @Max(15)
  @Transform(({ value }) => parseInt(value, 10))
  BCRYPT_SALT_ROUNDS: number = 12;

  @IsString()
  @IsNotEmpty()
  @Length(64, 64, { message: 'ENCRYPTION_KEY must be exactly 64 characters (32 bytes hex)' })
  @Matches(/^[0-9a-fA-F]+$/, { message: 'ENCRYPTION_KEY must be a valid hexadecimal string' })
  ENCRYPTION_KEY!: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value, 10))
  MAX_FAILED_LOGIN_ATTEMPTS: number = 5;

  @IsNumber()
  @Min(1)
  @Max(1440) // Max 24 hours
  @Transform(({ value }) => parseInt(value, 10))
  LOCKOUT_DURATION_MINUTES: number = 30;

  @IsNumber()
  @Min(15)
  @Max(1440) // Max 24 hours
  @Transform(({ value }) => parseInt(value, 10))
  SESSION_TIMEOUT_MINUTES: number = 480; // 8 hours

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  REQUIRE_MFA: boolean = false;

  // =============================================================================
  // RATE LIMITING CONFIGURATION
  // =============================================================================

  @IsNumber()
  @Min(1000)
  @Max(3600000) // Max 1 hour
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_WINDOW_MS: number = 60000; // 1 minute

  @IsNumber()
  @Min(1)
  @Max(10000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_MAX_REQUESTS_PER_IP: number = 100;

  @IsNumber()
  @Min(1)
  @Max(100000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_MAX_REQUESTS_PER_USER: number = 1000;

  // IP Rate Limiting
  @IsNumber()
  @Min(10)
  @Max(1000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_IP_MAX: number = 100;

  @IsNumber()
  @Min(1000)
  @Max(3600000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_IP_WINDOW_MS: number = 60000;

  @IsNumber()
  @Min(60000)
  @Max(86400000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_IP_BLOCK_DURATION_MS: number = 300000;

  // User Rate Limiting
  @IsNumber()
  @Min(100)
  @Max(10000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_USER_MAX: number = 1000;

  @IsNumber()
  @Min(60000)
  @Max(86400000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_USER_WINDOW_MS: number = 3600000;

  @IsNumber()
  @Min(60000)
  @Max(86400000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_USER_BLOCK_DURATION_MS: number = 900000;

  // Login Rate Limiting
  @IsNumber()
  @Min(3)
  @Max(20)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_LOGIN_MAX: number = 5;

  @IsNumber()
  @Min(300000)
  @Max(3600000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_LOGIN_WINDOW_MS: number = 900000;

  @IsNumber()
  @Min(300000)
  @Max(7200000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_LOGIN_BLOCK_DURATION_MS: number = 1800000;

  // Refresh Token Rate Limiting
  @IsNumber()
  @Min(5)
  @Max(50)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_REFRESH_MAX: number = 10;

  @IsNumber()
  @Min(60000)
  @Max(3600000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_REFRESH_WINDOW_MS: number = 60000;

  @IsNumber()
  @Min(300000)
  @Max(3600000)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_REFRESH_BLOCK_DURATION_MS: number = 600000;

  // =============================================================================
  // CORS AND SECURITY
  // =============================================================================

  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS?: string = 'http://localhost:3000';

  // =============================================================================
  // LOGGING CONFIGURATION
  // =============================================================================

  @IsEnum(['error', 'warn', 'log', 'debug', 'verbose'])
  @IsOptional()
  LOG_LEVEL?: string = 'info';

  @IsEnum(['json', 'text'])
  @IsOptional()
  LOG_FORMAT?: string = 'json';

  @IsString()
  @IsOptional()
  LOG_DIR?: string = 'logs';

  // =============================================================================
  // SWAGGER CONFIGURATION
  // =============================================================================

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  SWAGGER_ENABLED: boolean = false; // Default false for production

  @IsString()
  @IsOptional()
  SWAGGER_PATH?: string = 'api';

  // =============================================================================
  // FILE UPLOAD CONFIGURATION
  // =============================================================================

  @IsNumber()
  @Min(1024)
  @Max(104857600) // Max 100MB
  @Transform(({ value }) => parseInt(value, 10))
  MAX_FILE_SIZE: number = 10485760; // 10MB

  // =============================================================================
  // MULTI-TENANT CONFIGURATION
  // =============================================================================

  @IsString()
  @IsOptional()
  DEFAULT_ORGANIZATION_DOMAIN?: string = 'localhost';

  // =============================================================================
  // EXTERNAL SERVICES (OPTIONAL)
  // =============================================================================

  // =============================================================================
  // EMAIL - RESEND
  // =============================================================================

  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  @IsString()
  @IsOptional()
  RESEND_FROM_EMAIL?: string;

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD?: string;

  @IsEnum(['local', 's3', 'gcs'])
  @IsOptional()
  STORAGE_TYPE?: string = 'local';

  @IsString()
  @IsOptional()
  STORAGE_LOCAL_PATH?: string = './uploads';

  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  AWS_REGION?: string;

  @IsString()
  @IsOptional()
  AWS_S3_BUCKET?: string;

  @IsUrl()
  @IsOptional()
  WEBHOOK_URL?: string;

  @IsString()
  @IsOptional()
  WEBHOOK_SECRET?: string;

  @IsUrl()
  @IsOptional()
  PROMETHEUS_URL?: string;

  @IsUrl()
  @IsOptional()
  GRAFANA_URL?: string;

  // =============================================================================
  // TESTING CONFIGURATION
  // =============================================================================

  @IsString()
  @IsOptional()
  TEST_DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  TEST_REDIS_URL?: string;

  // =============================================================================
  // SENTRY / ERROR TRACKING
  // =============================================================================

  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  // =============================================================================
  // PRISMA CONFIGURATION
  // =============================================================================

  @IsString()
  @IsOptional()
  npm_package_version?: string;
}

/**
 * Validates environment variables and returns a validated configuration object
 * @param config - Raw environment variables object
 * @returns Validated EnvironmentVariables instance
 * @throws Error if validation fails
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => {
      const constraints = error.constraints ? Object.values(error.constraints) : [];
      return `${error.property}: ${constraints.join(', ')}`;
    });

    throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
  }

  // Additional custom validations
  validateProductionRequirements(validatedConfig);

  return validatedConfig;
}

/**
 * Validates production-specific requirements
 * @param config - Validated environment configuration
 * @throws Error if production requirements are not met
 */
function validateProductionRequirements(config: EnvironmentVariables): void {
  if (config.NODE_ENV === Environment.Production) {
    // Critical production validations
    const productionErrors: string[] = [];

    // JWT secrets must not be default values
    if (config.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      productionErrors.push('JWT_SECRET must be changed from default value in production');
    }

    if (config.JWT_REFRESH_SECRET === 'your-super-secret-refresh-key-change-in-production') {
      productionErrors.push('JWT_REFRESH_SECRET must be changed from default value in production');
    }

    // JWT secrets must be strong enough
    if (config.JWT_SECRET.length < 32) {
      productionErrors.push('JWT_SECRET must be at least 32 characters long in production');
    }

    if (config.JWT_REFRESH_SECRET.length < 32) {
      productionErrors.push('JWT_REFRESH_SECRET must be at least 32 characters long in production');
    }

    // Swagger should be disabled in production
    if (config.SWAGGER_ENABLED) {
      productionErrors.push('SWAGGER_ENABLED should be false in production for security');
    }

    // CORS should be properly configured
    if (config.ALLOWED_ORIGINS?.includes('http://localhost')) {
      productionErrors.push('ALLOWED_ORIGINS should not include localhost in production');
    }

    // Log level should not be debug/verbose in production
    if (config.LOG_LEVEL === 'debug' || config.LOG_LEVEL === 'verbose') {
      productionErrors.push('LOG_LEVEL should not be debug or verbose in production');
    }

    // Rate limiting should be stricter in production
    if (config.RATE_LIMIT_MAX_REQUESTS_PER_IP > 100) {
      productionErrors.push('RATE_LIMIT_MAX_REQUESTS_PER_IP should be <= 100 in production');
    }

    if (productionErrors.length > 0) {
      throw new Error(`Production environment validation failed:\n${productionErrors.join('\n')}`);
    }
  }
}

/**
 * Gets environment-specific default values
 * @param env - Current environment
 * @returns Object with environment-specific defaults
 */
export function getEnvironmentDefaults(env: Environment) {
  const defaults = {
    [Environment.Development]: {
      LOG_LEVEL: 'debug',
      SWAGGER_ENABLED: true,
      RATE_LIMIT_MAX_REQUESTS_PER_IP: 1000,
      REQUIRE_MFA: false,
    },
    [Environment.Production]: {
      LOG_LEVEL: 'warn',
      SWAGGER_ENABLED: false,
      RATE_LIMIT_MAX_REQUESTS_PER_IP: 50,
      REQUIRE_MFA: true,
    },
    [Environment.Test]: {
      LOG_LEVEL: 'error',
      SWAGGER_ENABLED: false,
      RATE_LIMIT_MAX_REQUESTS_PER_IP: 10000,
      REQUIRE_MFA: false,
    },
  };

  return defaults[env] || defaults[Environment.Development];
}

/**
 * Type-safe environment configuration getter
 */
export type ValidatedEnvironment = EnvironmentVariables;
