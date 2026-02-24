import { Sale } from '@sale/domain/entities/sale.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class SaleShippedEvent extends DomainEvent {
  constructor(private readonly sale: Sale) {
    super();
  }

  get eventName(): string {
    return 'SaleShipped';
  }

  get occurredOn(): Date {
    return this.sale.shippedAt || new Date();
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

  get trackingNumber(): string | undefined {
    return this.sale.trackingNumber;
  }

  get shippingCarrier(): string | undefined {
    return this.sale.shippingCarrier;
  }
}
