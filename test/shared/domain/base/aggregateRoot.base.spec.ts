// Aggregate Root Base Tests - Clase base para aggregate roots
// Tests unitarios para la clase base de aggregate roots siguiendo AAA y Given-When-Then

import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
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

// Clase de prueba para AggregateRoot
class TestAggregateRoot extends AggregateRoot<{ name: string; value: number }> {
  constructor(props: { name: string; value: number }, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  performAction(data: string): void {
    const event = new TestDomainEvent(data);
    this.addDomainEvent(event);
  }

  performMultipleActions(data1: string, data2: string): void {
    this.addDomainEvent(new TestDomainEvent(data1));
    this.addDomainEvent(new TestDomainEvent(data2));
  }
}

describe('Aggregate Root Base', () => {
  describe('AggregateRoot', () => {
    it('Given: aggregate root When: creating instance Then: should extend Entity', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };

      // Act
      const aggregate = new TestAggregateRoot(props);

      // Assert
      expect(aggregate.id).toBeDefined();
      expect(aggregate.orgId).toBeDefined();
      expect(aggregate.createdAt).toBeDefined();
      expect(aggregate.updatedAt).toBeDefined();
    });

    it('Given: aggregate root When: checking domain events Then: should start with empty events', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };

      // Act
      const aggregate = new TestAggregateRoot(props);

      // Assert
      expect(aggregate.domainEvents).toEqual([]);
    });

    it('Given: aggregate root When: adding domain event Then: should add event to collection', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);
      const eventData = 'test-event-data';

      // Act
      aggregate.performAction(eventData);

      // Assert
      expect(aggregate.domainEvents).toHaveLength(1);
      expect(aggregate.domainEvents[0]).toBeInstanceOf(TestDomainEvent);
      expect((aggregate.domainEvents[0] as TestDomainEvent).data).toBe(eventData);
    });

    it('Given: aggregate root When: adding multiple events Then: should add all events to collection', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);
      const eventData1 = 'event-data-1';
      const eventData2 = 'event-data-2';

      // Act
      aggregate.performMultipleActions(eventData1, eventData2);

      // Assert
      expect(aggregate.domainEvents).toHaveLength(2);
      expect(aggregate.domainEvents[0]).toBeInstanceOf(TestDomainEvent);
      expect(aggregate.domainEvents[1]).toBeInstanceOf(TestDomainEvent);
      expect((aggregate.domainEvents[0] as TestDomainEvent).data).toBe(eventData1);
      expect((aggregate.domainEvents[1] as TestDomainEvent).data).toBe(eventData2);
    });

    it('Given: aggregate root with events When: clearing events Then: should remove all events', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);
      aggregate.performAction('event-1');
      aggregate.performAction('event-2');

      // Act
      aggregate.clearEvents();

      // Assert
      expect(aggregate.domainEvents).toEqual([]);
    });

    it('Given: aggregate root with events When: marking events for dispatch Then: should mark all events', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);
      aggregate.performAction('event-1');
      aggregate.performAction('event-2');

      // Act
      aggregate.markEventsForDispatch();

      // Assert
      expect(aggregate.domainEvents[0].isMarkedForDispatch).toBe(true);
      expect(aggregate.domainEvents[1].isMarkedForDispatch).toBe(true);
    });

    it('Given: aggregate root When: accessing domain events Then: should return events array', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);
      aggregate.performAction('event-1');

      // Act
      const events = aggregate.domainEvents;

      // Assert
      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(1);
    });

    it('Given: aggregate root When: adding event Then: should not mark event for dispatch automatically', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);

      // Act
      aggregate.performAction('event-1');

      // Assert
      expect(aggregate.domainEvents[0].isMarkedForDispatch).toBe(false);
    });

    it('Given: aggregate root When: clearing empty events Then: should not throw error', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);

      // Act & Assert
      expect(() => aggregate.clearEvents()).not.toThrow();
      expect(aggregate.domainEvents).toEqual([]);
    });

    it('Given: aggregate root When: marking empty events Then: should not throw error', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);

      // Act & Assert
      expect(() => aggregate.markEventsForDispatch()).not.toThrow();
    });

    it('Given: aggregate root When: checking event types Then: should contain correct event instances', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);

      // Act
      aggregate.performAction('event-1');
      aggregate.performAction('event-2');

      // Assert
      aggregate.domainEvents.forEach(event => {
        expect(event).toBeInstanceOf(TestDomainEvent);
        expect(event).toBeInstanceOf(DomainEvent);
      });
    });

    it('Given: aggregate root When: adding events multiple times Then: should accumulate all events', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);

      // Act
      aggregate.performAction('event-1');
      aggregate.performAction('event-2');
      aggregate.performAction('event-3');

      // Assert
      expect(aggregate.domainEvents).toHaveLength(3);
      expect((aggregate.domainEvents[0] as TestDomainEvent).data).toBe('event-1');
      expect((aggregate.domainEvents[1] as TestDomainEvent).data).toBe('event-2');
      expect((aggregate.domainEvents[2] as TestDomainEvent).data).toBe('event-3');
    });

    it('Given: aggregate root When: clearing and adding new events Then: should work correctly', () => {
      // Arrange
      const props = { name: 'Test', value: 42 };
      const aggregate = new TestAggregateRoot(props);
      aggregate.performAction('old-event');

      // Act
      aggregate.clearEvents();
      aggregate.performAction('new-event');

      // Assert
      expect(aggregate.domainEvents).toHaveLength(1);
      expect((aggregate.domainEvents[0] as TestDomainEvent).data).toBe('new-event');
    });
  });
});
