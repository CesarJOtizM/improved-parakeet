import { Return } from '@returns/domain/entities/return.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class ReturnConfirmedEvent extends DomainEvent {
  private readonly _returnMovementId?: string;

  constructor(
    private readonly returnEntity: Return,
    returnMovementId?: string
  ) {
    super();
    this._returnMovementId = returnMovementId;
  }

  get eventName(): string {
    return 'ReturnConfirmed';
  }

  get occurredOn(): Date {
    return this.returnEntity.confirmedAt || new Date();
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

  get returnMovementId(): string | undefined {
    return this._returnMovementId;
  }

  get orgId(): string {
    return this.returnEntity.orgId;
  }

  get warehouseId(): string {
    return this.returnEntity.warehouseId;
  }
}
