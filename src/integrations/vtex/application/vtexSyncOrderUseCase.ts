import { Inject, Injectable, Logger } from '@nestjs/common';
import { Contact } from '@contacts/domain/entities/contact.entity';
import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { EncryptionService } from '../../shared/encryption/encryption.service.js';
import { IntegrationSyncLog } from '../../shared/domain/entities/integrationSyncLog.entity.js';
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
import type { IIntegrationSyncLogRepository } from '../../shared/domain/ports/iIntegrationSyncLogRepository.port.js';
import type { IIntegrationSkuMappingRepository } from '../../shared/domain/ports/iIntegrationSkuMappingRepository.port.js';
import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { VtexOrderDetail } from '../dto/vtex-api.types.js';

export interface IVtexSyncOrderRequest {
  connectionId: string;
  externalOrderId: string;
  orgId: string;
}

export type IVtexSyncOrderResponse = IApiResponseSuccess<{
  externalOrderId: string;
  action: string;
  saleId?: string;
  contactId?: string;
}>;

@Injectable()
export class VtexSyncOrderUseCase {
  private readonly logger = new Logger(VtexSyncOrderUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject('IntegrationSyncLogRepository')
    private readonly syncLogRepository: IIntegrationSyncLogRepository,
    @Inject('IntegrationSkuMappingRepository')
    private readonly skuMappingRepository: IIntegrationSkuMappingRepository,
    @Inject('ContactRepository')
    private readonly contactRepository: IContactRepository,
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    private readonly encryptionService: EncryptionService,
    private readonly vtexApiClient: VtexApiClient,
    private readonly createSaleUseCase: CreateSaleUseCase,
    private readonly confirmSaleUseCase: ConfirmSaleUseCase
  ) {}

