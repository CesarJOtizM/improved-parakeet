import { describe, expect, it } from '@jest/globals';
import { TransferDirection } from '@transfer/domain/valueObjects/transferDirection.valueObject';

describe('TransferDirection', () => {
  describe('create', () => {
    it('Given: OUTBOUND value When: creating Then: should create successfully', () => {
      // Act
      const direction = TransferDirection.create('OUTBOUND');

      // Assert
      expect(direction.getValue()).toBe('OUTBOUND');
      expect(direction.isOutbound()).toBe(true);
      expect(direction.isInbound()).toBe(false);
    });

    it('Given: INBOUND value When: creating Then: should create successfully', () => {
      // Act
      const direction = TransferDirection.create('INBOUND');

      // Assert
      expect(direction.getValue()).toBe('INBOUND');
      expect(direction.isInbound()).toBe(true);
      expect(direction.isOutbound()).toBe(false);
    });

    it('Given: invalid value When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => TransferDirection.create('INVALID' as any)).toThrow(
        'Invalid transfer direction: INVALID'
      );
    });
  });

  describe('isOutbound', () => {
    it('Given: OUTBOUND direction When: checking Then: should return true', () => {
      // Arrange
      const direction = TransferDirection.create('OUTBOUND');

      // Act & Assert
      expect(direction.isOutbound()).toBe(true);
    });

    it('Given: INBOUND direction When: checking isOutbound Then: should return false', () => {
      // Arrange
      const direction = TransferDirection.create('INBOUND');

      // Act & Assert
      expect(direction.isOutbound()).toBe(false);
    });
  });

  describe('isInbound', () => {
    it('Given: INBOUND direction When: checking Then: should return true', () => {
      // Arrange
      const direction = TransferDirection.create('INBOUND');

      // Act & Assert
      expect(direction.isInbound()).toBe(true);
    });

    it('Given: OUTBOUND direction When: checking isInbound Then: should return false', () => {
      // Arrange
      const direction = TransferDirection.create('OUTBOUND');

      // Act & Assert
      expect(direction.isInbound()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: any direction When: getting value Then: should return correct value', () => {
      // Act
      const outbound = TransferDirection.create('OUTBOUND');
      const inbound = TransferDirection.create('INBOUND');

      // Assert
      expect(outbound.getValue()).toBe('OUTBOUND');
      expect(inbound.getValue()).toBe('INBOUND');
    });
  });
});
