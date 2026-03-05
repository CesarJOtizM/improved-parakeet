import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

export interface IGetStockRequest {
  orgId: string;
  warehouseIds?: string[];
  productId?: string;
  companyId?: string;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IStockItemData {
  productId: string;
  productName?: string;
  productSku?: string;
  warehouseId: string;
  warehouseName?: string;
  warehouseCode?: string;
  locationId?: string;
  quantity: number;
  averageCost: number;
  totalValue: number;
  currency: string;
  lastMovementAt: string | null;
}

export type IGetStockResponse = IApiResponseSuccess<IStockItemData[]>;

@Injectable()
export class GetStockUseCase {
  private readonly logger = new Logger(GetStockUseCase.name);

  constructor(
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(request: IGetStockRequest): Promise<Result<IGetStockResponse, DomainError>> {
    this.logger.log('Getting stock', {
      orgId: request.orgId,
      warehouseIds: request.warehouseIds,
      productId: request.productId,
      lowStock: request.lowStock,
    });

    // Run stock records and last movement dates in parallel
    const [stockRecords, lastMovements] = await Promise.all([
      this.stockRepository.findAll(request.orgId, {
        warehouseIds: request.warehouseIds,
        productId: request.productId,
        companyId: request.companyId,
        lowStock: request.lowStock,
      }),
      this.getLastMovementDates(request.orgId),
    ]);

    const stockData: IStockItemData[] = stockRecords.map(stock => {
      const quantity = stock.quantity.getNumericValue();
      const averageCost = stock.averageCost.getAmount();
      const totalValue = quantity * averageCost;
      const key = `${stock.productId}-${stock.warehouseId}`;

      return {
        productId: stock.productId,
        productName: stock.productName,
        productSku: stock.productSku,
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouseName,
        warehouseCode: stock.warehouseCode,
        locationId: stock.locationId,
        quantity,
        averageCost,
        totalValue,
        currency: stock.averageCost.getCurrency(),
        lastMovementAt: lastMovements.get(key) || null,
      };
    });

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      stockData.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'productName':
            aValue = a.productName || '';
            bValue = b.productName || '';
            break;
          case 'productSku':
            aValue = a.productSku || '';
            bValue = b.productSku || '';
            break;
          case 'warehouseName':
            aValue = a.warehouseName || '';
            bValue = b.warehouseName || '';
            break;
          case 'quantity':
            aValue = a.quantity;
            bValue = b.quantity;
            break;
          case 'averageCost':
            aValue = a.averageCost;
            bValue = b.averageCost;
            break;
          case 'totalValue':
            aValue = a.totalValue;
            bValue = b.totalValue;
            break;
          case 'lastMovementAt':
            aValue = a.lastMovementAt ? new Date(a.lastMovementAt).getTime() : 0;
            bValue = b.lastMovementAt ? new Date(b.lastMovementAt).getTime() : 0;
            break;
          default:
            aValue = a.productName || '';
            bValue = b.productName || '';
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.logger.log('Stock retrieved successfully', {
      count: stockData.length,
    });

    return ok({
      success: true,
      message: 'Stock retrieved successfully',
      data: stockData,
      timestamp: new Date().toISOString(),
    });
  }

  private async getLastMovementDates(orgId: string): Promise<Map<string, string>> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{ productId: string; warehouseId: string; lastMovementAt: Date }>
      >`
        SELECT ml."productId", m."warehouseId",
               MAX(COALESCE(m."postedAt", m."createdAt")) AS "lastMovementAt"
        FROM "movement_lines" ml
        JOIN "movements" m ON m.id = ml."movementId"
        WHERE m."orgId" = ${orgId} AND m.status = 'POSTED'
        GROUP BY ml."productId", m."warehouseId"
      `;

      const map = new Map<string, string>();
      for (const row of result) {
        map.set(`${row.productId}-${row.warehouseId}`, new Date(row.lastMovementAt).toISOString());
      }
      return map;
    } catch (error) {
      this.logger.warn('Failed to fetch last movement dates, returning empty', {
        error: error instanceof Error ? error.message : error,
      });
      return new Map();
    }
  }
}
