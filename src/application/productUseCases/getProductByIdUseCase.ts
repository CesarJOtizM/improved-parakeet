import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PRODUCT_NOT_FOUND } from '@shared/constants/error-codes';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IStockRepository } from '@stock/domain/ports/repositories/iStockRepository.port';
import type { IReorderRuleRepository } from '@stock/domain/ports/repositories/iReorderRuleRepository.port';
import type { IMovementRepository } from '@movement/domain/ports/repositories/iMovementRepository.port';

export interface IGetProductByIdRequest {
  productId: string;
  orgId: string;
}

export interface IProductDetailData {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categories: { id: string; name: string }[];
  unit: {
    code: string;
    name: string;
    precision: number;
  };
  barcode?: string;
  brand?: string;
  model?: string;
  price?: number;
  currency?: string;
  status: string;
  costMethod: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields from Stock
  averageCost: number;
  totalStock: number;
  margin: number;
  profit: number;
  // Computed fields from ReorderRules
  minStock: number;
  maxStock: number;
  safetyStock: number;
  // Rotation metrics from Movements (last 30 days)
  totalIn30d: number;
  totalOut30d: number;
  avgDailyConsumption: number;
  daysOfStock: number | null;
  turnoverRate: number;
  lastMovementDate: string | null;
  statusChangedBy?: string | null;
  statusChangedAt?: Date | null;
}

export type IGetProductByIdResponse = IApiResponseSuccess<IProductDetailData>;

@Injectable()
export class GetProductByIdUseCase {
  private readonly logger = new Logger(GetProductByIdUseCase.name);

  constructor(
    @Inject('ProductRepository') private readonly productRepository: IProductRepository,
    @Inject('StockRepository') private readonly stockRepository: IStockRepository,
    @Inject('ReorderRuleRepository') private readonly reorderRuleRepository: IReorderRuleRepository,
    @Inject('MovementRepository') private readonly movementRepository: IMovementRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: IGetProductByIdRequest
  ): Promise<Result<IGetProductByIdResponse, DomainError>> {
    this.logger.log('Getting product by ID', {
      productId: request.productId,
      orgId: request.orgId,
    });

    const product = await this.productRepository.findById(request.productId, request.orgId);

    if (!product) {
      return err(new NotFoundError('Product not found', PRODUCT_NOT_FOUND));
    }

    // Fetch stock data for this product across all warehouses
    const stockRecords = await this.stockRepository.findAll(request.orgId, {
      productId: request.productId,
    });

    let totalStock = 0;
    let weightedCostSum = 0;

    for (const stock of stockRecords) {
      const qty = stock.quantity.getNumericValue();
      const cost = stock.averageCost.getAmount();
      totalStock += qty;
      weightedCostSum += qty * cost;
    }

    const averageCost = totalStock > 0 ? weightedCostSum / totalStock : 0;
    const price = product.price ? product.price.getAmount() : 0;
    const profit = price - averageCost;
    const margin = averageCost > 0 ? ((price - averageCost) / averageCost) * 100 : 0;

    // Fetch reorder rules for this product
    const allRules = await this.reorderRuleRepository.findAll(request.orgId);
    const productRules = allRules.filter(r => r.productId === request.productId);

    let minStock = 0;
    let maxStock = 0;
    let safetyStock = 0;

    if (productRules.length > 0) {
      // Aggregate: sum across all warehouses
      for (const rule of productRules) {
        minStock += rule.minQty.getNumericValue();
        maxStock += rule.maxQty.getNumericValue();
        safetyStock += rule.safetyQty.getNumericValue();
      }
    }

    // Calculate rotation metrics from movements (last 30 days)
    const allMovements = await this.movementRepository.findByProduct(
      request.productId,
      request.orgId
    );

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalIn30d = 0;
    let totalOut30d = 0;
    let lastMovementDate: Date | null = null;

    for (const movement of allMovements) {
      // Only count POSTED movements
      if (!movement.status.isPosted()) continue;

      const movementDate = movement.postedAt ?? movement.createdAt;

      // Track last movement date (any time)
      if (!lastMovementDate || movementDate > lastMovementDate) {
        lastMovementDate = movementDate;
      }

      // Only count last 30 days for rotation metrics
      if (movementDate < thirtyDaysAgo) continue;

      for (const line of movement.getLines()) {
        if (line.productId !== request.productId) continue;
        const qty = line.quantity.getNumericValue();

        if (movement.type.isInput()) {
          totalIn30d += qty;
        } else if (movement.type.isOutput()) {
          totalOut30d += qty;
        }
      }
    }

    const avgDailyConsumption = totalOut30d / 30;
    const daysOfStock = avgDailyConsumption > 0 ? totalStock / avgDailyConsumption : null;
    // Annualized turnover: (yearly consumption) / average inventory
    const yearlyConsumption = avgDailyConsumption * 365;
    const turnoverRate = totalStock > 0 ? yearlyConsumption / totalStock : 0;

    return ok({
      success: true,
      message: 'Product retrieved successfully',
      data: {
        id: product.id,
        sku: product.sku.getValue(),
        name: product.name.getValue(),
        description: product.description,
        categories: product.categories,
        unit: {
          code: product.unit.getValue().code,
          name: product.unit.getValue().name,
          precision: product.unit.getValue().precision,
        },
        barcode: product.barcode,
        brand: product.brand,
        model: product.model,
        price,
        currency: product.price ? product.price.getCurrency() : 'COP',
        status: product.status.getValue(),
        costMethod: product.costMethod.getValue(),
        orgId: product.orgId!,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        // Computed
        averageCost: Math.round(averageCost * 100) / 100,
        totalStock,
        margin: Math.round(margin * 10) / 10,
        profit: Math.round(profit * 100) / 100,
        minStock,
        maxStock,
        safetyStock,
        // Rotation metrics
        totalIn30d,
        totalOut30d,
        avgDailyConsumption: Math.round(avgDailyConsumption * 10) / 10,
        daysOfStock: daysOfStock !== null ? Math.round(daysOfStock) : null,
        turnoverRate: Math.round(turnoverRate * 10) / 10,
        lastMovementDate: lastMovementDate ? lastMovementDate.toISOString() : null,
        statusChangedBy: await this.resolveUserName(product.statusChangedBy),
        statusChangedAt: product.statusChangedAt ?? null,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private async resolveUserName(userId?: string | null): Promise<string | null> {
    if (!userId) return null;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (!user) return userId;
      return `${user.firstName} ${user.lastName}`.trim();
    } catch {
      return userId;
    }
  }
}
