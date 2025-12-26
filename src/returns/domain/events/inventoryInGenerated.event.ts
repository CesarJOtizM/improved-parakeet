import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class InventoryInGeneratedEvent extends DomainEvent {
  private readonly _returnId: string;
  private readonly _movementId: string;
  private readonly _orgId: string;
  private readonly _occurredOn: Date;

  constructor(returnId: string, movementId: string, orgId: string) {
    super();
    this._returnId = returnId;
    this._movementId = movementId;
    this._orgId = orgId;
    this._occurredOn = new Date();
  }

  get eventName(): string {
    return 'InventoryInGenerated';
  }

  get occurredOn(): Date {
    return this._occurredOn;
  }

  get returnId(): string {
    return this._returnId;
  }

  get movementId(): string {
    return this._movementId;
  }

  get orgId(): string {
    return this._orgId;
  }
}
