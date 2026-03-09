import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionData } from './createIntegrationConnectionUseCase.js';
import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';

export interface IGetIntegrationConnectionByIdRequest {
  connectionId: string;
  orgId: string;
}

export type IGetIntegrationConnectionByIdResponse = IApiResponseSuccess<IIntegrationConnectionData>;

@Injectable()
export class GetIntegrationConnectionByIdUseCase {
  private readonly logger = new Logger(GetIntegrationConnectionByIdUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository
  ) {}

  async execute(
    request: IGetIntegrationConnectionByIdRequest
  ): Promise<Result<IGetIntegrationConnectionByIdResponse, DomainError>> {
    this.logger.log('Getting integration connection by ID', {
      connectionId: request.connectionId,
      orgId: request.orgId,
    });

    const connection = await this.connectionRepository.findById(
      request.connectionId,
      request.orgId
    );
    if (!connection) {
      return err(
        new NotFoundError('Integration connection not found', 'INTEGRATION_CONNECTION_NOT_FOUND')
      );
    }

    return ok({
      success: true,
      message: 'Integration connection retrieved successfully',
      data: {
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
      },
      timestamp: new Date().toISOString(),
    });
  }
}
