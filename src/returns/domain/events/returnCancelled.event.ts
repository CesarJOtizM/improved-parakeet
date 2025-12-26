import { Return } from '@returns/domain/entities/return.entity';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class ReturnCancelledEvent extends DomainEvent {
  private readonly _reason?: string;

  constructor(
    private readonly returnEntity: Return,
    reason?: string
  ) {
    super();
    this._reason = reason;
  }

  get eventName(): string {
    return 'ReturnCancelled';
  }

  get occurredOn(): Date {
    return this.returnEntity.cancelledAt || new Date();
  }

  get returnId(): string {
    return this.returnEntity.id;
  }

  get returnNumber(): string {
    return this.returnEntity.returnNumber.getValue();
  }

  get reason(): string | undefined {
    return this._reason;
  }

  get orgId(): string {
    return this.returnEntity.orgId;
  }
}
