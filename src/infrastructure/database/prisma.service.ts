// Prisma Service - Servicio de base de datos
// Maneja la conexión y operaciones de Prisma

import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
