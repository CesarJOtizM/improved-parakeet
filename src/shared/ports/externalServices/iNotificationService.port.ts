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
 * Notification service port interface
 * Output port for sending notifications following Hexagonal Architecture
 */
export interface INotificationService {
  sendLowStockAlert(notification: ILowStockAlertNotification): Promise<void>;
  sendStockThresholdExceededAlert(notification: IStockThresholdExceededNotification): Promise<void>;
}
