import { describe, expect, it } from '@jest/globals';
import { InventoryInGeneratedEvent } from '@returns/domain/events/inventoryInGenerated.event';

describe('InventoryInGeneratedEvent', () => {
  const mockReturnId = 'return-123';
  const mockMovementId = 'movement-456';
  const mockOrgId = 'org-789';

  describe('constructor', () => {
    it('Given: return id, movement id and org id When: creating InventoryInGeneratedEvent Then: should create event with correct properties', () => {
      // Arrange
      const now = Date.now();

      // Act
      const event = new InventoryInGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);

      // Assert
      expect(event).toBeDefined();
      expect(event.returnId).toBe(mockReturnId);
      expect(event.movementId).toBe(mockMovementId);
      expect(event.orgId).toBe(mockOrgId);
      // Allow 1s tolerance for CI environments under load
      expect(Math.abs(event.occurredOn.getTime() - now)).toBeLessThan(1000);
    });
  });

  describe('eventName', () => {
    it('Given: an InventoryInGeneratedEvent When: getting eventName Then: should return "InventoryInGenerated"', () => {
      // Arrange
      const event = new InventoryInGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('InventoryInGenerated');
    });
  });

  describe('occurredOn', () => {
    it('Given: a newly created event When: getting occurredOn Then: should return date close to creation time', () => {
      // Arrange
      const now = Date.now();

      // Act
      const event = new InventoryInGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toBeInstanceOf(Date);
      // Allow 1s tolerance for CI environments under load
      expect(Math.abs(occurredOn.getTime() - now)).toBeLessThan(1000);
    });

    it('Given: multiple calls to occurredOn When: getting occurredOn Then: should return same date', () => {
      // Arrange
      const event = new InventoryInGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);

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
      const specificReturnId = 'return-specific-123';
      const event = new InventoryInGeneratedEvent(specificReturnId, mockMovementId, mockOrgId);

      // Act
      const returnId = event.returnId;

      // Assert
      expect(returnId).toBe(specificReturnId);
    });
  });

  describe('movementId', () => {
    it('Given: event created with specific movement id When: getting movementId Then: should return correct id', () => {
      // Arrange
      const specificMovementId = 'movement-specific-456';
      const event = new InventoryInGeneratedEvent(mockReturnId, specificMovementId, mockOrgId);

      // Act
      const movementId = event.movementId;

      // Assert
      expect(movementId).toBe(specificMovementId);
    });
  });

  describe('orgId', () => {
    it('Given: event created with specific org id When: getting orgId Then: should return correct id', () => {
      // Arrange
      const specificOrgId = 'org-specific-789';
      const event = new InventoryInGeneratedEvent(mockReturnId, mockMovementId, specificOrgId);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(specificOrgId);
    });
  });

  describe('event immutability', () => {
    it('Given: a created event When: checking all properties Then: should have consistent values', () => {
      // Arrange
      const event = new InventoryInGeneratedEvent(mockReturnId, mockMovementId, mockOrgId);

      // Act & Assert
      expect(event.returnId).toBe(mockReturnId);
      expect(event.movementId).toBe(mockMovementId);
      expect(event.orgId).toBe(mockOrgId);
      expect(event.eventName).toBe('InventoryInGenerated');
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });
});
