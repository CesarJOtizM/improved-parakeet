// Domain Event Dispatcher Service Tests
// Unit tests for DomainEventDispatcher following AAA and Given-When-Then patterns

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';
import { DomainEventBus } from '@shared/domain/events/domainEventBus.service';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';

// Mock domain event for testing
class TestDomainEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly data: unknown
  ) {
    super();
  }

  get eventName(): string {
    return 'TestDomainEvent';
  }

  get occurredOn(): Date {
    return new Date();
  }
}

describe('DomainEventDispatcher', () => {
  let dispatcher: DomainEventDispatcher;
  let mockEventBus: jest.Mocked<DomainEventBus>;
  let mockLogger: { debug: jest.Mock; log: jest.Mock };

  beforeEach(() => {
    mockEventBus = {
      publishAll: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      registerHandler: jest.fn(),
      getHandlers: jest.fn().mockReturnValue([]),
    } as jest.Mocked<DomainEventBus>;

    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
    };

    dispatcher = new DomainEventDispatcher(mockEventBus);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dispatcher as any).logger = mockLogger;
  });

  describe('dispatchEvents', () => {
    it('Given: empty events array When: dispatching events Then: should return early without calling event bus', async () => {
      // Arrange
      const events: DomainEvent[] = [];

      // Act
      await dispatcher.dispatchEvents(events);

      // Assert
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
      // Empty array returns early before logging
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('Given: events not marked for dispatch When: dispatching events Then: should not publish events', async () => {
      // Arrange
      const event1 = new TestDomainEvent('agg-1', { data: 'test1' });
      const event2 = new TestDomainEvent('agg-2', { data: 'test2' });
      const events = [event1, event2];

      // Act
      await dispatcher.dispatchEvents(events);

      // Assert
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('No events marked for dispatch');
    });

    it('Given: events marked for dispatch When: dispatching events Then: should publish all marked events', async () => {
      // Arrange
      const event1 = new TestDomainEvent('agg-1', { data: 'test1' });
      const event2 = new TestDomainEvent('agg-2', { data: 'test2' });
      event1.markForDispatch();
      event2.markForDispatch();
      const events = [event1, event2];

      // Act
      await dispatcher.dispatchEvents(events);

      // Assert
      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([event1, event2]);
      expect(mockLogger.log).toHaveBeenCalledWith('Dispatched 2 domain event(s)');
    });

    it('Given: mix of marked and unmarked events When: dispatching events Then: should only publish marked events', async () => {
      // Arrange
      const event1 = new TestDomainEvent('agg-1', { data: 'test1' });
      const event2 = new TestDomainEvent('agg-2', { data: 'test2' });
      const event3 = new TestDomainEvent('agg-3', { data: 'test3' });
      event1.markForDispatch();
      event3.markForDispatch();
      const events = [event1, event2, event3];

      // Act
      await dispatcher.dispatchEvents(events);

      // Assert
      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([event1, event3]);
      expect(mockLogger.log).toHaveBeenCalledWith('Dispatched 2 domain event(s)');
    });

    it('Given: single marked event When: dispatching events Then: should publish event', async () => {
      // Arrange
      const event = new TestDomainEvent('agg-1', { data: 'test' });
      event.markForDispatch();
      const events = [event];

      // Act
      await dispatcher.dispatchEvents(events);

      // Assert
      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([event]);
      expect(mockLogger.log).toHaveBeenCalledWith('Dispatched 1 domain event(s)');
    });

    it('Given: multiple events When: dispatching events Then: should log correct count', async () => {
      // Arrange
      const events = [
        new TestDomainEvent('agg-1', { data: 'test1' }),
        new TestDomainEvent('agg-2', { data: 'test2' }),
        new TestDomainEvent('agg-3', { data: 'test3' }),
      ];
      events.forEach(e => e.markForDispatch());

      // Act
      await dispatcher.dispatchEvents(events);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith('Dispatching 3 domain event(s)');
      expect(mockLogger.log).toHaveBeenCalledWith('Dispatched 3 domain event(s)');
    });
  });

  describe('markAndDispatch', () => {
    it('Given: empty events array When: marking and dispatching events Then: should return early', async () => {
      // Arrange
      const events: DomainEvent[] = [];

      // Act
      await dispatcher.markAndDispatch(events);

      // Assert
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it('Given: events array When: marking and dispatching events Then: should mark all events and dispatch them', async () => {
      // Arrange
      const event1 = new TestDomainEvent('agg-1', { data: 'test1' });
      const event2 = new TestDomainEvent('agg-2', { data: 'test2' });
      const events = [event1, event2];

      // Act
      await dispatcher.markAndDispatch(events);

      // Assert
      expect(event1.isMarkedForDispatch).toBe(true);
      expect(event2.isMarkedForDispatch).toBe(true);
      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([event1, event2]);
    });

    it('Given: single event When: marking and dispatching event Then: should mark and dispatch event', async () => {
      // Arrange
      const event = new TestDomainEvent('agg-1', { data: 'test' });
      const events = [event];

      // Act
      await dispatcher.markAndDispatch(events);

      // Assert
      expect(event.isMarkedForDispatch).toBe(true);
      expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([event]);
    });

    it('Given: events already marked When: marking and dispatching events Then: should still dispatch all events', async () => {
      // Arrange
      const event1 = new TestDomainEvent('agg-1', { data: 'test1' });
      const event2 = new TestDomainEvent('agg-2', { data: 'test2' });
      event1.markForDispatch();
      const events = [event1, event2];

      // Act
      await dispatcher.markAndDispatch(events);

      // Assert
      expect(event1.isMarkedForDispatch).toBe(true);
      expect(event2.isMarkedForDispatch).toBe(true);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([event1, event2]);
    });
  });

  describe('error handling', () => {
    it('Given: event bus throws error When: dispatching events Then: should propagate error', async () => {
      // Arrange
      const event = new TestDomainEvent('agg-1', { data: 'test' });
      event.markForDispatch();
      const events = [event];
      const error = new Error('Event bus error');
      mockEventBus.publishAll.mockRejectedValue(error);

      // Act & Assert
      await expect(dispatcher.dispatchEvents(events)).rejects.toThrow('Event bus error');
    });

    it('Given: event bus throws error When: marking and dispatching events Then: should propagate error', async () => {
      // Arrange
      const event = new TestDomainEvent('agg-1', { data: 'test' });
      const events = [event];
      const error = new Error('Event bus error');
      mockEventBus.publishAll.mockRejectedValue(error);

      // Act & Assert
      await expect(dispatcher.markAndDispatch(events)).rejects.toThrow('Event bus error');
    });
  });
});
