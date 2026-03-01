import { describe, expect, it } from '@jest/globals';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('ReturnLine', () => {
  const customerReturnType = ReturnType.create('RETURN_CUSTOMER');
  const supplierReturnType = ReturnType.create('RETURN_SUPPLIER');

  const customerLineProps = () => ({
    productId: 'prod-001',
    quantity: Quantity.create(3),
    originalSalePrice: SalePrice.create(200, 'COP', 2),
    currency: 'COP',
  });

  const supplierLineProps = () => ({
    productId: 'prod-002',
    quantity: Quantity.create(5),
    originalUnitCost: Money.create(100, 'COP', 2),
    currency: 'COP',
  });

  describe('create', () => {
    it('Given: valid customer return line props When: creating Then: should create successfully', () => {
      // Arrange
      const props = customerLineProps();

      // Act
      const line = ReturnLine.create(props, 'org-123', customerReturnType);

      // Assert
      expect(line.productId).toBe('prod-001');
      expect(line.quantity.getNumericValue()).toBe(3);
      expect(line.originalSalePrice).toBeDefined();
      expect(line.originalSalePrice!.getAmount()).toBe(200);
      expect(line.currency).toBe('COP');
      expect(line.orgId).toBe('org-123');
    });

    it('Given: valid supplier return line props When: creating Then: should create successfully', () => {
      // Arrange
      const props = supplierLineProps();

      // Act
      const line = ReturnLine.create(props, 'org-123', supplierReturnType);

      // Assert
      expect(line.productId).toBe('prod-002');
      expect(line.quantity.getNumericValue()).toBe(5);
      expect(line.originalUnitCost).toBeDefined();
      expect(line.originalUnitCost!.getAmount()).toBe(100);
      expect(line.originalSalePrice).toBeUndefined();
    });

    it('Given: customer return without originalSalePrice When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        productId: 'prod-001',
        quantity: Quantity.create(3),
        currency: 'COP',
      };

      // Act & Assert
      expect(() => ReturnLine.create(props, 'org-123', customerReturnType)).toThrow(
        'Original sale price is required for customer returns'
      );
    });

    it('Given: supplier return without originalUnitCost When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        productId: 'prod-002',
        quantity: Quantity.create(5),
        currency: 'COP',
      };

      // Act & Assert
      expect(() => ReturnLine.create(props, 'org-123', supplierReturnType)).toThrow(
        'Original unit cost is required for supplier returns'
      );
    });

    it('Given: props with locationId and extra When: creating Then: should include them', () => {
      // Arrange
      const props = {
        ...customerLineProps(),
        locationId: 'loc-001',
        extra: { reason: 'damaged' },
      };

      // Act
      const line = ReturnLine.create(props, 'org-123', customerReturnType);

      // Assert
      expect(line.locationId).toBe('loc-001');
      expect(line.extra).toEqual({ reason: 'damaged' });
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should create with existing id', () => {
      // Arrange
      const props = customerLineProps();

      // Act
      const line = ReturnLine.reconstitute(props, 'line-001', 'org-123');

      // Assert
      expect(line.id).toBe('line-001');
      expect(line.orgId).toBe('org-123');
      expect(line.productId).toBe('prod-001');
    });
  });

  describe('validation', () => {
    it('Given: zero quantity When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...customerLineProps(),
        quantity: Quantity.create(0),
      };

      // Act & Assert
      expect(() => ReturnLine.create(props, 'org-123', customerReturnType)).toThrow(
        'Quantity must be positive'
      );
    });

    it('Given: empty productId When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...customerLineProps(),
        productId: '',
      };

      // Act & Assert
      expect(() => ReturnLine.create(props, 'org-123', customerReturnType)).toThrow(
        'Product ID is required'
      );
    });

    it('Given: empty currency When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...customerLineProps(),
        currency: '',
      };

      // Act & Assert
      expect(() => ReturnLine.create(props, 'org-123', customerReturnType)).toThrow(
        'Currency is required'
      );
    });

    it('Given: empty locationId When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...customerLineProps(),
        locationId: '',
      };

      // Act & Assert
      expect(() => ReturnLine.create(props, 'org-123', customerReturnType)).toThrow(
        'Location ID cannot be empty if provided'
      );
    });
  });

  describe('update', () => {
    it('Given: existing line When: updating quantity Then: should update successfully', () => {
      // Arrange
      const line = ReturnLine.create(customerLineProps(), 'org-123', customerReturnType);
      const newQuantity = Quantity.create(10);

      // Act
      line.update({ quantity: newQuantity });

      // Assert
      expect(line.quantity.getNumericValue()).toBe(10);
    });

    it('Given: existing line When: updating with invalid quantity Then: should throw error', () => {
      // Arrange
      const line = ReturnLine.create(customerLineProps(), 'org-123', customerReturnType);

      // Act & Assert
      expect(() => line.update({ quantity: Quantity.create(0) })).toThrow(
        'Quantity must be positive'
      );
    });

    it('Given: existing line When: updating originalSalePrice Then: should update successfully', () => {
      // Arrange
      const line = ReturnLine.create(customerLineProps(), 'org-123', customerReturnType);
      const newPrice = SalePrice.create(300, 'COP', 2);

      // Act
      line.update({ originalSalePrice: newPrice });

      // Assert
      expect(line.originalSalePrice!.getAmount()).toBe(300);
    });
  });

  describe('getTotalPrice', () => {
    it('Given: customer line with originalSalePrice When: getting total Then: should return quantity * price', () => {
      // Arrange
      const line = ReturnLine.create(customerLineProps(), 'org-123', customerReturnType);

      // Act
      const total = line.getTotalPrice();

      // Assert
      expect(total).not.toBeNull();
      expect(total!.getAmount()).toBe(600); // 3 * 200
      expect(total!.getCurrency()).toBe('COP');
    });

    it('Given: supplier line with originalUnitCost When: getting total Then: should return quantity * cost', () => {
      // Arrange
      const line = ReturnLine.create(supplierLineProps(), 'org-123', supplierReturnType);

      // Act
      const total = line.getTotalPrice();

      // Assert
      expect(total).not.toBeNull();
      expect(total!.getAmount()).toBe(500); // 5 * 100
      expect(total!.getCurrency()).toBe('COP');
    });

    it('Given: line without price or cost When: getting total Then: should return null', () => {
      // Arrange - use reconstitute to bypass create validation
      const line = ReturnLine.reconstitute(
        {
          productId: 'prod-001',
          quantity: Quantity.create(3),
          currency: 'COP',
        },
        'line-001',
        'org-123'
      );

      // Act
      const total = line.getTotalPrice();

      // Assert
      expect(total).toBeNull();
    });
  });
});
