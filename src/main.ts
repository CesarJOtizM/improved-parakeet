import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { validationConfig } from '@shared/config';
import { AppModule } from '@src/app.module';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Enable extended query parser for nested objects like dateRange[startDate]
  app.set('query parser', 'extended');

  // API Versioning — Header-based so URLs remain stable
  // Clients can send X-API-Version header; defaults to '1' if omitted
  // API Versioning — disabled for now (no routes use @Version decorators)
  // Clients can still send X-API-Version header for future use

  // Graceful shutdown — NestJS lifecycle hooks (onModuleDestroy, beforeApplicationShutdown)
  app.enableShutdownHooks();

  // Configuración global de validación
  app.useGlobalPipes(new ValidationPipe(validationConfig));

  // Configuración de seguridad global
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Organization-ID',
      'X-Organization-Slug',
      'X-User-ID',
      'X-API-Version',
    ],
  });

  // Security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Inventory System API')
    .setDescription('Multi-Tenant Inventory System API with DDD and Hexagonal Architecture')
    .setVersion('1.0.0')
    .addTag('Health Check', 'System health verification endpoints')
    .addTag('Auth', 'Authentication and authorization endpoints')
    .addTag('Inventory', 'Inventory management endpoints')
    .addTag('Reports', 'Reporting and export endpoints')
    .addTag('Imports', 'Bulk import endpoints')
    .addTag('Organization', 'Organizational configuration endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}

bootstrap();
