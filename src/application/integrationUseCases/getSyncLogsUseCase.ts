import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IIntegrationConnectionRepository } from '../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { IIntegrationSyncLogRepository } from '../../integrations/shared/domain/ports/iIntegrationSyncLogRepository.port.js';

export interface IGetSyncLogsRequest {
  connectionId: string;
  orgId: string;
  page?: number;
  limit?: number;
  action?: string;
}

export interface ISyncLogOrderItem {
  name: string;
  sku: string | null;
  quantity: number;
  price: number;
}

export interface ISyncLogData {
  id: string;
  connectionId: string;
  externalOrderId: string;
  externalOrderStatus?: string;
  action: string;
  saleId?: string;
  saleNumber?: string;
  contactId?: string;
  contactName?: string;
  errorMessage?: string;
  externalOrderDate?: string;
  orderItems?: ISyncLogOrderItem[];
  processedAt: Date;
}

export type IGetSyncLogsResponse = IApiResponseSuccess<ISyncLogData[]> & {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

@Injectable()
export class GetSyncLogsUseCase {
  private readonly logger = new Logger(GetSyncLogsUseCase.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject('IntegrationSyncLogRepository')
    private readonly syncLogRepository: IIntegrationSyncLogRepository
  ) {}

  private extractFromPayload(rawPayload: unknown): {
    orderDate?: string;
    orderItems?: ISyncLogOrderItem[];
  } {
    if (!rawPayload || typeof rawPayload !== 'object') return {};

    const payload = rawPayload as Record<string, unknown>;

    // VTEX payload: { creationDate, items: [{ name, refId, quantity, sellingPrice }] }
    if ('creationDate' in payload) {
      const orderDate = typeof payload.creationDate === 'string' ? payload.creationDate : undefined;
      const items = Array.isArray(payload.items)
        ? (payload.items as Record<string, unknown>[]).map(item => ({
            name: String(item.name ?? ''),
            sku: item.refId ? String(item.refId) : null,
            quantity: Number(item.quantity ?? 0),
            price: Number(item.sellingPrice ?? item.price ?? 0) / 100,
          }))
        : undefined;
      return { orderDate, orderItems: items };
    }

    // MeLi payload: { date_created, order_items: [{ item: { title, seller_sku }, quantity, unit_price }] }
    if ('date_created' in payload) {
      const orderDate = typeof payload.date_created === 'string' ? payload.date_created : undefined;
      const items = Array.isArray(payload.order_items)
        ? (payload.order_items as Record<string, unknown>[]).map(entry => {
            const item = (entry.item ?? {}) as Record<string, unknown>;
            return {
              name: String(item.title ?? ''),
              sku: item.seller_sku ? String(item.seller_sku) : null,
              quantity: Number(entry.quantity ?? 0),
              price: Number(entry.unit_price ?? 0),
            };
          })
        : undefined;
      return { orderDate, orderItems: items };
    }

    return {};
  }

  async execute(request: IGetSyncLogsRequest): Promise<Result<IGetSyncLogsResponse, DomainError>> {
    const { connectionId, orgId, page = 1, limit = 20, action } = request;

    this.logger.log('Getting sync logs', { connectionId, page, limit, action });

    const connection = await this.connectionRepository.findById(connectionId, orgId);
    if (!connection) {
      return err(
        new NotFoundError('Integration connection not found', 'INTEGRATION_CONNECTION_NOT_FOUND')
      );
    }

    const result = await this.syncLogRepository.findByConnectionId(
      connectionId,
      page,
      limit,
      action ? { action } : undefined
    );

    const data: ISyncLogData[] = result.data.map(log => {
      const { orderDate, orderItems } = this.extractFromPayload(log.rawPayload);
      return {
        id: log.id,
        connectionId: log.connectionId,
        externalOrderId: log.externalOrderId,
        externalOrderStatus: log.externalOrderStatus ?? undefined,
        action: log.action,
        saleId: log.saleId,
        saleNumber: log.saleNumber,
        contactId: log.contactId,
        contactName: log.contactName,
        errorMessage: log.errorMessage,
        externalOrderDate: orderDate,
        orderItems,
        processedAt: log.processedAt,
      };
    });

    return ok({
      success: true,
      message: 'Sync logs retrieved successfully',
      data,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
