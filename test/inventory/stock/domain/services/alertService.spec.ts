import { describe, expect, it } from '@jest/globals';
import { AlertService, IAlertServiceContext } from '@stock/domain/services/alertService';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

describe('AlertService', () => {
  const mockProductId = 'product-123';
  const mockWarehouseId = 'warehouse-123';
  const mockOrgId = 'org-123';

  describe('evaluateStockLevel', () => {
    it('Given: zero stock When: evaluating stock level Then: should return OUT_OF_STOCK alert', () => {
      // Arrange
      const context: IAlertServiceContext = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        currentStock: Quantity.create(0),
        orgId: mockOrgId,
      };

      // Act
      const result = AlertService.evaluateStockLevel(context);

      // Assert
      expect(result.shouldAlert).toBe(true);
      expect(result.severity).toBe('OUT_OF_STOCK');
      expect(result.message).toContain('out of stock');
    });

    it('Given: stock without thresholds When: evaluating stock level Then: should not alert', () => {
      // Arrange
      const context: IAlertServiceContext = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        currentStock: Quantity.create(10),
        orgId: mockOrgId,
      };

      // Act
      const result = AlertService.evaluateStockLevel(context);

      // Assert
      expect(result.shouldAlert).toBe(false);
      expect(result.message).toContain('No thresholds defined');
    });

    it('Given: stock below safety stock When: evaluating stock level Then: should return CRITICAL alert', () => {
      // Arrange
      const context: IAlertServiceContext = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        currentStock: Quantity.create(5),
        safetyStock: SafetyStock.create(10),
        orgId: mockOrgId,
      };

      // Act
      const result = AlertService.evaluateStockLevel(context);

      // Assert
      expect(result.shouldAlert).toBe(true);
      expect(result.severity).toBe('CRITICAL');
      expect(result.message).toContain('safety stock level');
    });

    it('Given: stock at safety stock When: evaluating stock level Then: should return CRITICAL alert', () => {
      // Arrange
      const context: IAlertServiceContext = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        currentStock: Quantity.create(10),
        safetyStock: SafetyStock.create(10),
        orgId: mockOrgId,
      };

      // Act
      const result = AlertService.evaluateStockLevel(context);

      // Assert
      expect(result.shouldAlert).toBe(true);
      expect(result.severity).toBe('CRITICAL');
    });

    it('Given: stock below minimum quantity When: evaluating stock level Then: should return LOW alert', () => {
      // Arrange
      const context: IAlertServiceContext = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        currentStock: Quantity.create(5),
        minQuantity: MinQuantity.create(10),
        orgId: mockOrgId,
      };

      // Act
      const result = AlertService.evaluateStockLevel(context);

      // Assert
      expect(result.shouldAlert).toBe(true);
      expect(result.severity).toBe('LOW');
      expect(result.message).toContain('minimum quantity');
    });

    it('Given: stock above all thresholds When: evaluating stock level Then: should not alert', () => {
      // Arrange
      const context: IAlertServiceContext = {
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        currentStock: Quantity.create(100),
        minQuantity: MinQuantity.create(10),
        safetyStock: SafetyStock.create(5),
        orgId: mockOrgId,
      };

      // Act
      const result = AlertService.evaluateStockLevel(context);

      // Assert
      expect(result.shouldAlert).toBe(false);
      expect(result.message).toContain('above thresholds');
    });
  });

  describe('shouldTriggerAlert', () => {
    it('Given: zero stock When: checking alert trigger Then: should return true', () => {
      // Arrange
      const currentStock = Quantity.create(0);

      // Act
      const result = AlertService.shouldTriggerAlert(currentStock);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: stock below safety stock When: checking alert trigger Then: should return true', () => {
      // Arrange
      const currentStock = Quantity.create(5);
      const safetyStock = SafetyStock.create(10);

      // Act
      const result = AlertService.shouldTriggerAlert(currentStock, undefined, safetyStock);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: stock below minimum quantity When: checking alert trigger Then: should return true', () => {
      // Arrange
      const currentStock = Quantity.create(5);
      const minQuantity = MinQuantity.create(10);

      // Act
      const result = AlertService.shouldTriggerAlert(currentStock, minQuantity);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: stock above all thresholds When: checking alert trigger Then: should return false', () => {
      // Arrange
      const currentStock = Quantity.create(100);
      const minQuantity = MinQuantity.create(10);
      const safetyStock = SafetyStock.create(5);

      // Act
      const result = AlertService.shouldTriggerAlert(currentStock, minQuantity, safetyStock);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: stock with no thresholds When: checking alert trigger Then: should return false', () => {
      // Arrange
      const currentStock = Quantity.create(10);

      // Act
      const result = AlertService.shouldTriggerAlert(currentStock);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('determineSeverity', () => {
    it('Given: zero stock When: determining severity Then: should return OUT_OF_STOCK', () => {
      // Arrange
      const currentStock = Quantity.create(0);

      // Act
      const result = AlertService.determineSeverity(currentStock);

      // Assert
      expect(result).toBe('OUT_OF_STOCK');
    });

    it('Given: stock at safety stock level When: determining severity Then: should return CRITICAL', () => {
      // Arrange
      const currentStock = Quantity.create(5);
      const safetyStock = SafetyStock.create(5);

      // Act
      const result = AlertService.determineSeverity(currentStock, undefined, safetyStock);

      // Assert
      expect(result).toBe('CRITICAL');
    });

    it('Given: stock at minimum quantity level When: determining severity Then: should return LOW', () => {
      // Arrange
      const currentStock = Quantity.create(10);
      const minQuantity = MinQuantity.create(10);

      // Act
      const result = AlertService.determineSeverity(currentStock, minQuantity);

      // Assert
      expect(result).toBe('LOW');
    });

    it('Given: stock above all thresholds When: determining severity Then: should return LOW', () => {
      // Arrange
      const currentStock = Quantity.create(100);
      const minQuantity = MinQuantity.create(10);
      const safetyStock = SafetyStock.create(5);

      // Act
      const result = AlertService.determineSeverity(currentStock, minQuantity, safetyStock);

      // Assert
      expect(result).toBe('LOW');
    });
  });
});
