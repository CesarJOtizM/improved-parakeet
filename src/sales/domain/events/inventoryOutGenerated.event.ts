import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export class InventoryOutGeneratedEvent extends DomainEvent {
  private readonly _saleId: string;
  private readonly _movementId: string;
  private readonly _orgId: string;
  private readonly _occurredOnDate: Date;

  constructor(
    saleId: string,
    movementId: string,
    orgId: string,
    occurredOnDate: Date = new Date()
  ) {
    super();
    this._saleId = saleId;
    this._movementId = movementId;
    this._orgId = orgId;
    this._occurredOnDate = occurredOnDate;
  }

  get eventName(): string {
    return 'InventoryOutGenerated';
  }

  get occurredOn(): Date {
    return this._occurredOnDate;
  }

  get saleId(): string {
    return this._saleId;
  }

  get movementId(): string {
    return this._movementId;
  }

  get orgId(): string {
    return this._orgId;
  }
}
