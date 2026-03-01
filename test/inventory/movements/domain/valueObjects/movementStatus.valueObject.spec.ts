import { describe, expect, it } from '@jest/globals';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';

describe('MovementStatus', () => {
  describe('create', () => {
    it('Given: DRAFT value When: creating Then: should create successfully', () => {
      // Act
      const status = MovementStatus.create('DRAFT');

      // Assert
      expect(status.getValue()).toBe('DRAFT');
      expect(status.isDraft()).toBe(true);
    });

    it('Given: POSTED value When: creating Then: should create successfully', () => {
      // Act
      const status = MovementStatus.create('POSTED');

      // Assert
      expect(status.getValue()).toBe('POSTED');
      expect(status.isPosted()).toBe(true);
    });

    it('Given: VOID value When: creating Then: should create successfully', () => {
      // Act
      const status = MovementStatus.create('VOID');

      // Assert
      expect(status.getValue()).toBe('VOID');
      expect(status.isVoid()).toBe(true);
    });

    it('Given: RETURNED value When: creating Then: should create successfully', () => {
      // Act
      const status = MovementStatus.create('RETURNED');

      // Assert
      expect(status.getValue()).toBe('RETURNED');
      expect(status.isReturned()).toBe(true);
    });

    it('Given: legacy VOIDED value When: creating Then: should normalize to VOID', () => {
      // Act
      const status = MovementStatus.create('VOIDED');

      // Assert
      expect(status.getValue()).toBe('VOID');
      expect(status.isVoid()).toBe(true);
    });

    it('Given: invalid value When: creating Then: should throw error', () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => MovementStatus.create('INVALID' as any)).toThrow(
        'Invalid movement status: INVALID'
      );
    });
  });

  describe('isDraft', () => {
    it('Given: DRAFT status When: checking isDraft Then: should return true', () => {
      // Arrange
      const status = MovementStatus.create('DRAFT');

      // Act & Assert
      expect(status.isDraft()).toBe(true);
    });

    it('Given: POSTED status When: checking isDraft Then: should return false', () => {
      // Arrange
      const status = MovementStatus.create('POSTED');

      // Act & Assert
      expect(status.isDraft()).toBe(false);
    });
  });

  describe('isPosted', () => {
    it('Given: POSTED status When: checking isPosted Then: should return true', () => {
      // Arrange
      const status = MovementStatus.create('POSTED');

      // Act & Assert
      expect(status.isPosted()).toBe(true);
    });

    it('Given: DRAFT status When: checking isPosted Then: should return false', () => {
      // Arrange
      const status = MovementStatus.create('DRAFT');

      // Act & Assert
      expect(status.isPosted()).toBe(false);
    });
  });

  describe('isVoid', () => {
    it('Given: VOID status When: checking isVoid Then: should return true', () => {
      // Arrange
      const status = MovementStatus.create('VOID');

      // Act & Assert
      expect(status.isVoid()).toBe(true);
    });

    it('Given: POSTED status When: checking isVoid Then: should return false', () => {
      // Arrange
      const status = MovementStatus.create('POSTED');

      // Act & Assert
      expect(status.isVoid()).toBe(false);
    });
  });

  describe('isReturned', () => {
    it('Given: RETURNED status When: checking isReturned Then: should return true', () => {
      // Arrange
      const status = MovementStatus.create('RETURNED');

      // Act & Assert
      expect(status.isReturned()).toBe(true);
    });

    it('Given: POSTED status When: checking isReturned Then: should return false', () => {
      // Arrange
      const status = MovementStatus.create('POSTED');

      // Act & Assert
      expect(status.isReturned()).toBe(false);
    });
  });

  describe('canPost', () => {
    it('Given: DRAFT status When: checking canPost Then: should return true', () => {
      // Arrange
      const status = MovementStatus.create('DRAFT');

      // Act & Assert
      expect(status.canPost()).toBe(true);
    });

    it('Given: POSTED status When: checking canPost Then: should return false', () => {
      // Arrange
      const status = MovementStatus.create('POSTED');

      // Act & Assert
      expect(status.canPost()).toBe(false);
    });

    it('Given: VOID status When: checking canPost Then: should return false', () => {
      // Arrange
      const status = MovementStatus.create('VOID');

      // Act & Assert
      expect(status.canPost()).toBe(false);
    });
  });

  describe('canVoid', () => {
    it('Given: POSTED status When: checking canVoid Then: should return true', () => {
      // Arrange
      const status = MovementStatus.create('POSTED');

      // Act & Assert
      expect(status.canVoid()).toBe(true);
    });

    it('Given: DRAFT status When: checking canVoid Then: should return false', () => {
      // Arrange
      const status = MovementStatus.create('DRAFT');

      // Act & Assert
      expect(status.canVoid()).toBe(false);
    });
  });

  describe('canReturn', () => {
    it('Given: POSTED status When: checking canReturn Then: should return true', () => {
      // Arrange
      const status = MovementStatus.create('POSTED');

      // Act & Assert
      expect(status.canReturn()).toBe(true);
    });

    it('Given: DRAFT status When: checking canReturn Then: should return false', () => {
      // Arrange
      const status = MovementStatus.create('DRAFT');

      // Act & Assert
      expect(status.canReturn()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: any movement status When: getting value Then: should return correct value', () => {
      // Act
      const draft = MovementStatus.create('DRAFT');
      const posted = MovementStatus.create('POSTED');
      const voidStatus = MovementStatus.create('VOID');
      const returned = MovementStatus.create('RETURNED');

      // Assert
      expect(draft.getValue()).toBe('DRAFT');
      expect(posted.getValue()).toBe('POSTED');
      expect(voidStatus.getValue()).toBe('VOID');
      expect(returned.getValue()).toBe('RETURNED');
    });
  });
});
