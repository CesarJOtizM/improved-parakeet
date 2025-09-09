import { Product } from '@product/domain/entities/product.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class ProductUpdatedEvent extends DomainEvent {
  constructor(private readonly product: Product) {
    super();
  }

  get eventName(): string {
    return 'ProductUpdated';
  }

  get occurredOn(): Date {
    return this.product.updatedAt;
  }

  get productId(): string {
    return this.product.id;
  }

  get orgId(): string {
    return this.product.orgId;
  }

  get sku(): string {
    return this.product.sku;
  }

  get name(): string {
    return this.product.name;
  }
}
