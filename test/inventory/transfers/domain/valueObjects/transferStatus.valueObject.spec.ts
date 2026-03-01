import { describe, expect, it } from '@jest/globals';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

describe('TransferStatus', () => {
  describe('create', () => {
    it('Given: DRAFT value When: creating Then: should create successfully', () => {
      // Act
      const status = TransferStatus.create('DRAFT');

      // Assert
      expect(status.getValue()).toBe('DRAFT');
      expect(status.isDraft()).toBe(true);
    });

    it('Given: IN_TRANSIT value When: creating Then: should create successfully', () => {
      // Act
      const status = TransferStatus.create('IN_TRANSIT');

      // Assert
      expect(status.getValue()).toBe('IN_TRANSIT');
      expect(status.isInTransit()).toBe(true);
    });

    it('Given: PARTIAL value When: creating Then: should create successfully', () => {
      // Act
      const status = TransferStatus.create('PARTIAL');

      // Assert
      expect(status.getValue()).toBe('PARTIAL');
      expect(status.isPartial()).toBe(true);
    });

    it('Given: RECEIVED value When: creating Then: should create successfully', () => {
      // Act
      const status = TransferStatus.create('RECEIVED');

      // Assert
      expect(status.getValue()).toBe('RECEIVED');
      expect(status.isReceived()).toBe(true);
    });

    it('Given: REJECTED value When: creating Then: should create successfully', () => {
      // Act
      const status = TransferStatus.create('REJECTED');

      // Assert
      expect(status.getValue()).toBe('REJECTED');
      expect(status.isRejected()).toBe(true);
    });

    it('Given: CANCELED value When: creating Then: should create successfully', () => {
      // Act
      const status = TransferStatus.create('CANCELED');

      // Assert
      expect(status.getValue()).toBe('CANCELED');
      expect(status.isCanceled()).toBe(true);
    });

    it('Given: invalid value When: creating Then: should throw error', () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => TransferStatus.create('INVALID' as any)).toThrow(
        'Invalid transfer status: INVALID'
      );
    });
  });

  describe('isDraft', () => {
    it('Given: DRAFT status When: checking isDraft Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('DRAFT');

      // Act & Assert
      expect(status.isDraft()).toBe(true);
    });

    it('Given: IN_TRANSIT status When: checking isDraft Then: should return false', () => {
      // Arrange
      const status = TransferStatus.create('IN_TRANSIT');

      // Act & Assert
      expect(status.isDraft()).toBe(false);
    });
  });

  describe('isInTransit', () => {
    it('Given: IN_TRANSIT status When: checking isInTransit Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('IN_TRANSIT');

      // Act & Assert
      expect(status.isInTransit()).toBe(true);
    });

    it('Given: DRAFT status When: checking isInTransit Then: should return false', () => {
      // Arrange
      const status = TransferStatus.create('DRAFT');

      // Act & Assert
      expect(status.isInTransit()).toBe(false);
    });
  });

  describe('canConfirm', () => {
    it('Given: DRAFT status When: checking canConfirm Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('DRAFT');

      // Act & Assert
      expect(status.canConfirm()).toBe(true);
    });

    it('Given: IN_TRANSIT status When: checking canConfirm Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('IN_TRANSIT');

      // Act & Assert
      expect(status.canConfirm()).toBe(true);
    });

    it('Given: RECEIVED status When: checking canConfirm Then: should return false', () => {
      // Arrange
      const status = TransferStatus.create('RECEIVED');

      // Act & Assert
      expect(status.canConfirm()).toBe(false);
    });

    it('Given: CANCELED status When: checking canConfirm Then: should return false', () => {
      // Arrange
      const status = TransferStatus.create('CANCELED');

      // Act & Assert
      expect(status.canConfirm()).toBe(false);
    });
  });

  describe('canReceive', () => {
    it('Given: IN_TRANSIT status When: checking canReceive Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('IN_TRANSIT');

      // Act & Assert
      expect(status.canReceive()).toBe(true);
    });

    it('Given: PARTIAL status When: checking canReceive Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('PARTIAL');

      // Act & Assert
      expect(status.canReceive()).toBe(true);
    });

    it('Given: DRAFT status When: checking canReceive Then: should return false', () => {
      // Arrange
      const status = TransferStatus.create('DRAFT');

      // Act & Assert
      expect(status.canReceive()).toBe(false);
    });

    it('Given: RECEIVED status When: checking canReceive Then: should return false', () => {
      // Arrange
      const status = TransferStatus.create('RECEIVED');

      // Act & Assert
      expect(status.canReceive()).toBe(false);
    });
  });

  describe('canReject', () => {
    it('Given: IN_TRANSIT status When: checking canReject Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('IN_TRANSIT');

      // Act & Assert
      expect(status.canReject()).toBe(true);
    });

    it('Given: PARTIAL status When: checking canReject Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('PARTIAL');

      // Act & Assert
      expect(status.canReject()).toBe(true);
    });

    it('Given: DRAFT status When: checking canReject Then: should return false', () => {
      // Arrange
      const status = TransferStatus.create('DRAFT');

      // Act & Assert
      expect(status.canReject()).toBe(false);
    });
  });

  describe('canCancel', () => {
    it('Given: DRAFT status When: checking canCancel Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('DRAFT');

      // Act & Assert
      expect(status.canCancel()).toBe(true);
    });

    it('Given: IN_TRANSIT status When: checking canCancel Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('IN_TRANSIT');

      // Act & Assert
      expect(status.canCancel()).toBe(true);
    });

    it('Given: RECEIVED status When: checking canCancel Then: should return false', () => {
      // Arrange
      const status = TransferStatus.create('RECEIVED');

      // Act & Assert
      expect(status.canCancel()).toBe(false);
    });

    it('Given: REJECTED status When: checking canCancel Then: should return false', () => {
      // Arrange
      const status = TransferStatus.create('REJECTED');

      // Act & Assert
      expect(status.canCancel()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: any transfer status When: getting value Then: should return correct value', () => {
      // Act
      const draft = TransferStatus.create('DRAFT');
      const inTransit = TransferStatus.create('IN_TRANSIT');
      const partial = TransferStatus.create('PARTIAL');
      const received = TransferStatus.create('RECEIVED');
      const rejected = TransferStatus.create('REJECTED');
      const canceled = TransferStatus.create('CANCELED');

      // Assert
      expect(draft.getValue()).toBe('DRAFT');
      expect(inTransit.getValue()).toBe('IN_TRANSIT');
      expect(partial.getValue()).toBe('PARTIAL');
      expect(received.getValue()).toBe('RECEIVED');
      expect(rejected.getValue()).toBe('REJECTED');
      expect(canceled.getValue()).toBe('CANCELED');
    });
  });
});
