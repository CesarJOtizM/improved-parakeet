import { Sale } from '@sale/domain/entities/sale.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class SaleCompletedEvent extends DomainEvent {
  constructor(private readonly sale: Sale) {
    super();
  }

  get eventName(): string {
    return 'SaleCompleted';
  }

  get occurredOn(): Date {
    return this.sale.completedAt || new Date();
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

  get warehouseId(): string {
    return this.sale.warehouseId;
  }
}
