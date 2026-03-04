import { describe, expect, it } from '@jest/globals';
import { SaleLineSwap } from '@sale/domain/entities/saleLineSwap.entity';

describe('SaleLineSwap', () => {
  const validProps = {
    saleId: 'sale-123',
    originalLineId: 'line-123',
    originalProductId: 'product-original',
    originalQuantity: 5,
    originalSalePrice: 100,
    originalCurrency: 'COP',
    replacementProductId: 'product-replacement',
    replacementQuantity: 5,
    replacementSalePrice: 120,
    replacementCurrency: 'COP',
    originalWarehouseId: 'warehouse-1',
    sourceWarehouseId: 'warehouse-1',
    isCrossWarehouse: false,
    pricingStrategy: 'KEEP_ORIGINAL' as const,
    performedBy: 'user-123',
  };

  describe('create', () => {
    it('Given: valid props When: creating Then: should create entity successfully', () => {
      // Act
      const swap = SaleLineSwap.create(validProps, 'org-123');

      // Assert
      expect(swap.saleId).toBe('sale-123');
      expect(swap.originalLineId).toBe('line-123');
      expect(swap.originalProductId).toBe('product-original');
      expect(swap.replacementProductId).toBe('product-replacement');
      expect(swap.replacementQuantity).toBe(5);
      expect(swap.pricingStrategy).toBe('KEEP_ORIGINAL');
      expect(swap.performedBy).toBe('user-123');
      expect(swap.isCrossWarehouse).toBe(false);
      expect(swap.orgId).toBe('org-123');
      expect(swap.id).toBeDefined();
    });

    it('Given: missing required fields When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => SaleLineSwap.create({ ...validProps, saleId: '' }, 'org-123')).toThrow(
        'Sale ID is required'
      );

      expect(() =>
        SaleLineSwap.create({ ...validProps, replacementQuantity: 0 }, 'org-123')
      ).toThrow('Replacement quantity must be positive');

      expect(() => SaleLineSwap.create({ ...validProps, performedBy: '' }, 'org-123')).toThrow(
        'PerformedBy is required'
      );
    });
  });

  describe('reconstitute', () => {
    it('Given: props with id When: reconstituting Then: should restore entity', () => {
      // Act
      const swap = SaleLineSwap.reconstitute(
        {
          ...validProps,
          returnMovementId: 'mov-1',
          deductMovementId: 'mov-2',
          newLineId: 'line-new',
        },
        'swap-123',
        'org-123'
      );

      // Assert
      expect(swap.id).toBe('swap-123');
      expect(swap.returnMovementId).toBe('mov-1');
      expect(swap.deductMovementId).toBe('mov-2');
      expect(swap.newLineId).toBe('line-new');
      expect(swap.reason).toBeUndefined();
    });
  });
});
