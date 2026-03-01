import { describe, expect, it } from '@jest/globals';
import { TransferReceivedEvent } from '@transfer/domain/events/transferReceived.event';
import { Transfer } from '@transfer/domain/entities/transfer.entity';

describe('TransferReceivedEvent', () => {
  const mockTransfer = {
    id: 'transfer-recv-001',
    orgId: 'org-200',
    fromWarehouseId: 'warehouse-A',
    toWarehouseId: 'warehouse-B',
    getTotalQuantity: () => 75,
  } as unknown as Transfer;

  it('Given: a received transfer When: creating event Then: should set eventName to TransferReceived', () => {
    // Act
    const event = new TransferReceivedEvent(mockTransfer);

    // Assert
    expect(event.eventName).toBe('TransferReceived');
  });

  it('Given: a received transfer When: creating event Then: should expose all transfer properties', () => {
    // Act
    const event = new TransferReceivedEvent(mockTransfer);

    // Assert
    expect(event.transferId).toBe('transfer-recv-001');
    expect(event.orgId).toBe('org-200');
    expect(event.fromWarehouseId).toBe('warehouse-A');
    expect(event.toWarehouseId).toBe('warehouse-B');
    expect(event.totalQuantity).toBe(75);
  });

  it('Given: a received transfer When: creating event Then: should use current date as occurredOn', () => {
    // Act
    const before = new Date();
    const event = new TransferReceivedEvent(mockTransfer);
    const after = new Date();

    // Assert
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
