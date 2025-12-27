import { Injectable, Logger } from '@nestjs/common';

import { DomainEvent } from './domainEvent.base';
import { DomainEventBus } from './domainEventBus.service';
import { IDomainEventDispatcher } from './domainEventDispatcher.interface';

@Injectable()
export class DomainEventDispatcher implements IDomainEventDispatcher {
  private readonly logger = new Logger(DomainEventDispatcher.name);

  constructor(private readonly eventBus: DomainEventBus) {}

  /**
   * Dispatch all domain events from an aggregate root
   */
  public async dispatchEvents(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    this.logger.debug(`Dispatching ${events.length} domain event(s)`);

    // Filter only events marked for dispatch
    const eventsToDispatch = events.filter(event => event.isMarkedForDispatch);

    if (eventsToDispatch.length === 0) {
      this.logger.debug('No events marked for dispatch');
      return;
    }

    // Publish all events
    await this.eventBus.publishAll(eventsToDispatch);

    this.logger.log(`Dispatched ${eventsToDispatch.length} domain event(s)`);
  }

  /**
   * Mark events for dispatch and then dispatch them
   */
  public async markAndDispatch(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    // Mark all events for dispatch
    events.forEach(event => event.markForDispatch());

    // Dispatch them
    await this.dispatchEvents(events);
  }
}
