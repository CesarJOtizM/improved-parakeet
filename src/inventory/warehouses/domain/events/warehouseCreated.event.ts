import { DomainEvent } from '@shared/domain/events/domainEvent.base';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';

export class WarehouseCreatedEvent extends DomainEvent {
  constructor(private readonly warehouse: Warehouse) {
    super();
  }

  get eventName(): string {
    return 'WarehouseCreated';
  }

  get occurredOn(): Date {
    return this.warehouse.createdAt;
  }

  get warehouseId(): string {
    return this.warehouse.id;
  }

  get orgId(): string {
    return this.warehouse.orgId;
  }

  get code(): string {
    return this.warehouse.code.getValue();
  }

  get name(): string {
    return this.warehouse.name;
  }
}
