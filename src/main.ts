import './instrument';
import helmet from 'helmet';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { validationConfig } from '@shared/config';
import { GlobalExceptionFilter } from '@shared/filters/globalExceptionFilter';
import { AppModule } from '@src/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Trust first proxy (e.g., Render, Vercel, load balancer)
  app.set('trust proxy', 1);

  // Enable extended query parser for nested objects like dateRange[startDate]
  app.set('query parser', 'extended');

  // Graceful shutdown — NestJS lifecycle hooks (onModuleDestroy, beforeApplicationShutdown)
  app.enableShutdownHooks();

  // Global pipes and filters
  app.useGlobalPipes(new ValidationPipe(validationConfig));
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
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

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disabled for API
      hsts: { maxAge: 31536000, includeSubDomains: true },
    })
  );

  // Swagger — only enabled when SWAGGER_ENABLED=true (disabled by default in production)
  if (process.env.SWAGGER_ENABLED === 'true') {
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
    logger.log('Swagger documentation enabled at /api');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}

bootstrap();
