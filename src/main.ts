import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { validationConfig } from '@shared/config';
import { AppModule } from '@src/app.module';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración global de validación
  app.useGlobalPipes(new ValidationPipe(validationConfig));

  // Configuración de seguridad global
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID'],
  });

  // Configuración de rate limiting global
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

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
