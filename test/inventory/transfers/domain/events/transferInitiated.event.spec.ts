import { describe, expect, it } from '@jest/globals';
import { TransferInitiatedEvent } from '@transfer/domain/events/transferInitiated.event';
import { Transfer } from '@transfer/domain/entities/transfer.entity';

describe('TransferInitiatedEvent', () => {
  const mockTransfer = {
    id: 'transfer-001',
    orgId: 'org-100',
    fromWarehouseId: 'warehouse-from-001',
    toWarehouseId: 'warehouse-to-002',
    getTotalQuantity: () => 150,
    getLines: () => [{ id: 'line-1' }, { id: 'line-2' }],
  } as unknown as Transfer;

  it('Given: an initiated transfer When: creating event Then: should set eventName to TransferInitiated', () => {
    // Act
    const event = new TransferInitiatedEvent(mockTransfer);

    // Assert
    expect(event.eventName).toBe('TransferInitiated');
  });

  it('Given: an initiated transfer When: creating event Then: should expose all transfer properties', () => {
    // Act
    const event = new TransferInitiatedEvent(mockTransfer);

    // Assert
    expect(event.transferId).toBe('transfer-001');
    expect(event.orgId).toBe('org-100');
    expect(event.fromWarehouseId).toBe('warehouse-from-001');
    expect(event.toWarehouseId).toBe('warehouse-to-002');
    expect(event.totalQuantity).toBe(150);
    expect(event.lines).toBe(2);
  });

  it('Given: an initiated transfer When: creating event Then: should use current date as occurredOn', () => {
    // Act
    const now = Date.now();
    const event = new TransferInitiatedEvent(mockTransfer);

    // Assert — allow 1s tolerance for CI environments under load
    expect(Math.abs(event.occurredOn.getTime() - now)).toBeLessThan(1000);
  });
});
