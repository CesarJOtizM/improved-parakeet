import { describe, expect, it } from '@jest/globals';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';

describe('MovementType', () => {
  describe('create', () => {
    it('Given: IN value When: creating Then: should create successfully', () => {
      // Act
      const type = MovementType.create('IN');

      // Assert
      expect(type.getValue()).toBe('IN');
    });

    it('Given: OUT value When: creating Then: should create successfully', () => {
      // Act
      const type = MovementType.create('OUT');

      // Assert
      expect(type.getValue()).toBe('OUT');
    });

    it('Given: ADJUST_IN value When: creating Then: should create successfully', () => {
      // Act
      const type = MovementType.create('ADJUST_IN');

      // Assert
      expect(type.getValue()).toBe('ADJUST_IN');
    });

    it('Given: ADJUST_OUT value When: creating Then: should create successfully', () => {
      // Act
      const type = MovementType.create('ADJUST_OUT');

      // Assert
      expect(type.getValue()).toBe('ADJUST_OUT');
    });

    it('Given: TRANSFER_IN value When: creating Then: should create successfully', () => {
      // Act
      const type = MovementType.create('TRANSFER_IN');

      // Assert
      expect(type.getValue()).toBe('TRANSFER_IN');
    });

    it('Given: TRANSFER_OUT value When: creating Then: should create successfully', () => {
      // Act
      const type = MovementType.create('TRANSFER_OUT');

      // Assert
      expect(type.getValue()).toBe('TRANSFER_OUT');
    });

    it('Given: invalid value When: creating Then: should throw error', () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => MovementType.create('INVALID' as any)).toThrow('Invalid movement type: INVALID');
    });
  });

  describe('isInput', () => {
    it('Given: IN type When: checking isInput Then: should return true', () => {
      // Arrange
      const type = MovementType.create('IN');

      // Act & Assert
      expect(type.isInput()).toBe(true);
    });

    it('Given: ADJUST_IN type When: checking isInput Then: should return true', () => {
      // Arrange
      const type = MovementType.create('ADJUST_IN');

      // Act & Assert
      expect(type.isInput()).toBe(true);
    });

    it('Given: TRANSFER_IN type When: checking isInput Then: should return true', () => {
      // Arrange
      const type = MovementType.create('TRANSFER_IN');

      // Act & Assert
      expect(type.isInput()).toBe(true);
    });

    it('Given: OUT type When: checking isInput Then: should return false', () => {
      // Arrange
      const type = MovementType.create('OUT');

      // Act & Assert
      expect(type.isInput()).toBe(false);
    });
  });

  describe('isOutput', () => {
    it('Given: OUT type When: checking isOutput Then: should return true', () => {
      // Arrange
      const type = MovementType.create('OUT');

      // Act & Assert
      expect(type.isOutput()).toBe(true);
    });

    it('Given: ADJUST_OUT type When: checking isOutput Then: should return true', () => {
      // Arrange
      const type = MovementType.create('ADJUST_OUT');

      // Act & Assert
      expect(type.isOutput()).toBe(true);
    });

    it('Given: TRANSFER_OUT type When: checking isOutput Then: should return true', () => {
      // Arrange
      const type = MovementType.create('TRANSFER_OUT');

      // Act & Assert
      expect(type.isOutput()).toBe(true);
    });

    it('Given: IN type When: checking isOutput Then: should return false', () => {
      // Arrange
      const type = MovementType.create('IN');

      // Act & Assert
      expect(type.isOutput()).toBe(false);
    });
  });

  describe('isTransfer', () => {
    it('Given: TRANSFER_IN type When: checking isTransfer Then: should return true', () => {
      // Arrange
      const type = MovementType.create('TRANSFER_IN');

      // Act & Assert
      expect(type.isTransfer()).toBe(true);
    });

    it('Given: TRANSFER_OUT type When: checking isTransfer Then: should return true', () => {
      // Arrange
      const type = MovementType.create('TRANSFER_OUT');

      // Act & Assert
      expect(type.isTransfer()).toBe(true);
    });

    it('Given: IN type When: checking isTransfer Then: should return false', () => {
      // Arrange
      const type = MovementType.create('IN');

      // Act & Assert
      expect(type.isTransfer()).toBe(false);
    });

    it('Given: ADJUST_IN type When: checking isTransfer Then: should return false', () => {
      // Arrange
      const type = MovementType.create('ADJUST_IN');

      // Act & Assert
      expect(type.isTransfer()).toBe(false);
    });
  });

  describe('isAdjustment', () => {
    it('Given: ADJUST_IN type When: checking isAdjustment Then: should return true', () => {
      // Arrange
      const type = MovementType.create('ADJUST_IN');

      // Act & Assert
      expect(type.isAdjustment()).toBe(true);
    });

    it('Given: ADJUST_OUT type When: checking isAdjustment Then: should return true', () => {
      // Arrange
      const type = MovementType.create('ADJUST_OUT');

      // Act & Assert
      expect(type.isAdjustment()).toBe(true);
    });

    it('Given: IN type When: checking isAdjustment Then: should return false', () => {
      // Arrange
      const type = MovementType.create('IN');

      // Act & Assert
      expect(type.isAdjustment()).toBe(false);
    });

    it('Given: TRANSFER_IN type When: checking isAdjustment Then: should return false', () => {
      // Arrange
      const type = MovementType.create('TRANSFER_IN');

      // Act & Assert
      expect(type.isAdjustment()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: any movement type When: getting value Then: should return correct value', () => {
      // Act
      const inType = MovementType.create('IN');
      const outType = MovementType.create('OUT');
      const adjustIn = MovementType.create('ADJUST_IN');
      const adjustOut = MovementType.create('ADJUST_OUT');
      const transferIn = MovementType.create('TRANSFER_IN');
      const transferOut = MovementType.create('TRANSFER_OUT');

      // Assert
      expect(inType.getValue()).toBe('IN');
      expect(outType.getValue()).toBe('OUT');
      expect(adjustIn.getValue()).toBe('ADJUST_IN');
      expect(adjustOut.getValue()).toBe('ADJUST_OUT');
      expect(transferIn.getValue()).toBe('TRANSFER_IN');
      expect(transferOut.getValue()).toBe('TRANSFER_OUT');
    });
  });
});