  async execute(
    request: IVtexSyncOrderRequest
  ): Promise<Result<IVtexSyncOrderResponse, DomainError>> {
    this.logger.log('Syncing VTEX order', {
      connectionId: request.connectionId,
      externalOrderId: request.externalOrderId,
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

      // Idempotency check
      const existingLog = await this.syncLogRepository.findByExternalOrderId(
        request.connectionId,
        request.externalOrderId
      );
      if (existingLog && existingLog.action === 'SYNCED') {
        return ok({
          success: true,
          message: 'Order already synced',
          data: {
            externalOrderId: request.externalOrderId,
            action: 'ALREADY_SYNCED',
            saleId: existingLog.saleId,
            contactId: existingLog.contactId,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Decrypt credentials and fetch order
      const appKey = this.encryptionService.decrypt(connection.encryptedAppKey);
      const appToken = this.encryptionService.decrypt(connection.encryptedAppToken);

      let order: VtexOrderDetail;
      try {
        order = await this.vtexApiClient.getOrder(
          connection.accountName,
          appKey,
          appToken,
          request.externalOrderId
        );
      } catch (fetchError) {
        const errorMsg = `Failed to fetch VTEX order: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`;
        await this.logSyncFailure(
          request.connectionId,
          request.externalOrderId,
          request.orgId,
          errorMsg,
          existingLog
        );
        return err(new ValidationError(errorMsg, 'VTEX_ORDER_FETCH_ERROR'));
      }

      // Only sync orders that have payment approved or are further in the flow
      const paidStatuses = new Set([
        'payment-approved',
        'ready-for-handling',
        'handling',
        'invoiced',
      ]);
      if (!paidStatuses.has(order.status)) {
        this.logger.debug('Skipping order with non-paid status', {
          orderId: request.externalOrderId,
          status: order.status,
        });
        return ok({
          success: true,
          message: `Order skipped: status "${order.status}" indicates payment not yet confirmed`,
          data: {
            externalOrderId: request.externalOrderId,
            action: 'SKIPPED',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Resolve or create contact
      let contactId: string | undefined;
      try {
        contactId = await this.resolveContact(order, connection.defaultContactId, request.orgId);
      } catch (contactError) {
        this.logger.warn('Could not resolve contact, using default', {
          error: contactError instanceof Error ? contactError.message : 'Unknown error',
        });
        contactId = connection.defaultContactId;
      }

      // Match products via SKU mappings
      const unmatchedSkus: string[] = [];
      const matchedLines: Array<{
        productId: string;
        quantity: number;
        salePrice: number;
        currency: string;
      }> = [];

      for (const item of order.items) {
        const refId = item.refId || item.id;
        const mapping = await this.skuMappingRepository.findByExternalSku(
          request.connectionId,
          refId
        );

        if (mapping) {
          matchedLines.push({
            productId: mapping.productId,
            quantity: item.quantity,
            salePrice: item.sellingPrice / 100, // VTEX prices are in cents
            currency: 'COP',
          });
        } else {
          // Try to find product by SKU directly
          const product = await this.productRepository.findBySku(refId, request.orgId);
          if (product) {
            matchedLines.push({
              productId: product.id,
              quantity: item.quantity,
              salePrice: item.sellingPrice / 100,
              currency: 'COP',
            });
          } else {
            unmatchedSkus.push(refId);
          }
        }
      }

      if (unmatchedSkus.length > 0) {
        const errorMsg = `Unmatched SKUs: ${unmatchedSkus.join(', ')}`;
        await this.logSyncFailure(
          request.connectionId,
          request.externalOrderId,
          request.orgId,
          errorMsg,
          existingLog,
          order
        );
        return err(new ValidationError(errorMsg, 'VTEX_SKU_MISMATCH'));
      }

      // Create sale via CreateSaleUseCase
      const saleResult = await this.createSaleUseCase.execute({
        warehouseId: connection.defaultWarehouseId,
        contactId: contactId ?? connection.defaultContactId ?? '',
        externalReference: request.externalOrderId,
        note: `VTEX order ${request.externalOrderId}`,
        lines: matchedLines,
        createdBy: connection.createdBy,
        orgId: request.orgId,
      });

      if (saleResult.isErr()) {
        const errorMsg = `Failed to create sale: ${saleResult.unwrapErr().message}`;
        await this.logSyncFailure(
          request.connectionId,
          request.externalOrderId,
          request.orgId,
          errorMsg,
          existingLog,
          order
        );
        return err(new ValidationError(errorMsg, 'VTEX_SALE_CREATION_ERROR'));
      }

      const saleData = saleResult.unwrap().data;
      const saleId = saleData.id;
      const saleNumber = saleData.saleNumber;

      // Auto-confirm sale to reserve inventory (VTEX payment already approved)
      const confirmResult = await this.confirmSaleUseCase.execute({
        id: saleId,
        orgId: request.orgId,
        userId: connection.createdBy,
      });

      if (confirmResult.isErr()) {
        this.logger.warn('Sale created but auto-confirm failed', {
          saleId,
          error: confirmResult.unwrapErr().message,
        });
      } else {
        this.logger.log('Sale auto-confirmed, inventory reserved', { saleId, saleNumber });
      }

      // Log success
      const syncLog =
        existingLog ||
        IntegrationSyncLog.create(
          {
            connectionId: request.connectionId,
            externalOrderId: request.externalOrderId,
            action: 'SYNCED',
            saleId,
            saleNumber,
            contactId,
            rawPayload: order as unknown as Record<string, unknown>,
          },
          request.orgId
        );

      if (existingLog) {
        syncLog.markSuccess(saleId, contactId, saleNumber);
        await this.syncLogRepository.update(syncLog);
      } else {
        await this.syncLogRepository.save(syncLog);
      }

      // Update connection last sync
      connection.updateLastSync();
      await this.connectionRepository.update(connection);

      return ok({
        success: true,
        message: 'VTEX order synced successfully',
        data: {
          externalOrderId: request.externalOrderId,
          action: 'SYNCED',
          saleId,
          contactId,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error syncing VTEX order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        externalOrderId: request.externalOrderId,
      });
      return err(
        new ValidationError(
          `Failed to sync VTEX order: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'VTEX_SYNC_ORDER_ERROR'
        )
      );
    }
  }

  private async resolveContact(
    order: VtexOrderDetail,
    defaultContactId: string | undefined,
    orgId: string
  ): Promise<string | undefined> {
    const profile = order.clientProfileData;
    if (!profile) return defaultContactId;

    // Try to find by email
    if (profile.email) {
      const existing = await this.contactRepository.findByEmail(profile.email, orgId);
      if (existing) return existing.id;
    }

    // Try to find by document/identification
    if (profile.document) {
      const existing = await this.contactRepository.findByIdentification(profile.document, orgId);
      if (existing) return existing.id;
    }

    // Create new contact
    const contactName =
      profile.isCorporate && profile.corporateName
        ? profile.corporateName
        : `${profile.firstName} ${profile.lastName}`.trim();

    const identification = profile.document || profile.email || `vtex-${Date.now()}`;

    const address = order.shippingData?.address
      ? `${order.shippingData.address.street} ${order.shippingData.address.number}, ${order.shippingData.address.city}, ${order.shippingData.address.state}`
      : undefined;

    const contact = Contact.create(
      {
        name: contactName,
        identification,
        type: 'CUSTOMER',
        email: profile.email,
        phone: profile.phone,
        address,
      },
      orgId
    );

    const saved = await this.contactRepository.save(contact);
    return saved.id;
  }

  private async logSyncFailure(
    connectionId: string,
    externalOrderId: string,
    orgId: string,
    errorMessage: string,
    existingLog: IntegrationSyncLog | null,
    rawPayload?: unknown
  ): Promise<void> {
    try {
      if (existingLog) {
        existingLog.markFailed(errorMessage);
        await this.syncLogRepository.update(existingLog);
      } else {
        const log = IntegrationSyncLog.create(
          {
            connectionId,
            externalOrderId,
            action: 'FAILED',
            errorMessage,
            rawPayload: (rawPayload as Record<string, unknown>) || undefined,
          },
          orgId
        );
        await this.syncLogRepository.save(log);
      }
    } catch (logError) {
      this.logger.error('Error logging sync failure', {
        error: logError instanceof Error ? logError.message : 'Unknown error',
      });
    }
  }
}
