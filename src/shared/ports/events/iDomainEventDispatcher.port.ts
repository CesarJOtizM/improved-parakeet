import { DomainEvent } from '@shared/domain/events/domainEvent.base';

/**
 * Domain event dispatcher port interface
 * Output port for dispatching domain events following Hexagonal Architecture
 */
export interface IDomainEventDispatcher {
  /**
   * Dispatch all domain events from an aggregate root
   * Only dispatches events that are marked for dispatch
   */
  dispatchEvents(events: DomainEvent[]): Promise<void>;

  /**
   * Mark events for dispatch and then dispatch them
   */
  markAndDispatch(events: DomainEvent[]): Promise<void>;
}
