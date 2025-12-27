import { DomainEvent } from './domainEvent.base';

/**
 * Interface for domain event dispatcher
 * Follows the Hexagonal Architecture pattern for ports
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
