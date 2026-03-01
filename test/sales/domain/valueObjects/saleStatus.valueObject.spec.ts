import { describe, expect, it } from '@jest/globals';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';

describe('SaleStatus', () => {
  describe('create', () => {
    it('Given: DRAFT value When: creating Then: should create successfully', () => {
      // Act
      const status = SaleStatus.create('DRAFT');

      // Assert
      expect(status.getValue()).toBe('DRAFT');
    });

    it('Given: CONFIRMED value When: creating Then: should create successfully', () => {
      // Act
      const status = SaleStatus.create('CONFIRMED');

      // Assert
      expect(status.getValue()).toBe('CONFIRMED');
    });

    it('Given: PICKING value When: creating Then: should create successfully', () => {
      // Act
      const status = SaleStatus.create('PICKING');

      // Assert
      expect(status.getValue()).toBe('PICKING');
    });

    it('Given: SHIPPED value When: creating Then: should create successfully', () => {
      // Act
      const status = SaleStatus.create('SHIPPED');

      // Assert
      expect(status.getValue()).toBe('SHIPPED');
    });

    it('Given: COMPLETED value When: creating Then: should create successfully', () => {
      // Act
      const status = SaleStatus.create('COMPLETED');

      // Assert
      expect(status.getValue()).toBe('COMPLETED');
    });

    it('Given: CANCELLED value When: creating Then: should create successfully', () => {
      // Act
      const status = SaleStatus.create('CANCELLED');

      // Assert
      expect(status.getValue()).toBe('CANCELLED');
    });

    it('Given: RETURNED value When: creating Then: should create successfully', () => {
      // Act
      const status = SaleStatus.create('RETURNED');

      // Assert
      expect(status.getValue()).toBe('RETURNED');
    });

    it('Given: invalid value When: creating Then: should throw error', () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => SaleStatus.create('INVALID' as any)).toThrow('Invalid sale status: INVALID');
    });
  });

  describe('status check methods', () => {
    it('Given: DRAFT status When: checking isDraft Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('DRAFT');

      // Act & Assert
      expect(status.isDraft()).toBe(true);
      expect(status.isConfirmed()).toBe(false);
    });

    it('Given: CONFIRMED status When: checking isConfirmed Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('CONFIRMED');

      // Act & Assert
      expect(status.isConfirmed()).toBe(true);
      expect(status.isDraft()).toBe(false);
    });

    it('Given: PICKING status When: checking isPicking Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('PICKING');

      // Act & Assert
      expect(status.isPicking()).toBe(true);
    });

    it('Given: SHIPPED status When: checking isShipped Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('SHIPPED');

      // Act & Assert
      expect(status.isShipped()).toBe(true);
    });

    it('Given: COMPLETED status When: checking isCompleted Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('COMPLETED');

      // Act & Assert
      expect(status.isCompleted()).toBe(true);
    });

    it('Given: CANCELLED status When: checking isCancelled Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('CANCELLED');

      // Act & Assert
      expect(status.isCancelled()).toBe(true);
    });

    it('Given: RETURNED status When: checking isReturned Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('RETURNED');

      // Act & Assert
      expect(status.isReturned()).toBe(true);
    });
  });

  describe('canConfirm', () => {
    it('Given: DRAFT status When: checking canConfirm Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('DRAFT');

      // Act & Assert
      expect(status.canConfirm()).toBe(true);
    });

    it('Given: CONFIRMED status When: checking canConfirm Then: should return false', () => {
      // Arrange
      const status = SaleStatus.create('CONFIRMED');

      // Act & Assert
      expect(status.canConfirm()).toBe(false);
    });
  });

  describe('canStartPicking', () => {
    it('Given: CONFIRMED status When: checking canStartPicking Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('CONFIRMED');

      // Act & Assert
      expect(status.canStartPicking()).toBe(true);
    });

    it('Given: DRAFT status When: checking canStartPicking Then: should return false', () => {
      // Arrange
      const status = SaleStatus.create('DRAFT');

      // Act & Assert
      expect(status.canStartPicking()).toBe(false);
    });
  });

  describe('canShip', () => {
    it('Given: PICKING status When: checking canShip Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('PICKING');

      // Act & Assert
      expect(status.canShip()).toBe(true);
    });

    it('Given: CONFIRMED status When: checking canShip Then: should return false', () => {
      // Arrange
      const status = SaleStatus.create('CONFIRMED');

      // Act & Assert
      expect(status.canShip()).toBe(false);
    });
  });

  describe('canComplete', () => {
    it('Given: SHIPPED status When: checking canComplete Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('SHIPPED');

      // Act & Assert
      expect(status.canComplete()).toBe(true);
    });

    it('Given: PICKING status When: checking canComplete Then: should return false', () => {
      // Arrange
      const status = SaleStatus.create('PICKING');

      // Act & Assert
      expect(status.canComplete()).toBe(false);
    });
  });

  describe('canReturn', () => {
    it('Given: COMPLETED status When: checking canReturn Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('COMPLETED');

      // Act & Assert
      expect(status.canReturn()).toBe(true);
    });

    it('Given: SHIPPED status When: checking canReturn Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('SHIPPED');

      // Act & Assert
      expect(status.canReturn()).toBe(true);
    });

    it('Given: DRAFT status When: checking canReturn Then: should return false', () => {
      // Arrange
      const status = SaleStatus.create('DRAFT');

      // Act & Assert
      expect(status.canReturn()).toBe(false);
    });
  });

  describe('canCancel', () => {
    it('Given: DRAFT status When: checking canCancel Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('DRAFT');

      // Act & Assert
      expect(status.canCancel()).toBe(true);
    });

    it('Given: CONFIRMED status When: checking canCancel Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('CONFIRMED');

      // Act & Assert
      expect(status.canCancel()).toBe(true);
    });

    it('Given: PICKING status When: checking canCancel Then: should return true', () => {
      // Arrange
      const status = SaleStatus.create('PICKING');

      // Act & Assert
      expect(status.canCancel()).toBe(true);
    });

    it('Given: SHIPPED status When: checking canCancel Then: should return false', () => {
      // Arrange
      const status = SaleStatus.create('SHIPPED');

      // Act & Assert
      expect(status.canCancel()).toBe(false);
    });

    it('Given: COMPLETED status When: checking canCancel Then: should return false', () => {
      // Arrange
      const status = SaleStatus.create('COMPLETED');

      // Act & Assert
      expect(status.canCancel()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: any status When: getting value Then: should return correct value', () => {
      // Act
      const draft = SaleStatus.create('DRAFT');
      const confirmed = SaleStatus.create('CONFIRMED');
      const picking = SaleStatus.create('PICKING');
      const shipped = SaleStatus.create('SHIPPED');
      const completed = SaleStatus.create('COMPLETED');
      const cancelled = SaleStatus.create('CANCELLED');
      const returned = SaleStatus.create('RETURNED');

      // Assert
      expect(draft.getValue()).toBe('DRAFT');
      expect(confirmed.getValue()).toBe('CONFIRMED');
      expect(picking.getValue()).toBe('PICKING');
      expect(shipped.getValue()).toBe('SHIPPED');
      expect(completed.getValue()).toBe('COMPLETED');
      expect(cancelled.getValue()).toBe('CANCELLED');
      expect(returned.getValue()).toBe('RETURNED');
    });
  });
});
