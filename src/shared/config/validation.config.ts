import { ValidationPipeOptions } from '@nestjs/common';

export const validationConfig: ValidationPipeOptions = {
  // Transformar automáticamente los tipos de datos
  transform: true,

  // Permitir transformación de tipos primitivos
  transformOptions: {
    enableImplicitConversion: true,
  },

  // Validar automáticamente todos los DTOs
  validateCustomDecorators: true,

  // Mostrar errores detallados en desarrollo
  disableErrorMessages: process.env.NODE_ENV === 'production',

  // Lanzar error en la primera validación fallida
  stopAtFirstError: false,

  // Configuración de whitelist para seguridad
  whitelist: true,
  forbidNonWhitelisted: true,

  // Configuración de transformación
  forbidUnknownValues: true,

  // Configuración de validación de objetos
  skipMissingProperties: false,

  // Configuración de validación de tipos
  skipNullProperties: false,
  skipUndefinedProperties: false,
};
