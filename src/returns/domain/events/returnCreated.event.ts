import { Return } from '@returns/domain/entities/return.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class ReturnCreatedEvent extends DomainEvent {
  constructor(private readonly returnEntity: Return) {
    super();
  }

  get eventName(): string {
    return 'ReturnCreated';
  }

  get occurredOn(): Date {
    return this.returnEntity.createdAt;
  }

  get returnId(): string {
    return this.returnEntity.id;
  }

  get returnNumber(): string {
    return this.returnEntity.returnNumber.getValue();
  }

  get returnType(): string {
    return this.returnEntity.type.getValue();
  }

  get orgId(): string {
    return this.returnEntity.orgId;
  }

  get warehouseId(): string {
    return this.returnEntity.warehouseId;
  }

  get saleId(): string | undefined {
    return this.returnEntity.saleId;
  }

  get sourceMovementId(): string | undefined {
    return this.returnEntity.sourceMovementId;
  }
}
