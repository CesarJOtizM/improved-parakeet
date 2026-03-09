import { Inject, Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from '../../shared/encryption/encryption.service.js';
import { VtexApiClient } from '../infrastructure/vtexApiClient.js';
import {
  DomainError,
  NotFoundError,
  ValidationError,
  Result,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionRepository } from '../../shared/domain/ports/iIntegrationConnectionRepository.port.js';

export interface IVtexOutboundSyncRequest {
  connectionId: string;
  externalOrderId: string;
  action: 'START_HANDLING' | 'INVOICE' | 'CANCEL';
  orgId: string;
  invoiceData?: {
    invoiceNumber: string;
    invoiceValue: number;
    issuanceDate: string;
    items: { id: string; quantity: number; price: number }[];
  };
  cancelReason?: string;
}

export type IVtexOutboundSyncResponse = IApiResponseSuccess<{
  externalOrderId: string;
  action: string;
  synced: boolean;
}>;

@Injectable()
export class VtexOutboundSyncUseCase {
  private readonly logger = new Logger(VtexOutboundSyncUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly vtexApiClient: VtexApiClient
  ) {}

  async execute(
    request: IVtexOutboundSyncRequest
  ): Promise<Result<IVtexOutboundSyncResponse, DomainError>> {
    this.logger.log('Outbound syncing to VTEX', {
      connectionId: request.connectionId,
      externalOrderId: request.externalOrderId,
      action: request.action,
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

      // Check sync direction allows outbound
      if (connection.syncDirection === 'INBOUND_ONLY') {
        return ok({
          success: true,
          message: 'Outbound sync skipped - connection is inbound only',
          data: {
            externalOrderId: request.externalOrderId,
            action: request.action,
            synced: false,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const appKey = this.encryptionService.decrypt(connection.encryptedAppKey);
      const appToken = this.encryptionService.decrypt(connection.encryptedAppToken);

      switch (request.action) {
        case 'START_HANDLING':
          await this.vtexApiClient.startHandling(
            connection.accountName,
            appKey,
            appToken,
            request.externalOrderId
          );
          break;

        case 'INVOICE':
          if (!request.invoiceData) {
            return err(
              new ValidationError(
                'Invoice data required for INVOICE action',
                'MISSING_INVOICE_DATA'
              )
            );
          }
          await this.vtexApiClient.sendInvoice(
            connection.accountName,
            appKey,
            appToken,
            request.externalOrderId,
            {
              type: 'Output',
              invoiceNumber: request.invoiceData.invoiceNumber,
              invoiceValue: request.invoiceData.invoiceValue,
              issuanceDate: request.invoiceData.issuanceDate,
              items: request.invoiceData.items,
            }
          );
          break;

        case 'CANCEL':
          await this.vtexApiClient.cancelOrder(
            connection.accountName,
            appKey,
            appToken,
            request.externalOrderId,
            request.cancelReason || 'Cancelled from Nevada'
          );
          break;
      }

      return ok({
        success: true,
        message: `VTEX outbound sync completed: ${request.action}`,
        data: {
          externalOrderId: request.externalOrderId,
          action: request.action,
          synced: true,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error in outbound VTEX sync', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action: request.action,
        externalOrderId: request.externalOrderId,
      });
      return err(
        new ValidationError(
          `Outbound sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'VTEX_OUTBOUND_SYNC_ERROR'
        )
      );
    }
  }
}
