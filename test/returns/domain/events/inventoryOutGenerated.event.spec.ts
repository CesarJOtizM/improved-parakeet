import { describe, expect, it } from '@jest/globals';
import { InventoryOutGeneratedEvent } from '@returns/domain/events/inventoryOutGenerated.event';

describe('InventoryOutGeneratedEvent', () => {
  const mockReturnId = 'return-123';
  const mockMovementId = 'movement-456';
  const mockOrgId = 'org-789';

  describe('constructor', () => {
    it('Given: return id, movement id and org id When: creating InventoryOutGeneratedEvent Then: should create event with correct properties', () => {
      // Arrange
      const beforeCreation = new Date();

      // Act
      const event = new InventoryOutGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);
      const afterCreation = new Date();

      // Assert
      expect(event).toBeDefined();
      expect(event.returnId).toBe(mockReturnId);
      expect(event.movementId).toBe(mockMovementId);
      expect(event.orgId).toBe(mockOrgId);
      expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.occurredOn.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });

  describe('eventName', () => {
    it('Given: an InventoryOutGeneratedEvent When: getting eventName Then: should return "InventoryOutGenerated"', () => {
      // Arrange
      const event = new InventoryOutGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('InventoryOutGenerated');
    });
  });

  describe('occurredOn', () => {
    it('Given: a newly created event When: getting occurredOn Then: should return date close to creation time', () => {
      // Arrange
      const beforeCreation = new Date();

      // Act
      const event = new InventoryOutGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);
      const afterCreation = new Date();
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBeInstanceOf(Date);
      expect(occurredOn.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(occurredOn.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('Given: multiple calls to occurredOn When: getting occurredOn Then: should return same date', () => {
      // Arrange
      const event = new InventoryOutGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);

      // Act
      const firstCall = event.occurredOn;
      const secondCall = event.occurredOn;

      // Assert
      expect(firstCall).toEqual(secondCall);
    });
  });

  describe('returnId', () => {
    it('Given: event created with specific return id When: getting returnId Then: should return correct id', () => {
      // Arrange
      const specificReturnId = 'return-specific-out-123';
      const event = new InventoryOutGeneratedEvent(specificReturnId, mockMovementId, mockOrgId);

      // Act
      const returnId = event.returnId;

      // Assert
      expect(returnId).toBe(specificReturnId);
    });
  });

  describe('movementId', () => {
    it('Given: event created with specific movement id When: getting movementId Then: should return correct id', () => {
      // Arrange
      const specificMovementId = 'movement-specific-out-456';
      const event = new InventoryOutGeneratedEvent(mockReturnId, specificMovementId, mockOrgId);

      // Act
      const movementId = event.movementId;

      // Assert
      expect(movementId).toBe(specificMovementId);
    });
  });

  describe('orgId', () => {
    it('Given: event created with specific org id When: getting orgId Then: should return correct id', () => {
      // Arrange
      const specificOrgId = 'org-specific-out-789';
      const event = new InventoryOutGeneratedEvent(mockReturnId, mockMovementId, specificOrgId);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(specificOrgId);
    });
  });

  describe('event immutability', () => {
    it('Given: a created event When: checking all properties Then: should have consistent values', () => {
      // Arrange
      const event = new InventoryOutGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);

      // Act & Assert
      expect(event.returnId).toBe(mockReturnId);
      expect(event.movementId).toBe(mockMovementId);
      expect(event.orgId).toBe(mockOrgId);
      expect(event.eventName).toBe('InventoryOutGenerated');
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });

  describe('different from InventoryInGeneratedEvent', () => {
    it('Given: InventoryOutGeneratedEvent When: comparing eventName Then: should be different from InventoryInGenerated', () => {
      // Arrange
      const event = new InventoryOutGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('InventoryOutGenerated');
      expect(eventName).not.toBe('InventoryInGenerated');
    });
  });
});
