import { DomainEvent } from '@shared/domain/events/domainEvent.base';
import { Location } from '@warehouse/domain/entities/location.entity';

export class LocationAddedEvent extends DomainEvent {
  constructor(private readonly location: Location) {
    super();
  }

  get eventName(): string {
    return 'LocationAdded';
  }

  get occurredOn(): Date {
    return this.location.createdAt;
  }

  get locationId(): string {
    return this.location.id;
  }

  get orgId(): string {
    return this.location.orgId;
  }

  get warehouseId(): string {
    return this.location.warehouseId;
  }

  get code(): string {
    return this.location.code.getValue();
  }

  get name(): string {
    return this.location.name;
  }
}
