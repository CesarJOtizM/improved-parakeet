import { ReorderRule } from '@inventory/stock/domain/entities/reorderRule.entity';
import { MaxQuantity } from '@inventory/stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@inventory/stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@inventory/stock/domain/valueObjects/safetyStock.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('ReorderRule Entity', () => {
  const orgId = 'org-123';

  const buildRule = () =>
    ReorderRule.create(
      {
        productId: 'product-1',
        warehouseId: 'warehouse-1',
        minQty: MinQuantity.create(5),
        maxQty: MaxQuantity.create(10),
        safetyQty: SafetyStock.create(3),
      },
      orgId
    );

  describe('create', () => {
    it('Given: valid props When: creating Then: should expose getters', () => {
      // Arrange & Act
      const rule = buildRule();

      // Assert
      expect(rule.productId).toBe('product-1');
      expect(rule.warehouseId).toBe('warehouse-1');
      expect(rule.minQty.getNumericValue()).toBe(5);
      expect(rule.maxQty.getNumericValue()).toBe(10);
      expect(rule.safetyQty.getNumericValue()).toBe(3);
    });
  });

  describe('updates', () => {
    it('Given: higher max When: updating max qty Then: should update value', () => {
      // Arrange
      const rule = buildRule();
      const updatedMax = MaxQuantity.create(15);

      // Act
      rule.updateMaxQty(updatedMax);

      // Assert
      expect(rule.maxQty.getNumericValue()).toBe(15);
    });

    it('Given: invalid min When: updating min qty Then: should throw error', () => {
      // Arrange
      const rule = buildRule();
      const invalidMin = MinQuantity.create(10);

      // Act & Assert
      expect(() => rule.updateMinQty(invalidMin)).toThrow(
        'MaxQuantity must be greater than MinQuantity'
      );
    });
  });
});
