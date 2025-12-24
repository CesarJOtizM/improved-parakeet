import { Quantity } from '@inventory/stock';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { MinQuantity } from '../valueObjects/minQuantity.valueObject';
import { SafetyStock } from '../valueObjects/safetyStock.valueObject';

export class LowStockAlertEvent extends DomainEvent {
  constructor(
    private readonly _productId: string,
    private readonly _warehouseId: string,
    private readonly _currentStock: Quantity,
    private readonly _minQuantity: MinQuantity | undefined,
    private readonly _safetyStock: SafetyStock | undefined,
    private readonly _severity: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK',
    private readonly _orgId: string,
    private readonly _occurredOn: Date
  ) {
    super();
  }

  get eventName(): string {
    return 'LowStockAlert';
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

  get minQuantity(): MinQuantity | undefined {
    return this._minQuantity;
  }

  get safetyStock(): SafetyStock | undefined {
    return this._safetyStock;
  }

  get severity(): 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' {
    return this._severity;
  }

  get orgId(): string {
    return this._orgId;
  }
}
