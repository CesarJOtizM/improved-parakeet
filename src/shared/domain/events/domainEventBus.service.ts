import { Injectable, Logger } from '@nestjs/common';

import { DomainEvent } from './domainEvent.base';

import type { IDomainEventHandler } from '@shared/ports/events';
export type { IDomainEventHandler } from '@shared/ports/events';

@Injectable()
export class DomainEventBus {
  private readonly logger = new Logger(DomainEventBus.name);
  private readonly handlers = new Map<string, IDomainEventHandler<DomainEvent>[]>();

  /**
   * Register an event handler for a specific event type
   */
  public registerHandler<T extends DomainEvent>(
    eventType: string,
    handler: IDomainEventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as IDomainEventHandler<DomainEvent>);
    this.logger.debug(`Registered handler for event: ${eventType}`);
  }

  /**
   * Publish a domain event to all registered handlers
   */
  public async publish(event: DomainEvent): Promise<void> {
    const eventType = event.eventName;
    const handlers = this.handlers.get(eventType) || [];

    if (handlers.length === 0) {
      this.logger.debug(`No handlers registered for event: ${eventType}`);
      return;
    }

    this.logger.log(`Publishing event: ${eventType}`, {
      eventType,
      handlerCount: handlers.length,
    });

    // Execute all handlers in parallel
    const handlerPromises = handlers.map(handler => {
      return Promise.resolve(handler.handle(event)).catch(error => {
        this.logger.error(`Error in handler for event ${eventType}:`, error);
        // Don't throw - we don't want handler errors to break event publishing
      });
    });

    await Promise.all(handlerPromises);
  }

  /**
   * Publish multiple events
   */
  public async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map(event => this.publish(event)));
  }

  /**
   * Get all registered handlers for an event type
   */
  public getHandlers(eventType: string): IDomainEventHandler<DomainEvent>[] {
    return this.handlers.get(eventType) || [];
  }
}
