import { PrismaService } from '@infrastructure/database/prisma.service';
import { Money } from '@inventory/stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import {
  IStockData,
  IStockFilters,
  IStockRepository,
} from '@stock/domain/repositories/stockRepository.interface';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

@Injectable()
export class PrismaStockRepository implements IStockRepository {
  private readonly logger = new Logger(PrismaStockRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('ProductRepository')
    @Optional()
    private readonly productRepository?: IProductRepository
  ) {}

  /**
   * Gets the precision for a product's unit
   * Defaults to 0 if product cannot be found
   */
  private async getProductPrecision(productId: string, orgId: string): Promise<number> {
    if (!this.productRepository) {
      return 0; // Default precision
    }

    try {
      const product = await this.productRepository.findById(productId, orgId);
      if (product) {
        return product.unit.getPrecision();
      }
    } catch (error) {
      this.logger.warn(`Could not get product precision for ${productId}, using default 0`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return 0; // Default precision
  }

  async getStockQuantity(
    productId: string,
    warehouseId: string,
    orgId: string,
    locationId?: string
  ): Promise<Quantity> {
    try {
      const stock = await this.prisma.stock.findFirst({
        where: {
          productId,
          warehouseId,
          orgId,
          locationId: locationId ?? null,
        },
      });

      if (!stock) {
        // Return zero quantity with product precision
        const precision = await this.getProductPrecision(productId, orgId);
        return Quantity.create(0, precision);
      }

      const precision = await this.getProductPrecision(productId, orgId);
      return Quantity.create(Number(stock.quantity), precision);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error getting stock quantity: ${error.message}`);
      } else {
        this.logger.error(`Error getting stock quantity: ${error}`);
      }
      throw error;
    }
  }

  async getStockWithCost(
    productId: string,
    warehouseId: string,
    orgId: string,
    locationId?: string
  ): Promise<{ quantity: Quantity; averageCost: Money } | null> {
    try {
      const stock = await this.prisma.stock.findFirst({
        where: {
          productId,
          warehouseId,
          orgId,
          locationId: locationId ?? null,
        },
      });

      if (!stock) {
        return null;
      }

      const precision = await this.getProductPrecision(productId, orgId);
      const quantity = Quantity.create(Number(stock.quantity), precision);

      const unitCostValue =
        stock.unitCost !== null
          ? typeof stock.unitCost === 'object' && 'toNumber' in stock.unitCost
            ? stock.unitCost.toNumber()
            : Number(stock.unitCost)
          : 0;

      const averageCost = Money.create(unitCostValue, 'COP', 2);

      return { quantity, averageCost };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error getting stock with cost: ${error.message}`);
      } else {
        this.logger.error(`Error getting stock with cost: ${error}`);
      }
      throw error;
    }
  }

  async updateStock(
    productId: string,
    warehouseId: string,
    orgId: string,
    quantity: Quantity,
    averageCost: Money,
    locationId?: string
  ): Promise<void> {
    try {
      // Find existing stock record
      const existing = await this.prisma.stock.findFirst({
        where: {
          productId,
          warehouseId,
          orgId,
          locationId: locationId ?? null,
        },
      });

      if (existing) {
        await this.prisma.stock.update({
          where: { id: existing.id },
          data: {
            quantity: Math.round(quantity.getNumericValue()),
            unitCost: averageCost.getAmount(),
          },
        });
      } else {
        await this.prisma.stock.create({
          data: {
            productId,
            warehouseId,
            orgId,
            locationId: locationId ?? null,
            quantity: Math.round(quantity.getNumericValue()),
            unitCost: averageCost.getAmount(),
          },
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error updating stock: ${error.message}`);
      } else {
        this.logger.error(`Error updating stock: ${error}`);
      }
      throw error;
    }
  }

  async incrementStock(
    productId: string,
    warehouseId: string,
    orgId: string,
    quantity: Quantity,
    locationId?: string
  ): Promise<void> {
    try {
      const currentStock = await this.getStockWithCost(productId, warehouseId, orgId, locationId);

      if (currentStock) {
        const newQuantity = currentStock.quantity.add(quantity);
        await this.updateStock(
          productId,
          warehouseId,
          orgId,
          newQuantity,
          currentStock.averageCost,
          locationId
        );
      } else {
        // Create new stock record with zero cost
        const precision = await this.getProductPrecision(productId, orgId);
        const newQuantity = Quantity.create(quantity.getNumericValue(), precision);
        const zeroCost = Money.create(0, 'COP', 2);
        await this.updateStock(productId, warehouseId, orgId, newQuantity, zeroCost, locationId);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error incrementing stock: ${error.message}`);
      } else {
        this.logger.error(`Error incrementing stock: ${error}`);
      }
      throw error;
    }
  }

  async decrementStock(
    productId: string,
    warehouseId: string,
    orgId: string,
    quantity: Quantity,
    locationId?: string
  ): Promise<void> {
    try {
      const currentStock = await this.getStockWithCost(productId, warehouseId, orgId, locationId);

      if (!currentStock) {
        throw new Error(`Stock not found for product ${productId} in warehouse ${warehouseId}`);
      }

      const newQuantity = currentStock.quantity.subtract(quantity);
      await this.updateStock(
        productId,
        warehouseId,
        orgId,
        newQuantity,
        currentStock.averageCost,
        locationId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error decrementing stock: ${error.message}`);
      } else {
        this.logger.error(`Error decrementing stock: ${error}`);
      }
      throw error;
    }
  }

  async findAll(orgId: string, filters?: IStockFilters): Promise<IStockData[]> {
    try {
      // Build where clause
      const where: {
        orgId: string;
        warehouseId?: string;
        productId?: string;
      } = { orgId };

      if (filters?.warehouseId) {
        where.warehouseId = filters.warehouseId;
      }

      if (filters?.productId) {
        where.productId = filters.productId;
      }

      // Get stock records
      let stockRecords = await this.prisma.stock.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      // If lowStock filter is active, filter by reorder rules
      if (filters?.lowStock) {
        const reorderRules = await this.prisma.reorderRule.findMany({
          where: { orgId },
        });

        const rulesMap = new Map<string, number>();
        for (const rule of reorderRules) {
          const key = `${rule.productId}-${rule.warehouseId}`;
          rulesMap.set(key, Number(rule.minQty));
        }

        stockRecords = stockRecords.filter(stock => {
          const key = `${stock.productId}-${stock.warehouseId}`;
          const minQty = rulesMap.get(key);
          if (minQty !== undefined) {
            return Number(stock.quantity) < minQty;
          }
          return false; // If no rule exists, don't include in lowStock filter
        });
      }

      // Map to IStockData
      const result: IStockData[] = [];
      for (const stock of stockRecords) {
        const precision = await this.getProductPrecision(stock.productId, orgId);
        const quantity = Quantity.create(Number(stock.quantity), precision);

        const unitCostValue =
          stock.unitCost !== null
            ? typeof stock.unitCost === 'object' && 'toNumber' in stock.unitCost
              ? stock.unitCost.toNumber()
              : Number(stock.unitCost)
            : 0;

        const averageCost = Money.create(unitCostValue, 'COP', 2);

        result.push({
          productId: stock.productId,
          warehouseId: stock.warehouseId,
          locationId: undefined, // MVP: no locations
          quantity,
          averageCost,
          orgId: stock.orgId,
        });
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all stock: ${error.message}`);
      } else {
        this.logger.error(`Error finding all stock: ${error}`);
      }
      throw error;
    }
  }
}
