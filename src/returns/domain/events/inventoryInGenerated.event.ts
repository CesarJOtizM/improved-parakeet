import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class InventoryInGeneratedEvent extends DomainEvent {
  private readonly _occurredOn: Date;

  constructor(
    private readonly returnId: string,
    private readonly movementId: string,
    private readonly orgId: string
  ) {
    super();
    this._occurredOn = new Date();
  }

  get eventName(): string {
    return 'InventoryInGenerated';
  }

  get occurredOn(): Date {
    return this._occurredOn;
  }

  get returnId(): string {
    return this.returnId;
  }

  get movementId(): string {
    return this.movementId;
  }

  get orgId(): string {
    return this.orgId;
  }
}
