import { beforeEach, describe, expect, it } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnCancelledEvent } from '@returns/domain/events/returnCancelled.event';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';

describe('ReturnCancelledEvent', () => {
  const mockOrgId = 'org-123';
  const mockReturnId = 'return-123';
  const mockWarehouseId = 'warehouse-123';
  const mockSaleId = 'sale-123';
  const mockCancelledAt = new Date('2024-01-16T14:00:00Z');

  let mockReturn: Return;

  beforeEach(() => {
    const returnNumber = ReturnNumber.fromString('RETURN-2024-001');
    const status = ReturnStatus.create('CANCELLED');
    const type = ReturnType.create('RETURN_CUSTOMER');
    const reason = ReturnReason.create('Defective product');

    mockReturn = Return.reconstitute(
      {
        returnNumber,
        status,
        type,
        reason,
        warehouseId: mockWarehouseId,
        saleId: mockSaleId,
        cancelledAt: mockCancelledAt,
        createdBy: 'user-123',
      },
      mockReturnId,
      mockOrgId
    );
  });

  describe('constructor', () => {
    it('Given: a Return entity and reason When: creating ReturnCancelledEvent Then: should create event with correct properties', () => {
      // Arrange
      const cancellationReason = 'Customer changed their mind';

      // Act
      const event = new ReturnCancelledEvent(mockReturn, cancellationReason);

      // Assert
      expect(event).toBeDefined();
      expect(event.returnId).toBe(mockReturnId);
      expect(event.reason).toBe(cancellationReason);
    });

    it('Given: a Return entity without reason When: creating ReturnCancelledEvent Then: should create event with undefined reason', () => {
      // Arrange
      // No reason provided

      // Act
      const event = new ReturnCancelledEvent(mockReturn);

      // Assert
      expect(event).toBeDefined();
      expect(event.reason).toBeUndefined();
    });
  });

  describe('eventName', () => {
    it('Given: a ReturnCancelledEvent When: getting eventName Then: should return "ReturnCancelled"', () => {
      // Arrange
      const event = new ReturnCancelledEvent(mockReturn);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('ReturnCancelled');
    });
  });

  describe('occurredOn', () => {
    it('Given: a Return with cancelledAt date When: getting occurredOn Then: should return the cancelledAt date', () => {
      // Arrange
      const event = new ReturnCancelledEvent(mockReturn);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toEqual(mockCancelledAt);
    });

    it('Given: a Return without cancelledAt date When: getting occurredOn Then: should return current date', () => {
      // Arrange
      const returnWithoutCancelledAt = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-002'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Test reason'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-456',
        mockOrgId
      );
      const beforeEvent = new Date();
      const event = new ReturnCancelledEvent(returnWithoutCancelledAt);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn.getTime()).toBeGreaterThanOrEqual(beforeEvent.getTime());
      expect(occurredOn.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });
  });

  describe('returnId', () => {
    it('Given: a Return with specific id When: getting returnId Then: should return correct id', () => {
      // Arrange
      const event = new ReturnCancelledEvent(mockReturn);

      // Act
      const returnId = event.returnId;

      // Assert
      expect(returnId).toBe(mockReturnId);
    });
  });

  describe('returnNumber', () => {
    it('Given: a Return with specific number When: getting returnNumber Then: should return correct number', () => {
      // Arrange
      const event = new ReturnCancelledEvent(mockReturn);

      // Act
      const returnNumber = event.returnNumber;

      // Assert
      expect(returnNumber).toBe('RETURN-2024-001');
    });
  });

  describe('reason', () => {
    it('Given: event created with reason When: getting reason Then: should return the cancellation reason', () => {
      // Arrange
      const cancellationReason = 'Items were restocked by mistake';
      const event = new ReturnCancelledEvent(mockReturn, cancellationReason);

      // Act
      const reason = event.reason;

      // Assert
      expect(reason).toBe(cancellationReason);
    });

    it('Given: event created without reason When: getting reason Then: should return undefined', () => {
      // Arrange
      const event = new ReturnCancelledEvent(mockReturn);

      // Act
      const reason = event.reason;

      // Assert
      expect(reason).toBeUndefined();
    });
  });

  describe('orgId', () => {
    it('Given: a Return with specific orgId When: getting orgId Then: should return correct orgId', () => {
      // Arrange
      const event = new ReturnCancelledEvent(mockReturn);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(mockOrgId);
    });
  });
});
