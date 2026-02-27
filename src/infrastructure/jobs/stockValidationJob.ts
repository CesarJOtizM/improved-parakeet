import { PrismaService } from '@infrastructure/database/prisma.service';
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

import type { IOrganizationRepository } from '@organization/domain/repositories/organizationRepository.interface';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IReorderRuleRepository } from '@stock/domain/repositories/reorderRuleRepository.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

const FREQUENCY_HOURS: Record<string, number> = {
  EVERY_HOUR: 1,
  EVERY_6_HOURS: 6,
  EVERY_12_HOURS: 12,
  EVERY_DAY: 24,
  EVERY_WEEK: 168,
  EVERY_2_WEEKS: 336,
  EVERY_MONTH: 720,
};

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
    @Inject('ReorderRuleRepository')
    private readonly reorderRuleRepository: IReorderRuleRepository,
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    private readonly eventBus: DomainEventBus,
    private readonly prisma: PrismaService
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
      // Check AlertConfiguration for this org
      const alertConfig = await this.prisma.alertConfiguration.findUnique({
        where: { orgId },
      });

      // If alerts are explicitly disabled, skip
      if (alertConfig && !alertConfig.isEnabled) {
        this.logger.debug(`Alerts disabled for org ${orgId}, skipping`);
        return 0;
      }

      // Check if enough time has passed since last run based on configured frequency
      if (alertConfig?.lastRunAt) {
        const frequencyHours = FREQUENCY_HOURS[alertConfig.cronFrequency] || 1;
        const hoursSinceLastRun = (Date.now() - alertConfig.lastRunAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRun < frequencyHours) {
          this.logger.debug(
            `Skipping org ${orgId}: last run ${hoursSinceLastRun.toFixed(1)}h ago, frequency is every ${frequencyHours}h`
          );
          return 0;
        }
      }

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

            // Emit LowStockAlert event if needed (respecting severity config)
            if (evaluation.shouldAlert) {
              // Check if this severity is enabled in alert configuration
              const severityEnabled =
                !alertConfig ||
                (evaluation.severity === 'LOW' && alertConfig.notifyLowStock) ||
                (evaluation.severity === 'CRITICAL' && alertConfig.notifyCriticalStock) ||
                (evaluation.severity === 'OUT_OF_STOCK' && alertConfig.notifyOutOfStock);

              if (!severityEnabled) {
                continue; // Skip this alert - severity not enabled
              }

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
      // Update lastRunAt for this org
      if (alertConfig) {
        await this.prisma.alertConfiguration.update({
          where: { orgId },
          data: { lastRunAt: new Date() },
        });
      }
    } catch (error) {
      this.logger.error(`Error validating stock for organization ${orgId}:`, error);
    }

    return alertCount;
  }

  /**
   * Gets product stock information including thresholds
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

      // Get min/max/safety stock from reorder_rules table
      const reorderRule = await this.reorderRuleRepository.findByProductAndWarehouse(
        productId,
        warehouseId,
        orgId
      );

      const minQuantity = reorderRule ? reorderRule.minQty : undefined;
      const maxQuantity = reorderRule ? reorderRule.maxQty : undefined;
      const safetyStock = reorderRule ? reorderRule.safetyQty : undefined;

      return {
        productId,
        warehouseId,
        currentStock,
        minQuantity,
        maxQuantity,
        safetyStock,
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
   */
  private async getAllOrganizationIds(): Promise<string[]> {
    try {
      const organizations = await this.organizationRepository.findActiveOrganizations();
      return organizations.map(org => org.id);
    } catch (error) {
      this.logger.error('Error getting organization IDs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Fallback to empty array if there's an error
      return [];
    }
  }
}
