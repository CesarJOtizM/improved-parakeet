import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';

class TestEvent extends DomainEvent {
  private readonly _occurredOn = new Date();

  constructor(public readonly data: string) {
    super();
  }

  get eventName(): string {
    return 'TestEvent';
  }

  get occurredOn(): Date {
    return this._occurredOn;
  }
}

describe('DomainEventDispatcher', () => {
  let dispatcher: DomainEventDispatcher;
  let mockEventBus: any;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      publishAll: jest.fn().mockResolvedValue(undefined),
    };
    dispatcher = new DomainEventDispatcher(mockEventBus);
  });

  describe('dispatchEvents', () => {
    it('Given: empty events array When: dispatching Then: should not call event bus', async () => {
      // Act
      await dispatcher.dispatchEvents([]);

      // Assert
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it('Given: events not marked for dispatch When: dispatching Then: should not publish', async () => {
      // Arrange
      const event = new TestEvent('test data');
      // Event is not marked for dispatch by default

      // Act
      await dispatcher.dispatchEvents([event]);

      // Assert
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it('Given: events marked for dispatch When: dispatching Then: should publish all', async () => {
      // Arrange
      const event1 = new TestEvent('test data 1');
      const event2 = new TestEvent('test data 2');
      event1.markForDispatch();
      event2.markForDispatch();

      // Act
      await dispatcher.dispatchEvents([event1, event2]);

      // Assert
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([event1, event2]);
    });

    it('Given: mixed events When: dispatching Then: should only publish marked events', async () => {
      // Arrange
      const markedEvent = new TestEvent('marked');
      const unmarkedEvent = new TestEvent('unmarked');
      markedEvent.markForDispatch();

      // Act
      await dispatcher.dispatchEvents([markedEvent, unmarkedEvent]);

      // Assert
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([markedEvent]);
    });
  });

  describe('markAndDispatch', () => {
    it('Given: empty events array When: marking and dispatching Then: should not do anything', async () => {
      // Act
      await dispatcher.markAndDispatch([]);

      // Assert
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it('Given: unmarked events When: marking and dispatching Then: should mark and publish', async () => {
      // Arrange
      const event1 = new TestEvent('test data 1');
      const event2 = new TestEvent('test data 2');
      expect(event1.isMarkedForDispatch).toBe(false);
      expect(event2.isMarkedForDispatch).toBe(false);

      // Act
      await dispatcher.markAndDispatch([event1, event2]);

      // Assert
      expect(event1.isMarkedForDispatch).toBe(true);
      expect(event2.isMarkedForDispatch).toBe(true);
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([event1, event2]);
    });
  });
});
