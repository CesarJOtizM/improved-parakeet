import { Sale } from '@sale/domain/entities/sale.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class SaleCancelledEvent extends DomainEvent {
  private readonly _reason?: string;

  constructor(
    private readonly sale: Sale,
    reason?: string
  ) {
    super();
    this._reason = reason;
  }

  get eventName(): string {
    return 'SaleCancelled';
  }

  get occurredOn(): Date {
    return this.sale.cancelledAt || new Date();
  }

  get saleId(): string {
    return this.sale.id;
  }

  get saleNumber(): string {
    return this.sale.saleNumber.getValue();
  }

  get orgId(): string {
    return this.sale.orgId;
  }

  get reason(): string | undefined {
    return this._reason;
  }
}
