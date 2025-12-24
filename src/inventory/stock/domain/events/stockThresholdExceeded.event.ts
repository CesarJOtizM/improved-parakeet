import { Quantity } from '@inventory/stock';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { MaxQuantity } from '../valueObjects/maxQuantity.valueObject';

export class StockThresholdExceededEvent extends DomainEvent {
  constructor(
    private readonly _productId: string,
    private readonly _warehouseId: string,
    private readonly _currentStock: Quantity,
    private readonly _maxQuantity: MaxQuantity,
    private readonly _orgId: string,
    private readonly _occurredOn: Date
  ) {
    super();
  }

  get eventName(): string {
    return 'StockThresholdExceeded';
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

  get currentStock(): Quantity {
    return this._currentStock;
  }

  get maxQuantity(): MaxQuantity {
    return this._maxQuantity;
  }

  get orgId(): string {
    return this._orgId;
  }
}
