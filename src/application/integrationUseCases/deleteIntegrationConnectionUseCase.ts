import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';

export interface IDeleteIntegrationConnectionRequest {
  connectionId: string;
  orgId: string;
}

export type IDeleteIntegrationConnectionResponse = IApiResponseSuccess<{ id: string }>;

@Injectable()
export class DeleteIntegrationConnectionUseCase {
  private readonly logger = new Logger(DeleteIntegrationConnectionUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository
  ) {}

  async execute(
    request: IDeleteIntegrationConnectionRequest
  ): Promise<Result<IDeleteIntegrationConnectionResponse, DomainError>> {
    this.logger.log('Deleting integration connection', {
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

    await this.connectionRepository.delete(request.connectionId, request.orgId);

    return ok({
      success: true,
      message: 'Integration connection deleted successfully',
      data: { id: request.connectionId },
      timestamp: new Date().toISOString(),
    });
  }
}
