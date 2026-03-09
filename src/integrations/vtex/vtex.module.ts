import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { ContactsModule } from '@contacts/contacts.module';
import { InventoryModule } from '@inventory/inventory.module';
import { PrismaIntegrationConnectionRepository } from '@infrastructure/database/repositories/integrationConnection.repository';
import { PrismaIntegrationSyncLogRepository } from '@infrastructure/database/repositories/integrationSyncLog.repository';
import { PrismaIntegrationSkuMappingRepository } from '@infrastructure/database/repositories/integrationSkuMapping.repository';
import { EncryptionService } from '../shared/encryption/encryption.service.js';
import { VtexApiClient } from './infrastructure/vtexApiClient.js';
import { VtexTestConnectionUseCase } from './application/vtexTestConnectionUseCase.js';
import { VtexSyncOrderUseCase } from './application/vtexSyncOrderUseCase.js';
import { VtexPollOrdersUseCase } from './application/vtexPollOrdersUseCase.js';
import { VtexRegisterWebhookUseCase } from './application/vtexRegisterWebhookUseCase.js';
import { VtexOutboundSyncUseCase } from './application/vtexOutboundSyncUseCase.js';
import { VtexPollingJob } from './jobs/vtexPollingJob.js';
import { VtexOutboundSyncHandler } from './events/vtexOutboundSyncHandler.js';

@Module({
  imports: [PrismaModule, ContactsModule, InventoryModule, ScheduleModule.forRoot()],
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
    // VTEX services
    VtexApiClient,
    // VTEX use cases
    VtexTestConnectionUseCase,
    VtexSyncOrderUseCase,
    VtexPollOrdersUseCase,
    VtexRegisterWebhookUseCase,
    VtexOutboundSyncUseCase,
    // Scheduled jobs
    VtexPollingJob,
    // Event handlers
    VtexOutboundSyncHandler,
  ],
  exports: [
    VtexTestConnectionUseCase,
    VtexSyncOrderUseCase,
    VtexPollOrdersUseCase,
    VtexRegisterWebhookUseCase,
    VtexOutboundSyncUseCase,
    VtexApiClient,
    VtexOutboundSyncHandler,
  ],
})
export class VtexModule {}
