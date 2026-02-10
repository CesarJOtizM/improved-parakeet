import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

export interface IGetStockRequest {
  orgId: string;
  warehouseId?: string;
  productId?: string;
  lowStock?: boolean;
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
}

export type IGetStockResponse = IApiResponseSuccess<IStockItemData[]>;

@Injectable()
export class GetStockUseCase {
  private readonly logger = new Logger(GetStockUseCase.name);

  constructor(
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository
  ) {}

  async execute(request: IGetStockRequest): Promise<Result<IGetStockResponse, DomainError>> {
    this.logger.log('Getting stock', {
      orgId: request.orgId,
      warehouseId: request.warehouseId,
      productId: request.productId,
      lowStock: request.lowStock,
    });

    const stockRecords = await this.stockRepository.findAll(request.orgId, {
      warehouseId: request.warehouseId,
      productId: request.productId,
      lowStock: request.lowStock,
    });

    const stockData: IStockItemData[] = stockRecords.map(stock => {
      const quantity = stock.quantity.getNumericValue();
      const averageCost = stock.averageCost.getAmount();
      const totalValue = quantity * averageCost;

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
      };
    });

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
}
