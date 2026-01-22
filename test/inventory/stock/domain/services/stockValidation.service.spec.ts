import { Product } from '@inventory/products/domain/entities/product.entity';
import { describe, expect, it } from '@jest/globals';
import { StockValidationService } from '@stock/domain/services/stockValidation.service';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('StockValidationService', () => {
  describe('validateStockForOutput', () => {
    const mockProductId = 'product-123';
    const mockLocationId = 'location-123';

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
