import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { ContactsModule } from '@contacts/contacts.module';
import { InventoryModule } from '@inventory/inventory.module';
import { PrismaIntegrationConnectionRepository } from '@infrastructure/database/repositories/integrationConnection.repository';
import { PrismaIntegrationSyncLogRepository } from '@infrastructure/database/repositories/integrationSyncLog.repository';
import { PrismaIntegrationSkuMappingRepository } from '@infrastructure/database/repositories/integrationSkuMapping.repository';
import { EncryptionService } from './shared/encryption/encryption.service.js';
import { CreateIntegrationConnectionUseCase } from '@application/integrationUseCases/createIntegrationConnectionUseCase';
import { GetIntegrationConnectionsUseCase } from '@application/integrationUseCases/getIntegrationConnectionsUseCase';
import { GetIntegrationConnectionByIdUseCase } from '@application/integrationUseCases/getIntegrationConnectionByIdUseCase';
import { UpdateIntegrationConnectionUseCase } from '@application/integrationUseCases/updateIntegrationConnectionUseCase';
import { DeleteIntegrationConnectionUseCase } from '@application/integrationUseCases/deleteIntegrationConnectionUseCase';
import { CreateSkuMappingUseCase } from '@application/integrationUseCases/createSkuMappingUseCase';
import { DeleteSkuMappingUseCase } from '@application/integrationUseCases/deleteSkuMappingUseCase';
import { GetSkuMappingsUseCase } from '@application/integrationUseCases/getSkuMappingsUseCase';
import { GetUnmatchedSkusUseCase } from '@application/integrationUseCases/getUnmatchedSkusUseCase';
import { RetrySyncUseCase } from '@application/integrationUseCases/retrySyncUseCase';
import { RetryAllFailedSyncsUseCase } from '@application/integrationUseCases/retryAllFailedSyncsUseCase';
import { VtexModule } from './vtex/vtex.module.js';

@Module({
  imports: [PrismaModule, ContactsModule, InventoryModule, VtexModule],
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
    // CRUD Use Cases
    CreateIntegrationConnectionUseCase,
    GetIntegrationConnectionsUseCase,
    GetIntegrationConnectionByIdUseCase,
    UpdateIntegrationConnectionUseCase,
    DeleteIntegrationConnectionUseCase,
    // SKU Mapping Use Cases
    CreateSkuMappingUseCase,
    DeleteSkuMappingUseCase,
    GetSkuMappingsUseCase,
    GetUnmatchedSkusUseCase,
    // Retry Use Cases
    RetrySyncUseCase,
    RetryAllFailedSyncsUseCase,
  ],
  exports: [
    // Re-export VtexModule so consumers (e.g., IntegrationsHttpModule) get VTEX use cases
    VtexModule,
    // CRUD Use Cases
    CreateIntegrationConnectionUseCase,
    GetIntegrationConnectionsUseCase,
    GetIntegrationConnectionByIdUseCase,
    UpdateIntegrationConnectionUseCase,
    DeleteIntegrationConnectionUseCase,
    // SKU Mapping Use Cases
    CreateSkuMappingUseCase,
    DeleteSkuMappingUseCase,
    GetSkuMappingsUseCase,
    GetUnmatchedSkusUseCase,
    // Retry Use Cases
    RetrySyncUseCase,
    RetryAllFailedSyncsUseCase,
    // Shared services & repositories
    EncryptionService,
    'IntegrationConnectionRepository',
    'IntegrationSyncLogRepository',
    'IntegrationSkuMappingRepository',
  ],
})
export class IntegrationsModule {}
