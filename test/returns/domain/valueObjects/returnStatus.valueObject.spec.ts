import { describe, expect, it } from '@jest/globals';
import { ReturnStatus } from '@return/domain/valueObjects/returnStatus.valueObject';

describe('ReturnStatus', () => {
  describe('create', () => {
    it('Given: DRAFT value When: creating Then: should create successfully', () => {
      // Act
      const status = ReturnStatus.create('DRAFT');

      // Assert
      expect(status.getValue()).toBe('DRAFT');
    });

    it('Given: CONFIRMED value When: creating Then: should create successfully', () => {
      // Act
      const status = ReturnStatus.create('CONFIRMED');

      // Assert
      expect(status.getValue()).toBe('CONFIRMED');
    });

    it('Given: CANCELLED value When: creating Then: should create successfully', () => {
      // Act
      const status = ReturnStatus.create('CANCELLED');

      // Assert
      expect(status.getValue()).toBe('CANCELLED');
    });

    it('Given: invalid value When: creating Then: should throw error', () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => ReturnStatus.create('INVALID' as any)).toThrow('Invalid return status: INVALID');
    });
  });

  describe('isDraft', () => {
    it('Given: DRAFT status When: checking isDraft Then: should return true', () => {
      // Arrange
      const status = ReturnStatus.create('DRAFT');

      // Act & Assert
      expect(status.isDraft()).toBe(true);
    });

    it('Given: CONFIRMED status When: checking isDraft Then: should return false', () => {
      // Arrange
      const status = ReturnStatus.create('CONFIRMED');

      // Act & Assert
      expect(status.isDraft()).toBe(false);
    });
  });

  describe('isConfirmed', () => {
    it('Given: CONFIRMED status When: checking isConfirmed Then: should return true', () => {
      // Arrange
      const status = ReturnStatus.create('CONFIRMED');

      // Act & Assert
      expect(status.isConfirmed()).toBe(true);
    });

    it('Given: DRAFT status When: checking isConfirmed Then: should return false', () => {
      // Arrange
      const status = ReturnStatus.create('DRAFT');

      // Act & Assert
      expect(status.isConfirmed()).toBe(false);
    });
  });

  describe('isCancelled', () => {
    it('Given: CANCELLED status When: checking isCancelled Then: should return true', () => {
      // Arrange
      const status = ReturnStatus.create('CANCELLED');

      // Act & Assert
      expect(status.isCancelled()).toBe(true);
    });

    it('Given: DRAFT status When: checking isCancelled Then: should return false', () => {
      // Arrange
      const status = ReturnStatus.create('DRAFT');

      // Act & Assert
      expect(status.isCancelled()).toBe(false);
    });
  });

  describe('canConfirm', () => {
    it('Given: DRAFT status When: checking canConfirm Then: should return true', () => {
      // Arrange
      const status = ReturnStatus.create('DRAFT');

      // Act & Assert
      expect(status.canConfirm()).toBe(true);
    });

    it('Given: CONFIRMED status When: checking canConfirm Then: should return false', () => {
      // Arrange
      const status = ReturnStatus.create('CONFIRMED');

      // Act & Assert
      expect(status.canConfirm()).toBe(false);
    });

    it('Given: CANCELLED status When: checking canConfirm Then: should return false', () => {
      // Arrange
      const status = ReturnStatus.create('CANCELLED');

      // Act & Assert
      expect(status.canConfirm()).toBe(false);
    });
  });

  describe('canCancel', () => {
    it('Given: DRAFT status When: checking canCancel Then: should return true', () => {
      // Arrange
      const status = ReturnStatus.create('DRAFT');

      // Act & Assert
      expect(status.canCancel()).toBe(true);
    });

    it('Given: CONFIRMED status When: checking canCancel Then: should return true', () => {
      // Arrange
      const status = ReturnStatus.create('CONFIRMED');

      // Act & Assert
      expect(status.canCancel()).toBe(true);
    });

    it('Given: CANCELLED status When: checking canCancel Then: should return false', () => {
      // Arrange
      const status = ReturnStatus.create('CANCELLED');

      // Act & Assert
      expect(status.canCancel()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: any status When: getting value Then: should return correct value', () => {
      // Act
      const draft = ReturnStatus.create('DRAFT');
      const confirmed = ReturnStatus.create('CONFIRMED');
      const cancelled = ReturnStatus.create('CANCELLED');

      // Assert
      expect(draft.getValue()).toBe('DRAFT');
      expect(confirmed.getValue()).toBe('CONFIRMED');
      expect(cancelled.getValue()).toBe('CANCELLED');
    });
  });
});
