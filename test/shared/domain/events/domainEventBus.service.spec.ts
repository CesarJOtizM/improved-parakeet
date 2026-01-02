import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';
import { DomainEventBus } from '@shared/domain/events/domainEventBus.service';

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

class AnotherEvent extends DomainEvent {
  private readonly _occurredOn = new Date();

  constructor(public readonly value: number) {
    super();
  }

  get eventName(): string {
    return 'AnotherEvent';
  }

  get occurredOn(): Date {
    return this._occurredOn;
  }
}

describe('DomainEventBus', () => {
  let eventBus: DomainEventBus;

  beforeEach(() => {
    eventBus = new DomainEventBus();
  });

  describe('registerHandler', () => {
    it('Given: handler When: registering Then: should add handler to bus', () => {
      // Arrange
      const handler = { handle: jest.fn() };

      // Act
      eventBus.registerHandler('TestEvent', handler);

      // Assert
      const handlers = eventBus.getHandlers('TestEvent');
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBe(handler);
    });

    it('Given: multiple handlers When: registering for same event Then: should add all handlers', () => {
      // Arrange
      const handler1 = { handle: jest.fn() };
      const handler2 = { handle: jest.fn() };

      // Act
      eventBus.registerHandler('TestEvent', handler1);
      eventBus.registerHandler('TestEvent', handler2);

      // Assert
      const handlers = eventBus.getHandlers('TestEvent');
      expect(handlers).toHaveLength(2);
    });
  });

  describe('publish', () => {
    it('Given: no handlers When: publishing event Then: should not throw', async () => {
      // Arrange
      const event = new TestEvent('test data');

      // Act & Assert
      await expect(eventBus.publish(event)).resolves.toBeUndefined();
    });

    it('Given: handler registered When: publishing event Then: should call handler', async () => {
      // Arrange
      const handler = { handle: jest.fn().mockResolvedValue(undefined) };
      eventBus.registerHandler('TestEvent', handler);
      const event = new TestEvent('test data');

      // Act
      await eventBus.publish(event);

      // Assert
      expect(handler.handle).toHaveBeenCalledWith(event);
    });

    it('Given: multiple handlers When: publishing event Then: should call all handlers', async () => {
      // Arrange
      const handler1 = { handle: jest.fn().mockResolvedValue(undefined) };
      const handler2 = { handle: jest.fn().mockResolvedValue(undefined) };
      eventBus.registerHandler('TestEvent', handler1);
      eventBus.registerHandler('TestEvent', handler2);
      const event = new TestEvent('test data');

      // Act
      await eventBus.publish(event);

      // Assert
      expect(handler1.handle).toHaveBeenCalledWith(event);
      expect(handler2.handle).toHaveBeenCalledWith(event);
    });

    it('Given: handler throws When: publishing event Then: should not throw but log error', async () => {
      // Arrange
      const failingHandler = { handle: jest.fn().mockRejectedValue(new Error('Handler failed')) };
      const successHandler = { handle: jest.fn().mockResolvedValue(undefined) };
      eventBus.registerHandler('TestEvent', failingHandler);
      eventBus.registerHandler('TestEvent', successHandler);
      const event = new TestEvent('test data');

      // Act & Assert
      await expect(eventBus.publish(event)).resolves.toBeUndefined();
      expect(successHandler.handle).toHaveBeenCalledWith(event);
    });
  });

  describe('publishAll', () => {
    it('Given: multiple events When: publishing all Then: should publish each event', async () => {
      // Arrange
      const testHandler = { handle: jest.fn().mockResolvedValue(undefined) };
      const anotherHandler = { handle: jest.fn().mockResolvedValue(undefined) };
      eventBus.registerHandler('TestEvent', testHandler);
      eventBus.registerHandler('AnotherEvent', anotherHandler);

      const event1 = new TestEvent('test data');
      const event2 = new AnotherEvent(42);

      // Act
      await eventBus.publishAll([event1, event2]);

      // Assert
      expect(testHandler.handle).toHaveBeenCalledWith(event1);
      expect(anotherHandler.handle).toHaveBeenCalledWith(event2);
    });

    it('Given: empty events array When: publishing all Then: should not throw', async () => {
      // Act & Assert
      await expect(eventBus.publishAll([])).resolves.toBeUndefined();
    });
  });

  describe('getHandlers', () => {
    it('Given: no handlers registered When: getting handlers Then: should return empty array', () => {
      // Act
      const handlers = eventBus.getHandlers('NonExistentEvent');

      // Assert
      expect(handlers).toEqual([]);
    });

    it('Given: handlers registered When: getting handlers Then: should return all handlers', () => {
      // Arrange
      const handler1 = { handle: jest.fn() };
      const handler2 = { handle: jest.fn() };
      eventBus.registerHandler('TestEvent', handler1);
      eventBus.registerHandler('TestEvent', handler2);

      // Act
      const handlers = eventBus.getHandlers('TestEvent');

      // Assert
      expect(handlers).toHaveLength(2);
      expect(handlers).toContain(handler1);
      expect(handlers).toContain(handler2);
    });
  });
});
