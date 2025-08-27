import { Entity } from '@shared/domain/base/entity.base';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }

  public markEventsForDispatch(): void {
    this._domainEvents.forEach(event => event.markForDispatch());
  }
}
