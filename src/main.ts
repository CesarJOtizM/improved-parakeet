import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@src/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
