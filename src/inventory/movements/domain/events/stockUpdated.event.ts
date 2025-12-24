import { Quantity } from '@inventory/stock';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class StockUpdatedEvent extends DomainEvent {
  constructor(
    private readonly _productId: string,
    private readonly _warehouseId: string,
    private readonly _locationId: string | undefined,
    private readonly _quantityBefore: Quantity,
    private readonly _quantityAfter: Quantity,
    private readonly _orgId: string,
    private readonly _occurredOn: Date
  ) {
    super();
  }

  get eventName(): string {
    return 'StockUpdated';
  }

  get occurredOn(): Date {
    return this._occurredOn;
  }

  get productId(): string {
    return this._productId;
  }

  get warehouseId(): string {
    return this._warehouseId;
  }

  get locationId(): string | undefined {
    return this._locationId;
  }

  get quantityBefore(): Quantity {
    return this._quantityBefore;
  }

  get quantityAfter(): Quantity {
    return this._quantityAfter;
  }

  get orgId(): string {
    return this._orgId;
  }
}
