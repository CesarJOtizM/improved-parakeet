// Prisma Module - NestJS Module para base de datos
// Proporciona el servicio de Prisma para toda la aplicación

import { PrismaService } from '@infrastructure/database/prisma.service';
import { UnitOfWork } from '@infrastructure/database/unitOfWork.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [PrismaService, UnitOfWork],
  exports: [PrismaService, UnitOfWork],
})
export class PrismaModule {}
