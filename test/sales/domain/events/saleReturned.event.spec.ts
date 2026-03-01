import { describe, expect, it } from '@jest/globals';
import { SaleReturnedEvent } from '@sale/domain/events/saleReturned.event';
import { Sale } from '@sale/domain/entities/sale.entity';

describe('SaleReturnedEvent', () => {
  const returnedAt = new Date('2026-02-28T13:00:00Z');

  const mockSale = {
    id: 'sale-ret-001',
    orgId: 'org-300',
    returnedAt,
    warehouseId: 'warehouse-003',
    saleNumber: { getValue: () => 'SALE-2026-020' },
  } as unknown as Sale;

  it('Given: a returned sale When: creating event Then: should set eventName to SaleReturned', () => {
    // Act
    const event = new SaleReturnedEvent(mockSale);

    // Assert
    expect(event.eventName).toBe('SaleReturned');
  });

  it('Given: a returned sale When: creating event Then: should expose all sale properties', () => {
    // Act
    const event = new SaleReturnedEvent(mockSale);

    // Assert
    expect(event.saleId).toBe('sale-ret-001');
    expect(event.orgId).toBe('org-300');
    expect(event.warehouseId).toBe('warehouse-003');
    expect(event.saleNumber).toBe('SALE-2026-020');
  });

  it('Given: a returned sale with returnedAt When: creating event Then: should use returnedAt as occurredOn', () => {
    // Act
    const event = new SaleReturnedEvent(mockSale);

    // Assert
    expect(event.occurredOn).toEqual(returnedAt);
  });
});
