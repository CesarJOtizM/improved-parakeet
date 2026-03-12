import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { ContactsModule } from '@contacts/contacts.module';
import { InventoryModule } from '@inventory/inventory.module';
import { SalesModule } from '@sale/sales.module';
import { PrismaIntegrationConnectionRepository } from '@infrastructure/database/repositories/integrationConnection.repository';
import { PrismaIntegrationSyncLogRepository } from '@infrastructure/database/repositories/integrationSyncLog.repository';
import { PrismaIntegrationSkuMappingRepository } from '@infrastructure/database/repositories/integrationSkuMapping.repository';
import { EncryptionService } from '../shared/encryption/encryption.service.js';
import { MeliTokenService } from './infrastructure/meliTokenService.js';
import { MeliApiClient } from './infrastructure/meliApiClient.js';
import { MeliExchangeAuthCodeUseCase } from './application/meliExchangeAuthCodeUseCase.js';
import { MeliTestConnectionUseCase } from './application/meliTestConnectionUseCase.js';
import { MeliSyncOrderUseCase } from './application/meliSyncOrderUseCase.js';
import { MeliPollOrdersUseCase } from './application/meliPollOrdersUseCase.js';
import { MeliPollingJob } from './jobs/meliPollingJob.js';

@Module({
  imports: [PrismaModule, ContactsModule, InventoryModule, SalesModule, ScheduleModule.forRoot()],
  providers: [
    // Repositories
    {
      provide: 'IntegrationConnectionRepository',
      useClass: PrismaIntegrationConnectionRepository,
    },
    {
      provide: 'IntegrationSyncLogRepository',
      useClass: PrismaIntegrationSyncLogRepository,
    },
    {
      provide: 'IntegrationSkuMappingRepository',
      useClass: PrismaIntegrationSkuMappingRepository,
    },
    // Shared services
    EncryptionService,
    // MeLi services
    MeliTokenService,
    MeliApiClient,
    // MeLi use cases
    MeliExchangeAuthCodeUseCase,
    MeliTestConnectionUseCase,
    MeliSyncOrderUseCase,
    MeliPollOrdersUseCase,
    // Scheduled jobs
    MeliPollingJob,
  ],
  exports: [
    MeliTokenService,
    MeliApiClient,
    MeliExchangeAuthCodeUseCase,
    MeliTestConnectionUseCase,
    MeliSyncOrderUseCase,
    MeliPollOrdersUseCase,
  ],
})
export class MercadoLibreModule {}
