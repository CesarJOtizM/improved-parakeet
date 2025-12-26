import { Sale } from '@sale/domain/entities/sale.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class SaleConfirmedEvent extends DomainEvent {
  private readonly _movementId?: string;

  constructor(
    private readonly sale: Sale,
    movementId?: string
  ) {
    super();
    this._movementId = movementId;
  }

  get eventName(): string {
    return 'SaleConfirmed';
  }

  get occurredOn(): Date {
    return this.sale.confirmedAt || new Date();
  }

  get saleId(): string {
    return this.sale.id;
  }

  get saleNumber(): string {
    return this.sale.saleNumber.getValue();
  }

  get movementId(): string | undefined {
    return this._movementId;
  }

  get orgId(): string {
    return this.sale.orgId;
  }

  get warehouseId(): string {
    return this.sale.warehouseId;
  }
}
