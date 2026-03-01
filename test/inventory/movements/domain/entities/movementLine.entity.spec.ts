import { describe, expect, it } from '@jest/globals';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('MovementLine', () => {
  const defaultProps = () => ({
    productId: 'prod-001',
    quantity: Quantity.create(10),
    unitCost: Money.create(100, 'COP', 2),
    currency: 'COP',
  });

  describe('create', () => {
    it('Given: valid props When: creating movement line Then: should create successfully', () => {
      // Arrange
      const props = defaultProps();

      // Act
      const line = MovementLine.create(props, 'org-123');

      // Assert
      expect(line.productId).toBe('prod-001');
      expect(line.quantity.getNumericValue()).toBe(10);
      expect(line.unitCost?.getAmount()).toBe(100);
      expect(line.currency).toBe('COP');
      expect(line.orgId).toBe('org-123');
    });

    it('Given: props without optional fields When: creating movement line Then: should create with defaults', () => {
      // Arrange
      const props = {
        productId: 'prod-002',
        quantity: Quantity.create(5),
        currency: 'COP',
      };

      // Act
      const line = MovementLine.create(props, 'org-123');

      // Assert
      expect(line.unitCost).toBeUndefined();
      expect(line.locationId).toBeUndefined();
      expect(line.extra).toBeUndefined();
    });

    it('Given: props with locationId and extra When: creating Then: should include them', () => {
      // Arrange
      const props = {
        ...defaultProps(),
        locationId: 'loc-001',
        extra: { batch: 'B-2026-01' },
      };

      // Act
      const line = MovementLine.create(props, 'org-123');

      // Assert
      expect(line.locationId).toBe('loc-001');
      expect(line.extra).toEqual({ batch: 'B-2026-01' });
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should create with existing id', () => {
      // Arrange
      const props = defaultProps();

      // Act
      const line = MovementLine.reconstitute(props, 'line-001', 'org-123');

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
      expect(() => MovementLine.create(props, 'org-123')).toThrow('Quantity must be positive');
    });

    it('Given: zero unitCost When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...defaultProps(),
        unitCost: Money.create(0, 'COP', 2),
      };

      // Act & Assert
      expect(() => MovementLine.create(props, 'org-123')).toThrow(
        'Unit cost must be positive if provided'
      );
    });

    it('Given: mismatched currency When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        ...defaultProps(),
        unitCost: Money.create(100, 'USD', 2),
        currency: 'COP',
      };

      // Act & Assert
      expect(() => MovementLine.create(props, 'org-123')).toThrow(
        'Currency must match unit cost currency'
      );
    });

    it('Given: empty currency When: creating Then: should throw error', () => {
      // Arrange
      const props = {
        productId: 'prod-001',
        quantity: Quantity.create(10),
        currency: '',
      };

      // Act & Assert
      expect(() => MovementLine.create(props, 'org-123')).toThrow('Currency is required');
    });
  });

  describe('update', () => {
    it('Given: existing line When: updating quantity Then: should update successfully', () => {
      // Arrange
      const line = MovementLine.create(defaultProps(), 'org-123');
      const newQuantity = Quantity.create(20);

      // Act
      line.update({ quantity: newQuantity });

      // Assert
      expect(line.quantity.getNumericValue()).toBe(20);
    });

    it('Given: existing line When: updating with invalid quantity Then: should throw error', () => {
      // Arrange
      const line = MovementLine.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(() => line.update({ quantity: Quantity.create(0) })).toThrow(
        'Quantity must be positive'
      );
    });
  });

  describe('getTotalCost', () => {
    it('Given: line with unitCost When: getting total cost Then: should return quantity * unitCost', () => {
      // Arrange
      const line = MovementLine.create(defaultProps(), 'org-123');

      // Act
      const totalCost = line.getTotalCost();

      // Assert
      expect(totalCost).toBeDefined();
      expect(totalCost!.getAmount()).toBe(1000); // 10 * 100
      expect(totalCost!.getCurrency()).toBe('COP');
    });

    it('Given: line without unitCost When: getting total cost Then: should return undefined', () => {
      // Arrange
      const props = {
        productId: 'prod-001',
        quantity: Quantity.create(10),
        currency: 'COP',
      };
      const line = MovementLine.create(props, 'org-123');

      // Act
      const totalCost = line.getTotalCost();

      // Assert
      expect(totalCost).toBeUndefined();
    });
  });

  describe('hasCost', () => {
    it('Given: line with unitCost When: checking hasCost Then: should return true', () => {
      // Arrange
      const line = MovementLine.create(defaultProps(), 'org-123');

      // Act & Assert
      expect(line.hasCost()).toBe(true);
    });

    it('Given: line without unitCost When: checking hasCost Then: should return false', () => {
      // Arrange
      const props = {
        productId: 'prod-001',
        quantity: Quantity.create(10),
        currency: 'COP',
      };
      const line = MovementLine.create(props, 'org-123');

      // Act & Assert
      expect(line.hasCost()).toBe(false);
    });
  });
});
