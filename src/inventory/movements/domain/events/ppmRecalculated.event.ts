import { Money, Quantity } from '@inventory/stock';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class PPMRecalculatedEvent extends DomainEvent {
  constructor(
    private readonly _productId: string,
    private readonly _warehouseId: string,
    private readonly _oldAverageCost: Money,
    private readonly _newAverageCost: Money,
    private readonly _quantity: Quantity,
    private readonly _orgId: string,
    private readonly _occurredOn: Date
  ) {
    super();
  }

  get eventName(): string {
    return 'PPMRecalculated';
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

  get oldAverageCost(): Money {
    return this._oldAverageCost;
  }

  get newAverageCost(): Money {
    return this._newAverageCost;
  }

  get quantity(): Quantity {
    return this._quantity;
  }

  get orgId(): string {
    return this._orgId;
  }
}
