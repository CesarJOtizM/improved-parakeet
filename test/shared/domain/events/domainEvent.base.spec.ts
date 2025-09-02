// Domain Event Base Tests - Clase base para domain events
// Tests unitarios para la clase base de domain events siguiendo AAA y Given-When-Then

import { DomainEvent } from '@shared/domain/events/domainEvent.base';

// Clase de prueba para DomainEvent
class TestDomainEvent extends DomainEvent {
  constructor(public readonly data: string) {
    super();
  }

  get eventName(): string {
    return 'TestDomainEvent';
  }

  get occurredOn(): Date {
    return new Date();
  }
}

// Clase de prueba para DomainEvent con fecha específica
class TestDomainEventWithDate extends DomainEvent {
  constructor(
    public readonly data: string,
    public readonly eventDate: Date
  ) {
    super();
  }

  get eventName(): string {
    return 'TestDomainEventWithDate';
  }

  get occurredOn(): Date {
    return this.eventDate;
  }
}

describe('Domain Event Base', () => {
  describe('DomainEvent', () => {
    it('Given: domain event When: creating instance Then: should start with isMarkedForDispatch as false', () => {
      // Arrange
      const eventData = 'test-data';

      // Act
      const event = new TestDomainEvent(eventData);

      // Assert
      expect(event.isMarkedForDispatch).toBe(false);
    });

    it('Given: domain event When: marking for dispatch Then: should set isMarkedForDispatch to true', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act
      event.markForDispatch();

      // Assert
      expect(event.isMarkedForDispatch).toBe(true);
    });

    it('Given: domain event When: marking for dispatch multiple times Then: should remain marked', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act
      event.markForDispatch();
      event.markForDispatch();

      // Assert
      expect(event.isMarkedForDispatch).toBe(true);
    });

    it('Given: domain event When: accessing eventName Then: should return correct event name', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('TestDomainEvent');
    });

    it('Given: domain event When: accessing occurredOn Then: should return date', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBeInstanceOf(Date);
    });

    it('Given: domain event with specific date When: accessing occurredOn Then: should return specified date', () => {
      // Arrange
      const specificDate = new Date('2024-01-01T00:00:00.000Z');
      const event = new TestDomainEventWithDate('test-data', specificDate);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBe(specificDate);
    });

    it('Given: domain event When: checking isMarkedForDispatch getter Then: should return correct value', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act & Assert
      expect(event.isMarkedForDispatch).toBe(false);

      event.markForDispatch();
      expect(event.isMarkedForDispatch).toBe(true);
    });

    it('Given: domain event When: checking markForDispatch method Then: should be callable', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act & Assert
      expect(() => event.markForDispatch()).not.toThrow();
    });

    it('Given: domain event When: checking eventName getter Then: should be abstract', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act & Assert
      expect(typeof event.eventName).toBe('string');
      expect(event.eventName).toBe('TestDomainEvent');
    });

    it('Given: domain event When: checking occurredOn getter Then: should be abstract', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act & Assert
      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it('Given: multiple domain events When: marking each for dispatch Then: should work independently', () => {
      // Arrange
      const event1 = new TestDomainEvent('data-1');
      const event2 = new TestDomainEvent('data-2');

      // Act
      event1.markForDispatch();

      // Assert
      expect(event1.isMarkedForDispatch).toBe(true);
      expect(event2.isMarkedForDispatch).toBe(false);
    });

    it('Given: domain event When: checking data property Then: should be accessible', () => {
      // Arrange
      const eventData = 'test-data';
      const event = new TestDomainEvent(eventData);

      // Act & Assert
      expect(event.data).toBe(eventData);
    });

    it('Given: domain event When: checking inheritance Then: should extend DomainEvent', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act & Assert
      expect(event).toBeInstanceOf(DomainEvent);
    });

    it('Given: domain event When: checking abstract methods Then: should be implemented', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act & Assert
      expect(typeof event.eventName).toBe('string');
      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it('Given: domain event When: checking markForDispatch Then: should be public method', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act & Assert
      expect(typeof event.markForDispatch).toBe('function');
      expect(() => event.markForDispatch()).not.toThrow();
    });

    it('Given: domain event When: checking isMarkedForDispatch Then: should be read-only property', () => {
      // Arrange
      const event = new TestDomainEvent('test-data');

      // Act & Assert
      expect(typeof event.isMarkedForDispatch).toBe('boolean');
      expect(() => {
        // @ts-expect-error - Testing readonly behavior
        (event as { isMarkedForDispatch: boolean }).isMarkedForDispatch = true;
      }).toThrow();
    });
  });
});
