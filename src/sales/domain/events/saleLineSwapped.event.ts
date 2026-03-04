import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export interface ISaleLineSwappedEventProps {
  saleId: string;
  saleNumber: string;
  orgId: string;
  warehouseId: string;
  originalLineId: string;
  originalProductId: string;
  replacementProductId: string;
  swapQuantity: number;
  sourceWarehouseId: string;
  swapId: string;
  performedBy: string;
}

export class SaleLineSwappedEvent extends DomainEvent {
  constructor(private readonly _props: ISaleLineSwappedEventProps) {
    super();
  }

  get eventName(): string {
    return 'SaleLineSwapped';
  }

  get occurredOn(): Date {
    return new Date();
  }

  get saleId(): string {
    return this._props.saleId;
  }

  get saleNumber(): string {
    return this._props.saleNumber;
  }

  get orgId(): string {
    return this._props.orgId;
  }

  get warehouseId(): string {
    return this._props.warehouseId;
  }

  get originalLineId(): string {
    return this._props.originalLineId;
  }

  get originalProductId(): string {
    return this._props.originalProductId;
  }

  get replacementProductId(): string {
    return this._props.replacementProductId;
  }

  get swapQuantity(): number {
    return this._props.swapQuantity;
  }

  get sourceWarehouseId(): string {
    return this._props.sourceWarehouseId;
  }

  get swapId(): string {
    return this._props.swapId;
  }

  get performedBy(): string {
    return this._props.performedBy;
  }
}
