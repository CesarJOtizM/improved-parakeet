import { describe, expect, it } from '@jest/globals';
import { TransferRejectedEvent } from '@transfer/domain/events/transferRejected.event';
import { Transfer } from '@transfer/domain/entities/transfer.entity';

describe('TransferRejectedEvent', () => {
  const mockTransfer = {
    id: 'transfer-rej-001',
    orgId: 'org-300',
    fromWarehouseId: 'warehouse-X',
    toWarehouseId: 'warehouse-Y',
  } as unknown as Transfer;

  it('Given: a rejected transfer When: creating event Then: should set eventName to TransferRejected', () => {
    // Act
    const event = new TransferRejectedEvent(mockTransfer, 'Damaged goods');

    // Assert
    expect(event.eventName).toBe('TransferRejected');
  });

  it('Given: a rejected transfer with reason When: creating event Then: should expose all properties including rejection reason', () => {
    // Act
    const event = new TransferRejectedEvent(mockTransfer, 'Items do not match order');

    // Assert
    expect(event.transferId).toBe('transfer-rej-001');
    expect(event.orgId).toBe('org-300');
    expect(event.fromWarehouseId).toBe('warehouse-X');
    expect(event.toWarehouseId).toBe('warehouse-Y');
    expect(event.rejectionReason).toBe('Items do not match order');
  });

  it('Given: a rejected transfer without reason When: creating event Then: should have undefined rejection reason', () => {
    // Act
    const event = new TransferRejectedEvent(mockTransfer);

    // Assert
    expect(event.rejectionReason).toBeUndefined();
    expect(event.eventName).toBe('TransferRejected');
  });
});
