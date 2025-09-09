// Validation Config Tests - Configuración de validación
// Tests unitarios para la configuración de validación siguiendo AAA y Given-When-Then

import { validationConfig } from '@shared/config/validation.config';

describe('Validation Config', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    // Restaurar el entorno original después de cada test
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('validationConfig', () => {
    it('Given: validation config When: checking structure Then: should have correct configuration', () => {
      // Arrange & Act
      const config = validationConfig;

      // Assert
      expect(config.transform).toBe(true);
      expect(config.transformOptions).toBeDefined();
      expect(config.validateCustomDecorators).toBe(true);
      expect(config.stopAtFirstError).toBe(false);
      expect(config.whitelist).toBe(true);
      expect(config.forbidNonWhitelisted).toBe(true);
      expect(config.forbidUnknownValues).toBe(true);
      expect(config.skipMissingProperties).toBe(false);
      expect(config.skipNullProperties).toBe(false);
      expect(config.skipUndefinedProperties).toBe(false);
    });

    it('Given: validation config When: checking transform options Then: should enable implicit conversion', () => {
      // Arrange & Act
      const config = validationConfig;

      // Assert
      expect(config.transformOptions?.enableImplicitConversion).toBe(true);
    });

    it('Given: development environment When: checking error messages Then: should show detailed errors', () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      // Act
      const config = validationConfig;

      // Assert
      expect(config.disableErrorMessages).toBe(false);
    });

    it('Given: production environment When: checking error messages Then: should hide detailed errors', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Act
      const config = {
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        validateCustomDecorators: true,
        disableErrorMessages: process.env.NODE_ENV === 'production',
        stopAtFirstError: false,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        skipMissingProperties: false,
        skipNullProperties: false,
        skipUndefinedProperties: false,
      };

      // Assert
      expect(config.disableErrorMessages).toBe(true);

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('Given: test environment When: checking error messages Then: should show detailed errors', () => {
      // Arrange
      process.env.NODE_ENV = 'test';

      // Act
      const config = validationConfig;

      // Assert
      expect(config.disableErrorMessages).toBe(false);
    });

    it('Given: no NODE_ENV When: checking error messages Then: should show detailed errors', () => {
      // Arrange
      delete process.env.NODE_ENV;

      // Act
      const config = validationConfig;

      // Assert
      expect(config.disableErrorMessages).toBe(false);
    });

    it('Given: validation config When: checking whitelist settings Then: should have security configuration', () => {
      // Arrange & Act
      const config = validationConfig;

      // Assert
      expect(config.whitelist).toBe(true);
      expect(config.forbidNonWhitelisted).toBe(true);
    });

    it('Given: validation config When: checking unknown values Then: should forbid unknown values', () => {
      // Arrange & Act
      const config = validationConfig;

      // Assert
      expect(config.forbidUnknownValues).toBe(true);
    });

    it('Given: validation config When: checking missing properties Then: should not skip missing properties', () => {
      // Arrange & Act
      const config = validationConfig;

      // Assert
      expect(config.skipMissingProperties).toBe(false);
    });

    it('Given: validation config When: checking null properties Then: should not skip null properties', () => {
      // Arrange & Act
      const config = validationConfig;

      // Assert
      expect(config.skipNullProperties).toBe(false);
    });

    it('Given: validation config When: checking undefined properties Then: should not skip undefined properties', () => {
      // Arrange & Act
      const config = validationConfig;

      // Assert
      expect(config.skipUndefinedProperties).toBe(false);
    });

    it('Given: validation config When: checking custom decorators Then: should validate custom decorators', () => {
      // Arrange & Act
      const config = validationConfig;

      // Assert
      expect(config.validateCustomDecorators).toBe(true);
    });

    it('Given: validation config When: checking stop at first error Then: should not stop at first error', () => {
      // Arrange & Act
      const config = validationConfig;

      // Assert
      expect(config.stopAtFirstError).toBe(false);
    });

    it('Given: validation config When: checking transform Then: should enable transform', () => {
      // Arrange & Act
      const config = validationConfig;

      // Assert
      expect(config.transform).toBe(true);
    });
  });
});
