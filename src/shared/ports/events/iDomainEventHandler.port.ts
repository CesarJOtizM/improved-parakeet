import { DomainEvent } from '@shared/domain/events/domainEvent.base';

/**
 * Domain event handler port interface
 * Input port for handling domain events following Hexagonal Architecture
 */
export interface IDomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void> | void;
}
