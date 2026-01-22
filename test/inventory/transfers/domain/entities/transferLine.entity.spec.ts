import { describe, expect, it } from '@jest/globals';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';

describe('TransferLine', () => {
  const mockOrgId = 'org-123';

  const createTransferLineProps = (
    overrides: Partial<{
      productId: string;
      quantity: number;
      fromLocationId?: string;
      toLocationId?: string;
    }> = {}
  ) => ({
    productId: overrides.productId || 'product-123',
    quantity: Quantity.create(overrides.quantity ?? 10, 2),
    fromLocationId: overrides.fromLocationId,
    toLocationId: overrides.toLocationId,
  });

  describe('create', () => {
    it('Given: valid transfer line props When: creating Then: should create successfully', () => {
      // Arrange
      const props = createTransferLineProps();

      // Act
      const line = TransferLine.create(props, mockOrgId);

      // Assert
      expect(line).toBeDefined();
      expect(line.productId).toBe('product-123');
      expect(line.quantity.getNumericValue()).toBe(10);
    });

    it('Given: transfer line with locations When: creating Then: should include locations', () => {
      // Arrange
      const props = createTransferLineProps({
        fromLocationId: 'from-loc',
        toLocationId: 'to-loc',
      });

      // Act
      const line = TransferLine.create(props, mockOrgId);

      // Assert
      expect(line.fromLocationId).toBe('from-loc');
      expect(line.toLocationId).toBe('to-loc');
    });

    it('Given: zero quantity When: creating Then: should throw error', () => {
      // Arrange
      const props = createTransferLineProps({ quantity: 0 });

      // Act & Assert
      expect(() => TransferLine.create(props, mockOrgId)).toThrow('Quantity must be positive');
    });
  });

  describe('reconstitute', () => {
    it('Given: valid props and id When: reconstituting Then: should create line', () => {
      // Arrange
      const props = createTransferLineProps();

      // Act
      const line = TransferLine.reconstitute(props, 'line-123', mockOrgId);

      // Assert
      expect(line).toBeDefined();
      expect(line.id).toBe('line-123');
    });
  });

  describe('update', () => {
    it('Given: transfer line When: updating quantity Then: should update quantity', () => {
      // Arrange
      const line = TransferLine.reconstitute(createTransferLineProps(), 'line-1', mockOrgId);
      const newQuantity = Quantity.create(20, 2);

      // Act
      line.update({ quantity: newQuantity });

      // Assert
      expect(line.quantity.getNumericValue()).toBe(20);
    });

    it('Given: transfer line When: updating fromLocationId Then: should update fromLocationId', () => {
      // Arrange
      const line = TransferLine.reconstitute(createTransferLineProps(), 'line-1', mockOrgId);

      // Act
      line.update({ fromLocationId: 'new-from-loc' });

      // Assert
      expect(line.fromLocationId).toBe('new-from-loc');
    });

    it('Given: transfer line When: updating toLocationId Then: should update toLocationId', () => {
      // Arrange
      const line = TransferLine.reconstitute(createTransferLineProps(), 'line-1', mockOrgId);

      // Act
      line.update({ toLocationId: 'new-to-loc' });

      // Assert
      expect(line.toLocationId).toBe('new-to-loc');
    });

    it('Given: transfer line When: updating with invalid quantity Then: should throw error', () => {
      // Arrange
      const line = TransferLine.reconstitute(createTransferLineProps(), 'line-1', mockOrgId);
      const zeroQuantity = Quantity.create(0, 2);

      // Act & Assert
      expect(() => line.update({ quantity: zeroQuantity })).toThrow('Quantity must be positive');
    });
  });

  describe('setFromLocation', () => {
    it('Given: transfer line When: setting from location Then: should update fromLocationId', () => {
      // Arrange
      const line = TransferLine.reconstitute(createTransferLineProps(), 'line-1', mockOrgId);

      // Act
      line.setFromLocation('source-location');

      // Assert
      expect(line.fromLocationId).toBe('source-location');
    });
  });

  describe('setToLocation', () => {
    it('Given: transfer line When: setting to location Then: should update toLocationId', () => {
      // Arrange
      const line = TransferLine.reconstitute(createTransferLineProps(), 'line-1', mockOrgId);

      // Act
      line.setToLocation('destination-location');

      // Assert
      expect(line.toLocationId).toBe('destination-location');
    });
  });

  describe('hasFromLocation', () => {
    it('Given: transfer line with fromLocationId When: checking hasFromLocation Then: should return true', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        createTransferLineProps({ fromLocationId: 'from-loc' }),
        'line-1',
        mockOrgId
      );

      // Act
      const result = line.hasFromLocation();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: transfer line without fromLocationId When: checking hasFromLocation Then: should return false', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        createTransferLineProps({ fromLocationId: undefined }),
        'line-1',
        mockOrgId
      );

      // Act
      const result = line.hasFromLocation();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('hasToLocation', () => {
    it('Given: transfer line with toLocationId When: checking hasToLocation Then: should return true', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        createTransferLineProps({ toLocationId: 'to-loc' }),
        'line-1',
        mockOrgId
      );

      // Act
      const result = line.hasToLocation();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: transfer line without toLocationId When: checking hasToLocation Then: should return false', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        createTransferLineProps({ toLocationId: undefined }),
        'line-1',
        mockOrgId
      );

      // Act
      const result = line.hasToLocation();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getters', () => {
    it('Given: transfer line When: getting productId Then: should return productId', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        createTransferLineProps({ productId: 'specific-product' }),
        'line-1',
        mockOrgId
      );

      // Act & Assert
      expect(line.productId).toBe('specific-product');
    });

    it('Given: transfer line When: getting quantity Then: should return quantity', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        createTransferLineProps({ quantity: 25 }),
        'line-1',
        mockOrgId
      );

      // Act & Assert
      expect(line.quantity.getNumericValue()).toBe(25);
    });

    it('Given: transfer line When: getting fromLocationId Then: should return fromLocationId', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        createTransferLineProps({ fromLocationId: 'source' }),
        'line-1',
        mockOrgId
      );

      // Act & Assert
      expect(line.fromLocationId).toBe('source');
    });

    it('Given: transfer line When: getting toLocationId Then: should return toLocationId', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        createTransferLineProps({ toLocationId: 'destination' }),
        'line-1',
        mockOrgId
      );

      // Act & Assert
      expect(line.toLocationId).toBe('destination');
    });
  });
});
