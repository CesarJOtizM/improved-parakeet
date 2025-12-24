import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import { MinQuantity } from '../valueObjects/minQuantity.valueObject';
import { SafetyStock } from '../valueObjects/safetyStock.valueObject';

export type AlertSeverity = 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';

export interface IStockAlertEvaluation {
  shouldAlert: boolean;
  severity: AlertSeverity;
  currentStock: Quantity;
  threshold: Quantity;
  message: string;
}

export interface IAlertServiceContext {
  productId: string;
  warehouseId: string;
  currentStock: Quantity;
  minQuantity?: MinQuantity;
  safetyStock?: SafetyStock;
  orgId: string;
}

export class AlertService {
  /**
   * Evaluates stock level against thresholds and determines if alert should be triggered
   * @param context Alert evaluation context
   * @returns Stock alert evaluation result
   */
  public static evaluateStockLevel(context: IAlertServiceContext): IStockAlertEvaluation {
    const { currentStock, minQuantity, safetyStock } = context;

    // Out of stock
    if (currentStock.isZero()) {
      return {
        shouldAlert: true,
        severity: 'OUT_OF_STOCK',
        currentStock,
        threshold: Quantity.create(0),
        message: `Product ${context.productId} is out of stock at warehouse ${context.warehouseId}`,
      };
    }

    // If no thresholds defined, no alert
    if (!minQuantity && !safetyStock) {
      return {
        shouldAlert: false,
        severity: 'LOW',
        currentStock,
        threshold: Quantity.create(0),
        message: 'No thresholds defined for this product',
      };
    }

    // Evaluate against safety stock first (most critical)
    if (safetyStock) {
      const safetyStockQuantity = Quantity.create(safetyStock.getNumericValue());
      if (currentStock.getNumericValue() <= safetyStockQuantity.getNumericValue()) {
        return {
          shouldAlert: true,
          severity: 'CRITICAL',
          currentStock,
          threshold: safetyStockQuantity,
          message: `Product ${context.productId} stock is at or below safety stock level (${safetyStock.getNumericValue()}) at warehouse ${context.warehouseId}`,
        };
      }
    }

    // Evaluate against minimum quantity
    if (minQuantity) {
      const minQuantityValue = Quantity.create(minQuantity.getNumericValue());
      if (currentStock.getNumericValue() <= minQuantityValue.getNumericValue()) {
        return {
          shouldAlert: true,
          severity: 'LOW',
          currentStock,
          threshold: minQuantityValue,
          message: `Product ${context.productId} stock is at or below minimum quantity (${minQuantity.getNumericValue()}) at warehouse ${context.warehouseId}`,
        };
      }
    }

    // Stock is above thresholds
    return {
      shouldAlert: false,
      severity: 'LOW',
      currentStock,
      threshold: minQuantity ? Quantity.create(minQuantity.getNumericValue()) : Quantity.create(0),
      message: 'Stock level is above thresholds',
    };
  }

  /**
   * Determines if an alert should be triggered based on stock level
   * @param currentStock Current stock quantity
   * @param minQuantity Minimum quantity threshold
   * @param safetyStock Safety stock threshold
   * @returns True if alert should be triggered
   */
  public static shouldTriggerAlert(
    currentStock: Quantity,
    minQuantity?: MinQuantity,
    safetyStock?: SafetyStock
  ): boolean {
    // Out of stock always triggers alert
    if (currentStock.isZero()) {
      return true;
    }

    // Check against safety stock (most critical)
    if (safetyStock) {
      if (currentStock.getNumericValue() <= safetyStock.getNumericValue()) {
        return true;
      }
    }

    // Check against minimum quantity
    if (minQuantity) {
      if (currentStock.getNumericValue() <= minQuantity.getNumericValue()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determines alert severity based on stock level
   * @param currentStock Current stock quantity
   * @param minQuantity Minimum quantity threshold
   * @param safetyStock Safety stock threshold
   * @returns Alert severity level
   */
  public static determineSeverity(
    currentStock: Quantity,
    minQuantity?: MinQuantity,
    safetyStock?: SafetyStock
  ): AlertSeverity {
    if (currentStock.isZero()) {
      return 'OUT_OF_STOCK';
    }

    if (safetyStock && currentStock.getNumericValue() <= safetyStock.getNumericValue()) {
      return 'CRITICAL';
    }

    if (minQuantity && currentStock.getNumericValue() <= minQuantity.getNumericValue()) {
      return 'LOW';
    }

    return 'LOW'; // Default, though should not trigger alert
  }
}
