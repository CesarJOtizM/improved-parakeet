export interface ISecurityLoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  includeSensitiveData: boolean;
  logAuthentication: boolean;
  logAuthorization: boolean;
  logRateLimiting: boolean;
  logSecurityHeaders: boolean;
  logUserActions: boolean;
  logErrors: boolean;
  logFailedLogins: boolean;
  logLockouts: boolean;
}

// Función para obtener la configuración de logging desde auth.config.ts
export function getSecurityLoggingConfig(): ISecurityLoggingConfig {
  const env = process.env.NODE_ENV || 'development';

  // Configuración base según el entorno
  const baseConfig: ISecurityLoggingConfig = {
    enabled: true,
    level: env === 'production' ? 'warn' : 'debug',
    includeSensitiveData: false, // Nunca incluir datos sensibles
    logAuthentication: true,
    logAuthorization: true,
    logRateLimiting: true,
    logSecurityHeaders: env === 'development',
    logUserActions: true,
    logErrors: true,
    logFailedLogins: true,
    logLockouts: true,
  };

  // Configuración específica para testing
  if (env === 'test') {
    return {
      ...baseConfig,
      level: 'error',
      logAuthentication: false,
      logAuthorization: false,
      logRateLimiting: false,
      logUserActions: false,
      logFailedLogins: false,
      logLockouts: false,
    };
  }

  return baseConfig;
}

// Configuración por defecto (fallback si no hay auth.config)
export const defaultSecurityLoggingConfig: ISecurityLoggingConfig = {
  enabled: true,
  level: 'info',
  includeSensitiveData: false,
  logAuthentication: true,
  logAuthorization: true,
  logRateLimiting: true,
  logSecurityHeaders: false,
  logUserActions: true,
  logErrors: true,
  logFailedLogins: true,
  logLockouts: true,
};
