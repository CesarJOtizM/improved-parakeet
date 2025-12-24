import { Quantity } from '@inventory/stock';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DomainEventBus } from '@shared/domain/events/domainEventBus.service';
import { LowStockAlertEvent } from '@stock/domain/events/lowStockAlert.event';
import { StockThresholdExceededEvent } from '@stock/domain/events/stockThresholdExceeded.event';
import { AlertService } from '@stock/domain/services/alertService';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

interface IProductStockInfo {
  productId: string;
  warehouseId: string;
  currentStock: Quantity;
  minQuantity?: MinQuantity;
  maxQuantity?: MaxQuantity;
  safetyStock?: SafetyStock;
  orgId: string;
}

@Injectable()
export class StockValidationJob {
  private readonly logger = new Logger(StockValidationJob.name);

  constructor(
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly eventBus: DomainEventBus
  ) {}

  /**
   * Validates stock levels for all products and warehouses
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async validateStockLevels(): Promise<void> {
    try {
      this.logger.log('Starting stock level validation job...');

      // Get all organizations (in a real implementation, this would come from an organization service)
      // For now, we'll process all products across all organizations
      const orgIds = await this.getAllOrganizationIds();

      let totalAlerts = 0;

      for (const orgId of orgIds) {
        const alerts = await this.validateStockForOrganization(orgId);
        totalAlerts += alerts;
      }

      if (totalAlerts > 0) {
        this.logger.log(`Stock validation completed. Total alerts generated: ${totalAlerts}`);
      } else {
        this.logger.debug('Stock validation completed. No alerts generated.');
      }
    } catch (error) {
      this.logger.error('Error during stock level validation job:', error);
    }
  }

  /**
   * Validates stock levels for a specific organization
   */
  private async validateStockForOrganization(orgId: string): Promise<number> {
    let alertCount = 0;

    try {
      // Get all active products for this organization
      const products = await this.productRepository.findByStatus('ACTIVE', orgId);

      // Get all active warehouses for this organization
      const warehouses = await this.warehouseRepository.findActive(orgId);

      // For each product-warehouse combination, check stock levels
      for (const product of products) {
        for (const warehouse of warehouses) {
          try {
            const stockInfo = await this.getProductStockInfo(product.id, warehouse.id, orgId);

            if (!stockInfo) {
              continue; // No stock record exists, skip
            }

            // Evaluate stock level using AlertService
            const evaluation = AlertService.evaluateStockLevel({
              productId: product.id,
              warehouseId: warehouse.id,
              currentStock: stockInfo.currentStock,
              minQuantity: stockInfo.minQuantity,
              safetyStock: stockInfo.safetyStock,
              orgId,
            });

            // Emit LowStockAlert event if needed
            if (evaluation.shouldAlert) {
              const event = new LowStockAlertEvent(
                product.id,
                warehouse.id,
                stockInfo.currentStock,
                stockInfo.minQuantity,
                stockInfo.safetyStock,
                evaluation.severity,
                orgId,
                new Date()
              );

              event.markForDispatch();
              await this.eventBus.publish(event);
              alertCount++;

              this.logger.warn('Low stock alert generated', {
                productId: product.id,
                warehouseId: warehouse.id,
                severity: evaluation.severity,
                currentStock: stockInfo.currentStock.getNumericValue(),
              });
            }

            // Check for stock threshold exceeded (if maxQuantity is defined)
            if (stockInfo.maxQuantity) {
              if (
                stockInfo.currentStock.getNumericValue() > stockInfo.maxQuantity.getNumericValue()
              ) {
                const event = new StockThresholdExceededEvent(
                  product.id,
                  warehouse.id,
                  stockInfo.currentStock,
                  stockInfo.maxQuantity,
                  orgId,
                  new Date()
                );

                event.markForDispatch();
                await this.eventBus.publish(event);
                alertCount++;

                this.logger.warn('Stock threshold exceeded alert generated', {
                  productId: product.id,
                  warehouseId: warehouse.id,
                  currentStock: stockInfo.currentStock.getNumericValue(),
                  maxQuantity: stockInfo.maxQuantity.getNumericValue(),
                });
              }
            }
          } catch (error) {
            this.logger.error(
              `Error validating stock for product ${product.id} in warehouse ${warehouse.id}`,
              {
                error: error instanceof Error ? error.message : 'Unknown error',
                productId: product.id,
                warehouseId: warehouse.id,
                orgId,
              }
            );
            // Continue with next product-warehouse combination
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error validating stock for organization ${orgId}:`, error);
    }

    return alertCount;
  }

  /**
   * Gets product stock information including thresholds
   * TODO: This should be enhanced to get min/max/safety stock from a reorder rules table
   */
  private async getProductStockInfo(
    productId: string,
    warehouseId: string,
    orgId: string
  ): Promise<IProductStockInfo | null> {
    try {
      // Get current stock quantity
      const currentStock = await this.stockRepository.getStockQuantity(
        productId,
        warehouseId,
        orgId
      );

      // TODO: Get min/max/safety stock from reorder_rules table
      // For now, we'll return null for thresholds (no alerts will be generated)
      // In a real implementation, you would query:
      // const reorderRule = await reorderRuleRepository.findByProductAndWarehouse(productId, warehouseId, orgId);
      // const minQuantity = reorderRule ? MinQuantity.create(reorderRule.minQty) : undefined;
      // const maxQuantity = reorderRule ? MaxQuantity.create(reorderRule.maxQty) : undefined;
      // const safetyStock = reorderRule ? SafetyStock.create(reorderRule.safetyQty) : undefined;

      return {
        productId,
        warehouseId,
        currentStock,
        minQuantity: undefined, // TODO: Get from reorder rules
        maxQuantity: undefined, // TODO: Get from reorder rules
        safetyStock: undefined, // TODO: Get from reorder rules
        orgId,
      };
    } catch (error) {
      this.logger.error(
        `Error getting stock info for product ${productId} in warehouse ${warehouseId}`,
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          productId,
          warehouseId,
          orgId,
        }
      );
      return null;
    }
  }

  /**
   * Gets all organization IDs
   * TODO: This should come from an organization service
   */
  private async getAllOrganizationIds(): Promise<string[]> {
    // For now, return a default organization ID
    // In a real implementation, this would query the organization repository
    return ['default'];
  }
}
