import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IntegrationConnection } from '../../integrations/shared/domain/entities/integrationConnection.entity.js';
import { EncryptionService } from '../../integrations/shared/encryption/encryption.service.js';
import {
  ConflictError,
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface ICreateIntegrationConnectionRequest {
  provider: string;
  accountName: string;
  storeName: string;
  appKey: string;
  appToken: string;
  syncStrategy?: string;
  syncDirection?: string;
  defaultWarehouseId: string;
  defaultContactId?: string;
  companyId?: string;
  createdBy: string;
  orgId: string;
}

export interface IIntegrationConnectionData {
  id: string;
  provider: string;
  accountName: string;
  storeName: string;
  status: string;
  syncStrategy: string;
  syncDirection: string;
  webhookSecret: string;
  defaultWarehouseId: string;
  defaultContactId?: string;
  connectedAt?: Date;
  lastSyncAt?: Date;
  lastSyncError?: string;
  companyId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ICreateIntegrationConnectionResponse = IApiResponseSuccess<IIntegrationConnectionData>;

@Injectable()
export class CreateIntegrationConnectionUseCase {
  private readonly logger = new Logger(CreateIntegrationConnectionUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly encryptionService: EncryptionService
  ) {}

  async execute(
    request: ICreateIntegrationConnectionRequest
  ): Promise<Result<ICreateIntegrationConnectionResponse, DomainError>> {
    this.logger.log('Creating integration connection', {
      provider: request.provider,
      accountName: request.accountName,
      orgId: request.orgId,
    });

    try {
      // Validate warehouse exists
      const warehouse = await this.warehouseRepository.findById(
        request.defaultWarehouseId,
        request.orgId
      );
      if (!warehouse) {
        return err(new NotFoundError('Default warehouse not found', 'WAREHOUSE_NOT_FOUND'));
      }

      // Check for duplicate connection
      const existing = await this.connectionRepository.findByProviderAndAccount(
        request.provider,
        request.accountName,
        request.orgId
      );
      if (existing) {
        return err(
          new ConflictError(
            'A connection with this provider and account already exists',
            'INTEGRATION_CONNECTION_CONFLICT'
          )
        );
      }

      // Encrypt credentials
      const encryptedAppKey = this.encryptionService.encrypt(request.appKey);
      const encryptedAppToken = this.encryptionService.encrypt(request.appToken);
      const webhookSecret = crypto.randomUUID();

      const connection = IntegrationConnection.create(
        {
          provider: request.provider,
          accountName: request.accountName,
          storeName: request.storeName,
          syncStrategy: request.syncStrategy || 'BOTH',
          syncDirection: request.syncDirection || 'BIDIRECTIONAL',
          encryptedAppKey,
          encryptedAppToken,
          webhookSecret,
          defaultWarehouseId: request.defaultWarehouseId,
          defaultContactId: request.defaultContactId,
          companyId: request.companyId,
          createdBy: request.createdBy,
        },
        request.orgId
      );

      const saved = await this.connectionRepository.save(connection);

      return ok({
        success: true,
        message: 'Integration connection created successfully',
        data: this.toResponseData(saved),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error creating integration connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string };
        if (prismaError.code === 'P2002') {
          return err(
            new ConflictError(
              'A connection with this provider and account already exists',
              'INTEGRATION_CONNECTION_CONFLICT'
            )
          );
        }
      }

      return err(
        new ValidationError(
          `Failed to create integration connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INTEGRATION_CONNECTION_CREATION_ERROR'
        )
      );
    }
  }

  private toResponseData(connection: IntegrationConnection): IIntegrationConnectionData {
    return {
      id: connection.id,
      provider: connection.provider,
      accountName: connection.accountName,
      storeName: connection.storeName,
      status: connection.status,
      syncStrategy: connection.syncStrategy,
      syncDirection: connection.syncDirection,
      webhookSecret: connection.webhookSecret,
      defaultWarehouseId: connection.defaultWarehouseId,
      defaultContactId: connection.defaultContactId,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      lastSyncError: connection.lastSyncError,
      companyId: connection.companyId,
      createdBy: connection.createdBy,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }
}
