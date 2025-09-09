// Prisma Module - NestJS Module para base de datos
// Proporciona el servicio de Prisma para toda la aplicación

import { PrismaService } from '@infrastructure/database/prisma.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
