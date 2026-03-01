import { describe, expect, it } from '@jest/globals';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('SaleLine', () => {
  const defaultProps = () => ({
    productId: 'prod-001',
    quantity: Quantity.create(5),
    salePrice: SalePrice.create(200, 'COP', 2),
  });

  describe('create', () => {
    it('Given: valid props When: creating sale line Then: should create successfully', () => {
      // Arrange
      const props = defaultProps();

      // Act
      const line = SaleLine.create(props, 'org-123');

      // Assert
      expect(line.productId).toBe('prod-001');
      expect(line.quantity.getNumericValue()).toBe(5);
      expect(line.salePrice.getAmount()).toBe(200);
      expect(line.orgId).toBe('org-123');
    });

    it('Given: props without optional fields When: creating sale line Then: should create with defaults', () => {
      // Arrange
      const props = defaultProps();

      // Act
      const line = SaleLine.create(props, 'org-123');

      // Assert
      expect(line.locationId).toBeUndefined();
      expect(line.extra).toBeUndefined();
    });

    it('Given: props with locationId and extra When: creating Then: should include them', () => {
      // Arrange
      const props = {
        ...defaultProps(),
        locationId: 'loc-001',
        extra: { discount: 0.1 },
      };

      // Act
      const line = SaleLine.create(props, 'org-123');

      // Assert
      expect(line.locationId).toBe('loc-001');
      expect(line.extra).toEqual({ discount: 0.1 });
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should create with existing id', () => {
      // Arrange
      const props = defaultProps();

      // Act
      const line = SaleLine.reconstitute(props, 'line-001', 'org-123');

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
        ...defaultProps(),
        quantity: Quantity.create(0),
      };

      // Act & Assert
      expect(() => SaleLine.create(props, 'org-123')).toThrow('Quantity must be positive');
    });

    it('Given: empty productId When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...defaultProps(),
        productId: '',
      };

      // Act & Assert
      expect(() => SaleLine.create(props, 'org-123')).toThrow('Product ID is required');
    });

    it('Given: whitespace-only productId When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...defaultProps(),
        productId: '   ',
      };

      // Act & Assert
      expect(() => SaleLine.create(props, 'org-123')).toThrow('Product ID is required');
    });

    it('Given: empty locationId When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...defaultProps(),
        locationId: '',
      };

      // Act & Assert
      expect(() => SaleLine.create(props, 'org-123')).toThrow(
        'Location ID cannot be empty if provided'
      );
    });
  });

  describe('update', () => {
    it('Given: existing line When: updating quantity Then: should update successfully', () => {
      // Arrange
      const line = SaleLine.create(defaultProps(), 'org-123');
      const newQuantity = Quantity.create(10);

      // Act
      line.update({ quantity: newQuantity });

      // Assert
      expect(line.quantity.getNumericValue()).toBe(10);
    });

    it('Given: existing line When: updating salePrice Then: should update successfully', () => {
      // Arrange
      const line = SaleLine.create(defaultProps(), 'org-123');
      const newPrice = SalePrice.create(300, 'COP', 2);

      // Act
      line.update({ salePrice: newPrice });

      // Assert
      expect(line.salePrice.getAmount()).toBe(300);
    });

    it('Given: existing line When: updating with invalid quantity Then: should throw error', () => {
      // Arrange
      const line = SaleLine.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => line.update({ quantity: Quantity.create(0) })).toThrow(
        'Quantity must be positive'
      );
    });
  });

  describe('getTotalPrice', () => {
    it('Given: line with quantity and price When: getting total Then: should return quantity * price', () => {
      // Arrange
      const line = SaleLine.create(defaultProps(), 'org-123');

      // Act
      const total = line.getTotalPrice();

      // Assert
      expect(total.getAmount()).toBe(1000); // 5 * 200
      expect(total.getCurrency()).toBe('COP');
    });

    it('Given: line with updated quantity When: getting total Then: should reflect new quantity', () => {
      // Arrange
      const line = SaleLine.create(defaultProps(), 'org-123');
      line.update({ quantity: Quantity.create(3) });

      // Act
      const total = line.getTotalPrice();

      // Assert
      expect(total.getAmount()).toBe(600); // 3 * 200
    });
  });
});
