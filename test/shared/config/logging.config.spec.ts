// Logging Config Tests - Configuración de logging de seguridad
// Tests unitarios para la configuración de logging siguiendo AAA y Given-When-Then

import {
  defaultSecurityLoggingConfig,
  getSecurityLoggingConfig,
} from '@shared/config/logging.config';

describe('Logging Config', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    // Restaurar el entorno original después de cada test
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('getSecurityLoggingConfig', () => {
    it('Given: development environment When: getting config Then: should return development config', () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      // Act
      const config = getSecurityLoggingConfig();

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.level).toBe('debug');
      expect(config.includeSensitiveData).toBe(false);
      expect(config.logAuthentication).toBe(true);
      expect(config.logAuthorization).toBe(true);
      expect(config.logRateLimiting).toBe(true);
      expect(config.logSecurityHeaders).toBe(true);
      expect(config.logUserActions).toBe(true);
      expect(config.logErrors).toBe(true);
      expect(config.logFailedLogins).toBe(true);
      expect(config.logLockouts).toBe(true);
    });

    it('Given: production environment When: getting config Then: should return production config', () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act
      const config = getSecurityLoggingConfig();

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.level).toBe('warn');
      expect(config.includeSensitiveData).toBe(false);
      expect(config.logAuthentication).toBe(true);
      expect(config.logAuthorization).toBe(true);
      expect(config.logRateLimiting).toBe(true);
      expect(config.logSecurityHeaders).toBe(false);
      expect(config.logUserActions).toBe(true);
      expect(config.logErrors).toBe(true);
      expect(config.logFailedLogins).toBe(true);
      expect(config.logLockouts).toBe(true);
    });

    it('Given: test environment When: getting config Then: should return test config', () => {
      // Arrange
      process.env.NODE_ENV = 'test';

      // Act
      const config = getSecurityLoggingConfig();

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.level).toBe('error');
      expect(config.includeSensitiveData).toBe(false);
      expect(config.logAuthentication).toBe(false);
      expect(config.logAuthorization).toBe(false);
      expect(config.logRateLimiting).toBe(false);
      expect(config.logSecurityHeaders).toBe(false);
      expect(config.logUserActions).toBe(false);
      expect(config.logErrors).toBe(true);
      expect(config.logFailedLogins).toBe(false);
      expect(config.logLockouts).toBe(false);
    });

    it('Given: no NODE_ENV When: getting config Then: should return development config as default', () => {
      // Arrange
      delete process.env.NODE_ENV;

      // Act
      const config = getSecurityLoggingConfig();

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.level).toBe('debug');
      expect(config.includeSensitiveData).toBe(false);
      expect(config.logAuthentication).toBe(true);
      expect(config.logAuthorization).toBe(true);
      expect(config.logRateLimiting).toBe(true);
      expect(config.logSecurityHeaders).toBe(true);
      expect(config.logUserActions).toBe(true);
      expect(config.logErrors).toBe(true);
      expect(config.logFailedLogins).toBe(true);
      expect(config.logLockouts).toBe(true);
    });

    it('Given: unknown environment When: getting config Then: should return development config as fallback', () => {
      // Arrange
      process.env.NODE_ENV = 'unknown';

      // Act
      const config = getSecurityLoggingConfig();

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.level).toBe('debug');
      expect(config.includeSensitiveData).toBe(false);
      expect(config.logAuthentication).toBe(true);
      expect(config.logAuthorization).toBe(true);
      expect(config.logRateLimiting).toBe(true);
      expect(config.logSecurityHeaders).toBe(false); // env !== 'development'
      expect(config.logUserActions).toBe(true);
      expect(config.logErrors).toBe(true);
      expect(config.logFailedLogins).toBe(true);
      expect(config.logLockouts).toBe(true);
    });
  });

  describe('defaultSecurityLoggingConfig', () => {
    it('Given: default config When: checking structure Then: should have correct default values', () => {
      // Arrange & Act
      const config = defaultSecurityLoggingConfig;

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.level).toBe('info');
      expect(config.includeSensitiveData).toBe(false);
      expect(config.logAuthentication).toBe(true);
      expect(config.logAuthorization).toBe(true);
      expect(config.logRateLimiting).toBe(true);
      expect(config.logSecurityHeaders).toBe(false);
      expect(config.logUserActions).toBe(true);
      expect(config.logErrors).toBe(true);
      expect(config.logFailedLogins).toBe(true);
      expect(config.logLockouts).toBe(true);
    });

    it('Given: default config When: checking level Then: should be valid log level', () => {
      // Arrange & Act
      const config = defaultSecurityLoggingConfig;

      // Assert
      expect(['debug', 'info', 'warn', 'error']).toContain(config.level);
    });

    it('Given: default config When: checking sensitive data Then: should never include sensitive data', () => {
      // Arrange & Act
      const config = defaultSecurityLoggingConfig;

      // Assert
      expect(config.includeSensitiveData).toBe(false);
    });
  });
});
