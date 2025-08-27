import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { Product } from '../entities/product.entity';

export class ProductCreatedEvent extends DomainEvent {
  constructor(private readonly product: Product) {
    super();
  }

  get eventName(): string {
    return 'ProductCreated';
  }

  get occurredOn(): Date {
    return this.product.createdAt;
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
