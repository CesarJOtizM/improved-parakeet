import { Movement } from '@inventory/movements/domain/entities/movement.entity';
import { MovementLine } from '@inventory/movements/domain/entities/movementLine.entity';
import { MovementStatus } from '@inventory/movements/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@inventory/movements/domain/valueObjects/movementType.valueObject';
import { Product } from '@inventory/products/domain/entities/product.entity';
import { describe, expect, it } from '@jest/globals';
import { StockValidationService } from '@stock/domain/services/stockValidation.service';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('StockValidationService', () => {
  describe('validateStockForOutput', () => {
    const mockProductId = 'product-123';
    const mockLocationId = 'location-123';

    const createMovement = (
      type: 'IN' | 'OUT' | 'ADJUST_IN' | 'ADJUST_OUT',
      status: 'DRAFT' | 'POSTED',
      productId: string,
      locationId: string | undefined,
      quantity: number
    ): Movement => {
      const line = MovementLine.reconstitute(
        {
          productId,
          locationId,
          quantity: Quantity.create(quantity),
          currency: 'COP',
        },
        'line-1',
        'org-123'
      );

      return Movement.reconstitute(
        {
          type: MovementType.create(type),
          status: MovementStatus.create(status),
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        'movement-1',
        'org-123',
        [line]
      );
    };

    it('Given: sufficient stock and no pending movements When: validating output Then: should return valid', () => {
      // Arrange
      const requestedQuantity = Quantity.create(5);
      const currentStock = Quantity.create(10);

      // Act
      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        mockLocationId,
        requestedQuantity,
        currentStock,
        []
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.availableQuantity.getNumericValue()).toBe(10);
    });

    it('Given: insufficient stock When: validating output Then: should return invalid', () => {
      // Arrange
      const requestedQuantity = Quantity.create(15);
      const currentStock = Quantity.create(10);

      // Act
      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        mockLocationId,
        requestedQuantity,
        currentStock,
        []
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('Given: zero requested quantity When: validating output Then: should return invalid', () => {
      // Arrange
      const requestedQuantity = Quantity.create(0);
      const currentStock = Quantity.create(10);

      // Act
      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        mockLocationId,
        requestedQuantity,
        currentStock,
        []
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be positive');
    });

    it('Given: pending OUT movement for same product/location When: validating Then: should subtract from available', () => {
      const requestedQuantity = Quantity.create(5);
      const currentStock = Quantity.create(10);
      const pendingOut = createMovement('OUT', 'POSTED', mockProductId, mockLocationId, 3);

      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        mockLocationId,
        requestedQuantity,
        currentStock,
        [pendingOut]
      );

      expect(result.isValid).toBe(true);
      expect(result.availableQuantity.getNumericValue()).toBe(7); // 10 - 3
    });

    it('Given: pending IN movement for same product/location When: validating Then: should add to available', () => {
      const requestedQuantity = Quantity.create(12);
      const currentStock = Quantity.create(10);
      const pendingIn = createMovement('IN', 'POSTED', mockProductId, mockLocationId, 5);

      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        mockLocationId,
        requestedQuantity,
        currentStock,
        [pendingIn]
      );

      expect(result.isValid).toBe(true);
      expect(result.availableQuantity.getNumericValue()).toBe(15); // 10 + 5
    });

    it('Given: pending ADJUST_OUT movement for same product/location When: validating Then: should subtract', () => {
      const requestedQuantity = Quantity.create(5);
      const currentStock = Quantity.create(10);
      const pendingAdjustOut = createMovement(
        'ADJUST_OUT',
        'POSTED',
        mockProductId,
        mockLocationId,
        4
      );

      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        mockLocationId,
        requestedQuantity,
        currentStock,
        [pendingAdjustOut]
      );

      expect(result.isValid).toBe(true);
      expect(result.availableQuantity.getNumericValue()).toBe(6); // 10 - 4
    });

    it('Given: pending ADJUST_IN movement for same product/location When: validating Then: should add', () => {
      const requestedQuantity = Quantity.create(5);
      const currentStock = Quantity.create(10);
      const pendingAdjustIn = createMovement(
        'ADJUST_IN',
        'POSTED',
        mockProductId,
        mockLocationId,
        2
      );

      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        mockLocationId,
        requestedQuantity,
        currentStock,
        [pendingAdjustIn]
      );

      expect(result.isValid).toBe(true);
      expect(result.availableQuantity.getNumericValue()).toBe(12); // 10 + 2
    });

    it('Given: pending movement for different product When: validating Then: should not affect available', () => {
      const requestedQuantity = Quantity.create(5);
      const currentStock = Quantity.create(10);
      const differentProduct = createMovement('OUT', 'POSTED', 'other-product', mockLocationId, 8);

      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        mockLocationId,
        requestedQuantity,
        currentStock,
        [differentProduct]
      );

      expect(result.isValid).toBe(true);
      expect(result.availableQuantity.getNumericValue()).toBe(10); // unchanged
    });

    it('Given: pending movement for different location When: validating Then: should not affect available', () => {
      const requestedQuantity = Quantity.create(5);
      const currentStock = Quantity.create(10);
      const differentLocation = createMovement('OUT', 'POSTED', mockProductId, 'other-location', 8);

      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        mockLocationId,
        requestedQuantity,
        currentStock,
        [differentLocation]
      );

      expect(result.isValid).toBe(true);
      expect(result.availableQuantity.getNumericValue()).toBe(10); // unchanged
    });

    it('Given: DRAFT movement When: validating Then: should be ignored', () => {
      const requestedQuantity = Quantity.create(5);
      const currentStock = Quantity.create(10);
      const draftMovement = createMovement('OUT', 'DRAFT', mockProductId, mockLocationId, 8);

      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        mockLocationId,
        requestedQuantity,
        currentStock,
        [draftMovement]
      );

      expect(result.isValid).toBe(true);
      expect(result.availableQuantity.getNumericValue()).toBe(10); // unchanged, DRAFT is ignored
    });

    it('Given: undefined locationId for both stock and movement When: validating Then: should match', () => {
      const requestedQuantity = Quantity.create(5);
      const currentStock = Quantity.create(10);
      const pendingOut = createMovement('OUT', 'POSTED', mockProductId, undefined, 3);

      const result = StockValidationService.validateStockForOutput(
        mockProductId,
        undefined,
        requestedQuantity,
        currentStock,
        [pendingOut]
      );

      expect(result.isValid).toBe(true);
      expect(result.availableQuantity.getNumericValue()).toBe(7); // 10 - 3
    });
  });

  describe('validateProductForMovement', () => {
    it('Given: active product When: validating for movement Then: should return valid', () => {
      // Arrange
      const product = {
        isActive: true,
      } as Product;

      // Act
      const result = StockValidationService.validateProductForMovement(product);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: inactive product When: validating for movement Then: should return invalid', () => {
      // Arrange
      const product = {
        isActive: false,
      } as Product;

      // Act
      const result = StockValidationService.validateProductForMovement(product);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product is not active');
    });
  });

  describe('validateWarehouseForMovement', () => {
    it('Given: active warehouse When: validating for movement Then: should return valid', () => {
      // Arrange
      const warehouse = {
        isActive: true,
      };

      // Act
      const result = StockValidationService.validateWarehouseForMovement(warehouse);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: inactive warehouse When: validating for movement Then: should return invalid', () => {
      // Arrange
      const warehouse = {
        isActive: false,
      };

      // Act
      const result = StockValidationService.validateWarehouseForMovement(warehouse);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Warehouse is not active');
    });
  });

  describe('validateLocationForMovement', () => {
    it('Given: active location When: validating for movement Then: should return valid', () => {
      // Arrange
      const location = {
        isActive: true,
      };

      // Act
      const result = StockValidationService.validateLocationForMovement(location);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: inactive location When: validating for movement Then: should return invalid', () => {
      // Arrange
      const location = {
        isActive: false,
      };

      // Act
      const result = StockValidationService.validateLocationForMovement(location);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Location is not active');
    });
  });
});
