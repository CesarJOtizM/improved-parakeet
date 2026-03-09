import { describe, expect, it, jest } from '@jest/globals';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';
import { Transfer } from '@transfer/domain/entities/transfer.entity';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

describe('Transfer', () => {
  const mockOrgId = 'org-123';

  const createDraftTransfer = (overrides: Partial<{ note: string }> = {}) => {
    return Transfer.create(
      {
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-2',
        status: TransferStatus.create('DRAFT'),
        createdBy: 'user-1',
        note: overrides.note,
      },
      mockOrgId
    );
  };

  const createTransferLine = (quantity: number = 10) => {
    return TransferLine.create(
      {
        productId: 'product-1',
        quantity: Quantity.create(quantity, 2),
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
      },
      mockOrgId
    );
  };

  const createReconstitutedTransfer = (
    status: 'DRAFT' | 'IN_TRANSIT' | 'PARTIAL' | 'RECEIVED' | 'REJECTED' | 'CANCELED',
    lines: TransferLine[] = []
  ) => {
    return Transfer.reconstitute(
      {
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-2',
        status: TransferStatus.create(status),
        createdBy: 'user-1',
        note: 'test note',
        initiatedAt: status !== 'DRAFT' ? new Date() : undefined,
      },
      'transfer-1',
      mockOrgId,
      lines
    );
  };

  describe('create', () => {
    it('Given: valid props When: creating transfer Then: should create successfully', () => {
      // Act
      const transfer = createDraftTransfer();

      // Assert
      expect(transfer).toBeDefined();
      expect(transfer.fromWarehouseId).toBe('warehouse-1');
      expect(transfer.toWarehouseId).toBe('warehouse-2');
      expect(transfer.status.isDraft()).toBe(true);
      expect(transfer.createdBy).toBe('user-1');
    });

    it('Given: same from and to warehouse When: creating transfer Then: should throw error', () => {
      // Act & Assert
      expect(() =>
        Transfer.create(
          {
            fromWarehouseId: 'warehouse-1',
            toWarehouseId: 'warehouse-1',
            status: TransferStatus.create('DRAFT'),
            createdBy: 'user-1',
          },
          mockOrgId
        )
      ).toThrow('From warehouse and to warehouse must be different');
    });

    it('Given: transfer with note When: creating Then: should include note', () => {
      // Act
      const transfer = createDraftTransfer({ note: 'test note' });

      // Assert
      expect(transfer.note).toBe('test note');
    });

    it('Given: transfer without note When: creating Then: note should be undefined', () => {
      // Act
      const transfer = createDraftTransfer();

      // Assert
      expect(transfer.note).toBeUndefined();
    });
  });

  describe('reconstitute', () => {
    it('Given: valid props with lines When: reconstituting Then: should include lines', () => {
      // Arrange
      const lines = [createTransferLine(10), createTransferLine(20)];

      // Act
      const transfer = createReconstitutedTransfer('DRAFT', lines);

      // Assert
      expect(transfer.getLines()).toHaveLength(2);
      expect(transfer.id).toBe('transfer-1');
    });

    it('Given: valid props without lines When: reconstituting Then: should have empty lines', () => {
      // Act
      const transfer = createReconstitutedTransfer('DRAFT');

      // Assert
      expect(transfer.getLines()).toHaveLength(0);
    });
  });

  describe('canAddLine', () => {
    it('Given: DRAFT transfer When: checking canAddLine Then: should return true', () => {
      const transfer = createReconstitutedTransfer('DRAFT');
      expect(transfer.canAddLine()).toBe(true);
    });

    it('Given: IN_TRANSIT transfer When: checking canAddLine Then: should return false', () => {
      const transfer = createReconstitutedTransfer('IN_TRANSIT');
      expect(transfer.canAddLine()).toBe(false);
    });

    it('Given: RECEIVED transfer When: checking canAddLine Then: should return false', () => {
      const transfer = createReconstitutedTransfer('RECEIVED');
      expect(transfer.canAddLine()).toBe(false);
    });

    it('Given: REJECTED transfer When: checking canAddLine Then: should return false', () => {
      const transfer = createReconstitutedTransfer('REJECTED');
      expect(transfer.canAddLine()).toBe(false);
    });

    it('Given: CANCELED transfer When: checking canAddLine Then: should return false', () => {
      const transfer = createReconstitutedTransfer('CANCELED');
      expect(transfer.canAddLine()).toBe(false);
    });
  });

  describe('canRemoveLine', () => {
    it('Given: DRAFT transfer When: checking canRemoveLine Then: should return true', () => {
      const transfer = createReconstitutedTransfer('DRAFT');
      expect(transfer.canRemoveLine()).toBe(true);
    });

    it('Given: IN_TRANSIT transfer When: checking canRemoveLine Then: should return false', () => {
      const transfer = createReconstitutedTransfer('IN_TRANSIT');
      expect(transfer.canRemoveLine()).toBe(false);
    });
  });

  describe('addLine', () => {
    it('Given: DRAFT transfer When: adding valid line Then: should add line', () => {
      // Arrange
      const transfer = createDraftTransfer();
      const line = createTransferLine(10);

      // Act
      transfer.addLine(line);

      // Assert
      expect(transfer.getLines()).toHaveLength(1);
    });

    it('Given: non-DRAFT transfer When: adding line Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('IN_TRANSIT');
      const line = createTransferLine(10);

      // Act & Assert
      expect(() => transfer.addLine(line)).toThrow(
        'Lines can only be added when transfer status is DRAFT'
      );
    });

    it('Given: line with non-positive quantity When: adding to DRAFT transfer Then: should throw error', () => {
      // Arrange
      const transfer = createDraftTransfer();
      const line = TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10, 2),
          fromLocationId: 'loc-1',
          toLocationId: 'loc-2',
        },
        'line-1',
        mockOrgId
      );
      // Mock isPositive to simulate non-positive quantity
      jest.spyOn(line.quantity, 'isPositive').mockReturnValue(false);

      // Act & Assert
      expect(() => transfer.addLine(line)).toThrow('Line quantity must be positive');
    });
  });

  describe('removeLine', () => {
    it('Given: DRAFT transfer with line When: removing existing line Then: should remove it', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10, 2),
        },
        'line-to-remove',
        mockOrgId
      );
      const transfer = createReconstitutedTransfer('DRAFT', [line]);

      // Act
      transfer.removeLine('line-to-remove');

      // Assert
      expect(transfer.getLines()).toHaveLength(0);
    });

    it('Given: non-DRAFT transfer When: removing line Then: should throw error', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10, 2),
        },
        'line-1',
        mockOrgId
      );
      const transfer = createReconstitutedTransfer('IN_TRANSIT', [line]);

      // Act & Assert
      expect(() => transfer.removeLine('line-1')).toThrow(
        'Lines can only be removed when transfer status is DRAFT'
      );
    });

    it('Given: DRAFT transfer When: removing non-existent line Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('DRAFT');

      // Act & Assert
      expect(() => transfer.removeLine('non-existent-id')).toThrow(
        'Line with id non-existent-id not found'
      );
    });
  });

  describe('canConfirm', () => {
    it('Given: DRAFT transfer with valid lines When: checking canConfirm Then: should return true', () => {
      // Arrange
      const lines = [createTransferLine(10)];
      const transfer = createReconstitutedTransfer('DRAFT', lines);

      // Act & Assert
      expect(transfer.canConfirm()).toBe(true);
    });

    it('Given: DRAFT transfer with no lines When: checking canConfirm Then: should return false', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('DRAFT');

      // Act & Assert
      expect(transfer.canConfirm()).toBe(false);
    });

    it('Given: DRAFT transfer with non-positive-quantity line When: checking canConfirm Then: should return false', () => {
      // Arrange - create a valid line then mock its quantity to return false for isPositive
      const line = TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10, 2),
        },
        'line-1',
        mockOrgId
      );
      // Override isPositive to simulate an invalid quantity scenario
      jest.spyOn(line.quantity, 'isPositive').mockReturnValue(false);
      const transfer = createReconstitutedTransfer('DRAFT', [line]);

      // Act & Assert
      expect(transfer.canConfirm()).toBe(false);
    });

    it('Given: RECEIVED transfer When: checking canConfirm Then: should return false', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('RECEIVED');

      // Act & Assert
      expect(transfer.canConfirm()).toBe(false);
    });

    it('Given: REJECTED transfer When: checking canConfirm Then: should return false', () => {
      const transfer = createReconstitutedTransfer('REJECTED');
      expect(transfer.canConfirm()).toBe(false);
    });

    it('Given: CANCELED transfer When: checking canConfirm Then: should return false', () => {
      const transfer = createReconstitutedTransfer('CANCELED');
      expect(transfer.canConfirm()).toBe(false);
    });

    it('Given: IN_TRANSIT transfer with valid lines When: checking canConfirm Then: should return true', () => {
      // canConfirm allows DRAFT and IN_TRANSIT statuses
      const lines = [createTransferLine(10)];
      const transfer = createReconstitutedTransfer('IN_TRANSIT', lines);
      expect(transfer.canConfirm()).toBe(true);
    });
  });

  describe('confirm', () => {
    it('Given: DRAFT transfer with valid lines When: confirming Then: should set status to IN_TRANSIT', () => {
      // Arrange
      const transfer = createDraftTransfer();
      transfer.addLine(createTransferLine(10));

      // Act
      transfer.confirm();

      // Assert
      expect(transfer.status.isInTransit()).toBe(true);
      expect(transfer.initiatedAt).toBeDefined();
    });

    it('Given: DRAFT transfer with no lines When: confirming Then: should throw error', () => {
      // Arrange
      const transfer = createDraftTransfer();

      // Act & Assert
      expect(() => transfer.confirm()).toThrow(
        'Transfer must have at least one line before confirmation'
      );
    });

    it('Given: RECEIVED transfer When: confirming Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('RECEIVED');

      // Act & Assert
      expect(() => transfer.confirm()).toThrow('Transfer cannot be confirmed');
    });

    it('Given: DRAFT transfer with non-positive-quantity line When: confirming Then: should throw error about positive quantities', () => {
      // Arrange - create a valid line then mock its quantity to return false for isPositive
      const line = TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10, 2),
        },
        'line-1',
        mockOrgId
      );
      jest.spyOn(line.quantity, 'isPositive').mockReturnValue(false);
      const transfer = createReconstitutedTransfer('DRAFT', [line]);

      // Act & Assert
      expect(() => transfer.confirm()).toThrow('All lines must have positive quantities');
    });
  });

  describe('receive', () => {
    it('Given: IN_TRANSIT transfer When: receiving Then: should set status to RECEIVED', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('IN_TRANSIT');

      // Act
      transfer.receive('receiver-user');

      // Assert
      expect(transfer.status.isReceived()).toBe(true);
      expect(transfer.receivedAt).toBeDefined();
      expect(transfer.receivedBy).toBe('receiver-user');
    });

    it('Given: IN_TRANSIT transfer When: receiving without userId Then: should set receivedBy to undefined', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('IN_TRANSIT');

      // Act
      transfer.receive();

      // Assert
      expect(transfer.status.isReceived()).toBe(true);
      expect(transfer.receivedBy).toBeUndefined();
    });

    it('Given: PARTIAL transfer When: receiving Then: should set status to RECEIVED', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('PARTIAL');

      // Act
      transfer.receive('user-1');

      // Assert
      expect(transfer.status.isReceived()).toBe(true);
    });

    it('Given: DRAFT transfer When: receiving Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('DRAFT');

      // Act & Assert
      expect(() => transfer.receive()).toThrow('Transfer cannot be received');
    });

    it('Given: RECEIVED transfer When: receiving again Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('RECEIVED');

      // Act & Assert
      expect(() => transfer.receive()).toThrow('Transfer cannot be received');
    });

    it('Given: CANCELED transfer When: receiving Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('CANCELED');

      // Act & Assert
      expect(() => transfer.receive()).toThrow('Transfer cannot be received');
    });
  });

  describe('receivePartial', () => {
    it('Given: IN_TRANSIT transfer When: receiving partial Then: should set status to PARTIAL', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('IN_TRANSIT');

      // Act
      transfer.receivePartial();

      // Assert
      expect(transfer.status.isPartial()).toBe(true);
    });

    it('Given: PARTIAL transfer When: receiving partial again Then: should still work (stays PARTIAL)', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('PARTIAL');

      // Act
      transfer.receivePartial();

      // Assert
      expect(transfer.status.isPartial()).toBe(true);
    });

    it('Given: DRAFT transfer When: receiving partial Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('DRAFT');

      // Act & Assert
      expect(() => transfer.receivePartial()).toThrow('Transfer cannot be partially received');
    });

    it('Given: RECEIVED transfer When: receiving partial Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('RECEIVED');

      // Act & Assert
      expect(() => transfer.receivePartial()).toThrow('Transfer cannot be partially received');
    });
  });

  describe('reject', () => {
    it('Given: IN_TRANSIT transfer When: rejecting Then: should set status to REJECTED', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('IN_TRANSIT');

      // Act
      transfer.reject('damaged goods');

      // Assert
      expect(transfer.status.isRejected()).toBe(true);
    });

    it('Given: IN_TRANSIT transfer When: rejecting without reason Then: should set status to REJECTED', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('IN_TRANSIT');

      // Act
      transfer.reject();

      // Assert
      expect(transfer.status.isRejected()).toBe(true);
    });

    it('Given: PARTIAL transfer When: rejecting Then: should set status to REJECTED', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('PARTIAL');

      // Act
      transfer.reject('incomplete order');

      // Assert
      expect(transfer.status.isRejected()).toBe(true);
    });

    it('Given: DRAFT transfer When: rejecting Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('DRAFT');

      // Act & Assert
      expect(() => transfer.reject()).toThrow('Transfer cannot be rejected');
    });

    it('Given: RECEIVED transfer When: rejecting Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('RECEIVED');

      // Act & Assert
      expect(() => transfer.reject()).toThrow('Transfer cannot be rejected');
    });

    it('Given: CANCELED transfer When: rejecting Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('CANCELED');

      // Act & Assert
      expect(() => transfer.reject()).toThrow('Transfer cannot be rejected');
    });
  });

  describe('cancel', () => {
    it('Given: DRAFT transfer When: canceling Then: should set status to CANCELED', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('DRAFT');

      // Act
      transfer.cancel();

      // Assert
      expect(transfer.status.isCanceled()).toBe(true);
    });

    it('Given: IN_TRANSIT transfer When: canceling Then: should set status to CANCELED', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('IN_TRANSIT');

      // Act
      transfer.cancel();

      // Assert
      expect(transfer.status.isCanceled()).toBe(true);
    });

    it('Given: RECEIVED transfer When: canceling Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('RECEIVED');

      // Act & Assert
      expect(() => transfer.cancel()).toThrow('Transfer cannot be canceled');
    });

    it('Given: REJECTED transfer When: canceling Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('REJECTED');

      // Act & Assert
      expect(() => transfer.cancel()).toThrow('Transfer cannot be canceled');
    });

    it('Given: PARTIAL transfer When: canceling Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('PARTIAL');

      // Act & Assert
      expect(() => transfer.cancel()).toThrow('Transfer cannot be canceled');
    });

    it('Given: already CANCELED transfer When: canceling Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('CANCELED');

      // Act & Assert
      expect(() => transfer.cancel()).toThrow('Transfer cannot be canceled');
    });
  });

  describe('canUpdate', () => {
    it('Given: DRAFT transfer When: checking canUpdate Then: should return true', () => {
      const transfer = createReconstitutedTransfer('DRAFT');
      expect(transfer.canUpdate()).toBe(true);
    });

    it('Given: IN_TRANSIT transfer When: checking canUpdate Then: should return true', () => {
      const transfer = createReconstitutedTransfer('IN_TRANSIT');
      expect(transfer.canUpdate()).toBe(true);
    });

    it('Given: PARTIAL transfer When: checking canUpdate Then: should return true', () => {
      const transfer = createReconstitutedTransfer('PARTIAL');
      expect(transfer.canUpdate()).toBe(true);
    });

    it('Given: RECEIVED transfer When: checking canUpdate Then: should return false', () => {
      const transfer = createReconstitutedTransfer('RECEIVED');
      expect(transfer.canUpdate()).toBe(false);
    });

    it('Given: REJECTED transfer When: checking canUpdate Then: should return false', () => {
      const transfer = createReconstitutedTransfer('REJECTED');
      expect(transfer.canUpdate()).toBe(false);
    });

    it('Given: CANCELED transfer When: checking canUpdate Then: should return false', () => {
      const transfer = createReconstitutedTransfer('CANCELED');
      expect(transfer.canUpdate()).toBe(false);
    });
  });

  describe('update', () => {
    it('Given: DRAFT transfer When: updating note Then: should create new transfer with updated note', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('DRAFT');

      // Act
      const updated = transfer.update({ note: 'updated note' });

      // Assert
      expect(updated.note).toBe('updated note');
      expect(updated.fromWarehouseId).toBe('warehouse-1');
      expect(updated.toWarehouseId).toBe('warehouse-2');
    });

    it('Given: DRAFT transfer When: updating without note Then: should preserve existing note', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('DRAFT');

      // Act
      const updated = transfer.update({});

      // Assert
      expect(updated.note).toBe('test note');
    });

    it('Given: RECEIVED transfer When: updating Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('RECEIVED');

      // Act & Assert
      expect(() => transfer.update({ note: 'new note' })).toThrow(
        'Cannot update transfer when status is RECEIVED, REJECTED, or CANCELED'
      );
    });

    it('Given: REJECTED transfer When: updating Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('REJECTED');

      // Act & Assert
      expect(() => transfer.update({})).toThrow(
        'Cannot update transfer when status is RECEIVED, REJECTED, or CANCELED'
      );
    });

    it('Given: CANCELED transfer When: updating Then: should throw error', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('CANCELED');

      // Act & Assert
      expect(() => transfer.update({})).toThrow(
        'Cannot update transfer when status is RECEIVED, REJECTED, or CANCELED'
      );
    });

    it('Given: DRAFT transfer with lines When: updating Then: should preserve lines in new instance', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10, 2),
        },
        'line-1',
        mockOrgId
      );
      const transfer = createReconstitutedTransfer('DRAFT', [line]);

      // Act
      const updated = transfer.update({ note: 'new note' });

      // Assert
      expect(updated.getLines()).toHaveLength(1);
    });
  });

  describe('getTotalQuantity', () => {
    it('Given: transfer with multiple lines When: getting total quantity Then: should sum all quantities', () => {
      // Arrange
      const line1 = TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10, 2),
        },
        'line-1',
        mockOrgId
      );
      const line2 = TransferLine.reconstitute(
        {
          productId: 'product-2',
          quantity: Quantity.create(20, 2),
        },
        'line-2',
        mockOrgId
      );
      const transfer = createReconstitutedTransfer('DRAFT', [line1, line2]);

      // Act
      const total = transfer.getTotalQuantity();

      // Assert
      expect(total).toBe(30);
    });

    it('Given: transfer with no lines When: getting total quantity Then: should return 0', () => {
      // Arrange
      const transfer = createReconstitutedTransfer('DRAFT');

      // Act
      const total = transfer.getTotalQuantity();

      // Assert
      expect(total).toBe(0);
    });
  });

  describe('getLines', () => {
    it('Given: transfer with lines When: getting lines Then: should return a copy of lines array', () => {
      // Arrange
      const line = TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10, 2),
        },
        'line-1',
        mockOrgId
      );
      const transfer = createReconstitutedTransfer('DRAFT', [line]);

      // Act
      const lines = transfer.getLines();
      lines.push(
        TransferLine.reconstitute(
          { productId: 'p', quantity: Quantity.create(5, 2) },
          'new-line',
          mockOrgId
        )
      );

      // Assert - original should be unchanged
      expect(transfer.getLines()).toHaveLength(1);
    });
  });

  describe('getters', () => {
    it('Given: transfer with all props When: accessing getters Then: should return correct values', () => {
      // Arrange
      const transfer = Transfer.reconstitute(
        {
          fromWarehouseId: 'wh-from',
          toWarehouseId: 'wh-to',
          status: TransferStatus.create('RECEIVED'),
          createdBy: 'creator-user',
          note: 'getter test',
          initiatedAt: new Date('2025-01-01'),
          receivedAt: new Date('2025-01-02'),
          receivedBy: 'receiver-user',
        },
        'transfer-id',
        mockOrgId
      );

      // Assert
      expect(transfer.fromWarehouseId).toBe('wh-from');
      expect(transfer.toWarehouseId).toBe('wh-to');
      expect(transfer.status.isReceived()).toBe(true);
      expect(transfer.createdBy).toBe('creator-user');
      expect(transfer.note).toBe('getter test');
      expect(transfer.initiatedAt).toEqual(new Date('2025-01-01'));
      expect(transfer.receivedAt).toEqual(new Date('2025-01-02'));
      expect(transfer.receivedBy).toBe('receiver-user');
    });

    it('Given: transfer without optional props When: accessing getters Then: should return undefined', () => {
      // Arrange
      const transfer = createDraftTransfer();

      // Assert
      expect(transfer.note).toBeUndefined();
      expect(transfer.initiatedAt).toBeUndefined();
      expect(transfer.receivedAt).toBeUndefined();
      expect(transfer.receivedBy).toBeUndefined();
    });
  });
});
