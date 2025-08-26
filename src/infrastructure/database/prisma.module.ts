// Prisma Module - NestJS Module para base de datos
// Proporciona el servicio de Prisma para toda la aplicación

import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
