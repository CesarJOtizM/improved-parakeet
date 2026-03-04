import { Quantity } from '@inventory/stock';
import { AlertSeverity } from '@stock/domain/services/alertService';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

/**
 * Low stock alert notification data transfer object
 */
export interface ILowStockAlertNotification {
  productId: string;
  warehouseId: string;
  currentStock: Quantity;
  minQuantity?: MinQuantity;
  safetyStock?: SafetyStock;
  severity: AlertSeverity;
  orgId: string;
}

/**
 * Stock threshold exceeded notification data transfer object
 */
export interface IStockThresholdExceededNotification {
  productId: string;
  warehouseId: string;
  currentStock: Quantity;
  maxQuantity: MaxQuantity;
  orgId: string;
}

/**
 * Stock alert digest item for low stock / out of stock / critical alerts
 */
export interface IStockAlertDigestItem {
  productName: string;
  sku: string;
  warehouseName: string;
  currentStock: number;
  threshold: number;
  severity: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW';
}

/**
 * Stock alert digest item for overstock alerts
 */
export interface IOverstockAlertDigestItem {
  productName: string;
  sku: string;
  warehouseName: string;
  currentStock: number;
  maxQuantity: number;
}

/**
 * Stock alert digest notification data transfer object
 */
export interface IStockAlertDigestNotification {
  orgId: string;
  orgName: string;
  recipientEmails: string[];
  lowStockItems: IStockAlertDigestItem[];
  overstockItems: IOverstockAlertDigestItem[];
  generatedAt: Date;
  language?: string;
}

/**
 * Notification service port interface
 * Output port for sending notifications following Hexagonal Architecture
 */
export interface INotificationService {
  sendLowStockAlert(notification: ILowStockAlertNotification): Promise<void>;
  sendStockThresholdExceededAlert(notification: IStockThresholdExceededNotification): Promise<void>;
  sendStockAlertDigest(notification: IStockAlertDigestNotification): Promise<void>;
}
