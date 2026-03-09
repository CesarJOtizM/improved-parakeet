import { Inject, Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from '../../integrations/shared/encryption/encryption.service.js';
import {
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionData } from './createIntegrationConnectionUseCase.js';
import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface IUpdateIntegrationConnectionRequest {
  connectionId: string;
  orgId: string;
  storeName?: string;
  appKey?: string;
  appToken?: string;
  syncStrategy?: string;
  syncDirection?: string;
  defaultWarehouseId?: string;
  defaultContactId?: string;
  companyId?: string;
}

export type IUpdateIntegrationConnectionResponse = IApiResponseSuccess<IIntegrationConnectionData>;

@Injectable()
export class UpdateIntegrationConnectionUseCase {
  private readonly logger = new Logger(UpdateIntegrationConnectionUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly encryptionService: EncryptionService
  ) {}

  async execute(
    request: IUpdateIntegrationConnectionRequest
  ): Promise<Result<IUpdateIntegrationConnectionResponse, DomainError>> {
    this.logger.log('Updating integration connection', {
      connectionId: request.connectionId,
      orgId: request.orgId,
    });

    try {
      const connection = await this.connectionRepository.findById(
        request.connectionId,
        request.orgId
      );
      if (!connection) {
        return err(
          new NotFoundError('Integration connection not found', 'INTEGRATION_CONNECTION_NOT_FOUND')
        );
      }

      // Validate new warehouse if changing
      if (
        request.defaultWarehouseId &&
        request.defaultWarehouseId !== connection.defaultWarehouseId
      ) {
        const warehouse = await this.warehouseRepository.findById(
          request.defaultWarehouseId,
          request.orgId
        );
        if (!warehouse) {
          return err(new NotFoundError('Default warehouse not found', 'WAREHOUSE_NOT_FOUND'));
        }
      }

      // Re-encrypt credentials if changed
      if (request.appKey && request.appToken) {
        const encryptedAppKey = this.encryptionService.encrypt(request.appKey);
        const encryptedAppToken = this.encryptionService.encrypt(request.appToken);
        connection.updateCredentials(encryptedAppKey, encryptedAppToken);
      }

      // Update other fields
      connection.update({
        storeName: request.storeName,
        syncStrategy: request.syncStrategy,
        syncDirection: request.syncDirection,
        defaultWarehouseId: request.defaultWarehouseId,
        defaultContactId: request.defaultContactId,
        companyId: request.companyId,
      });

      const saved = await this.connectionRepository.update(connection);

      return ok({
        success: true,
        message: 'Integration connection updated successfully',
        data: {
          id: saved.id,
          provider: saved.provider,
          accountName: saved.accountName,
          storeName: saved.storeName,
          status: saved.status,
          syncStrategy: saved.syncStrategy,
          syncDirection: saved.syncDirection,
          webhookSecret: saved.webhookSecret,
          defaultWarehouseId: saved.defaultWarehouseId,
          defaultContactId: saved.defaultContactId,
          connectedAt: saved.connectedAt,
          lastSyncAt: saved.lastSyncAt,
          lastSyncError: saved.lastSyncError,
          companyId: saved.companyId,
          createdBy: saved.createdBy,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error updating integration connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Failed to update integration connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INTEGRATION_CONNECTION_UPDATE_ERROR'
        )
      );
    }
  }
}
