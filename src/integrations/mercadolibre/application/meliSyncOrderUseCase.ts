import { Inject, Injectable, Logger } from '@nestjs/common';
import { Contact } from '@contacts/domain/entities/contact.entity';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { MeliApiClient } from '../infrastructure/meliApiClient.js';
import { MeliReauthRequiredError } from '../domain/meliReauthRequired.error.js';
import { IntegrationSyncLog } from '../../shared/domain/entities/integrationSyncLog.entity.js';
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
import type { MeliOrderDetail } from '../dto/meli-api.types.js';

export interface IMeliSyncOrderRequest {
  connectionId: string;
  externalOrderId: string;
  orgId: string;
}

export type IMeliSyncOrderResponse = IApiResponseSuccess<{
  externalOrderId: string;
  action: string;
  saleId?: string;
  contactId?: string;
}>;

@Injectable()
export class MeliSyncOrderUseCase {
  private readonly logger = new Logger(MeliSyncOrderUseCase.name);

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
    private readonly meliApiClient: MeliApiClient,
    private readonly createSaleUseCase: CreateSaleUseCase
  ) {}

  async execute(
    request: IMeliSyncOrderRequest
  ): Promise<Result<IMeliSyncOrderResponse, DomainError>> {
    this.logger.log('Syncing MeLi order', {
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

      // Fetch order from MeLi (token handled automatically by MeliApiClient)
      let order: MeliOrderDetail;
      try {
        order = await this.meliApiClient.getOrder(connection, request.externalOrderId);
      } catch (fetchError) {
        if (fetchError instanceof MeliReauthRequiredError) {
          await this.logSyncFailure(
            request.connectionId,
            request.externalOrderId,
            request.orgId,
            'MercadoLibre authentication expired',
            existingLog
          );
          return err(
            new ValidationError('MercadoLibre requires re-authentication', 'MELI_REAUTH_REQUIRED')
          );
        }
        const errorMsg = `Failed to fetch MeLi order: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`;
        await this.logSyncFailure(
          request.connectionId,
          request.externalOrderId,
          request.orgId,
          errorMsg,
          existingLog
        );
        return err(new ValidationError(errorMsg, 'MELI_ORDER_FETCH_ERROR'));
      }

      // Resolve or create contact
      let contactId: string | undefined;
      let contactName: string | undefined;
      try {
        const resolved = await this.resolveContact(
          order,
          connection.defaultContactId,
          request.orgId
        );
        contactId = resolved?.id;
        contactName = resolved?.name;
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

      for (const orderItem of order.order_items) {
        const sellerSku = orderItem.item.seller_sku || orderItem.item.id;
        const mapping = await this.skuMappingRepository.findByExternalSku(
          request.connectionId,
          sellerSku
        );

        if (mapping) {
          matchedLines.push({
            productId: mapping.productId,
            quantity: orderItem.quantity,
            salePrice: orderItem.unit_price, // MeLi prices are already in base currency (not cents)
            currency: orderItem.currency_id,
          });
        } else {
          // Try to find product by SKU directly
          const product = await this.productRepository.findBySku(sellerSku, request.orgId);
          if (product) {
            matchedLines.push({
              productId: product.id,
              quantity: orderItem.quantity,
              salePrice: orderItem.unit_price,
              currency: orderItem.currency_id,
            });
          } else {
            unmatchedSkus.push(sellerSku);
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
          order,
          order.status
        );
        return err(new ValidationError(errorMsg, 'MELI_SKU_MISMATCH'));
      }

      // Create sale via CreateSaleUseCase
      const saleResult = await this.createSaleUseCase.execute({
        warehouseId: connection.defaultWarehouseId,
        contactId: contactId ?? connection.defaultContactId ?? '',
        externalReference: request.externalOrderId,
        note: `MercadoLibre order ${request.externalOrderId}`,
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
          order,
          order.status
        );
        return err(new ValidationError(errorMsg, 'MELI_SALE_CREATION_ERROR'));
      }

      const saleData = saleResult.unwrap().data;
      const saleId = saleData.id;
      const saleNumber = saleData.saleNumber;

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
            contactName,
            externalOrderStatus: order.status,
            rawPayload: order as unknown as Record<string, unknown>,
          },
          request.orgId
        );

      if (existingLog) {
        syncLog.markSuccess(saleId, contactId, saleNumber, order.status, contactName);
        await this.syncLogRepository.update(syncLog);
      } else {
        await this.syncLogRepository.save(syncLog);
      }

      // Update connection last sync
      connection.updateLastSync();
      await this.connectionRepository.update(connection);

      return ok({
        success: true,
        message: 'MeLi order synced successfully',
        data: {
          externalOrderId: request.externalOrderId,
          action: 'SYNCED',
          saleId,
          contactId,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof MeliReauthRequiredError) {
        return err(
          new ValidationError('MercadoLibre requires re-authentication', 'MELI_REAUTH_REQUIRED')
        );
      }
      this.logger.error('Error syncing MeLi order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        externalOrderId: request.externalOrderId,
      });
      return err(
        new ValidationError(
          `Failed to sync MeLi order: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'MELI_SYNC_ORDER_ERROR'
        )
      );
    }
  }

  private async resolveContact(
    order: MeliOrderDetail,
    defaultContactId: string | undefined,
    orgId: string
  ): Promise<{ id: string; name: string } | undefined> {
    const buyer = order.buyer;
    if (!buyer) {
      if (defaultContactId) {
        const defaultContact = await this.contactRepository.findById(defaultContactId, orgId);
        return defaultContact ? { id: defaultContact.id, name: defaultContact.name } : undefined;
      }
      return undefined;
    }

    // Try to find by document/identification
    if (buyer.billing_info?.doc_number) {
      const existing = await this.contactRepository.findByIdentification(
        buyer.billing_info.doc_number,
        orgId
      );
      if (existing) return { id: existing.id, name: existing.name };
    }

    // Try to find by email
    if (buyer.email) {
      const existing = await this.contactRepository.findByEmail(buyer.email, orgId);
      if (existing) return { id: existing.id, name: existing.name };
    }

    // Create new contact
    const contactName = `${buyer.first_name} ${buyer.last_name}`.trim() || buyer.nickname;
    const identification = buyer.billing_info?.doc_number || buyer.email || `meli-${buyer.id}`;
    const phone = buyer.phone
      ? `${buyer.phone.area_code || ''}${buyer.phone.number || ''}`.trim()
      : undefined;

    const contact = Contact.create(
      {
        name: contactName,
        identification,
        type: 'CUSTOMER',
        email: buyer.email || undefined,
        phone: phone || undefined,
      },
      orgId
    );

    const saved = await this.contactRepository.save(contact);
    return { id: saved.id, name: contactName };
  }

  private async logSyncFailure(
    connectionId: string,
    externalOrderId: string,
    orgId: string,
    errorMessage: string,
    existingLog: IntegrationSyncLog | null,
    rawPayload?: unknown,
    externalOrderStatus?: string
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
            externalOrderStatus,
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
