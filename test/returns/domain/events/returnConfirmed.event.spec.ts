import { beforeEach, describe, expect, it } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnConfirmedEvent } from '@returns/domain/events/returnConfirmed.event';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';

describe('ReturnConfirmedEvent', () => {
  const mockOrgId = 'org-123';
  const mockReturnId = 'return-123';
  const mockWarehouseId = 'warehouse-123';
  const mockSaleId = 'sale-123';
  const mockConfirmedAt = new Date('2024-01-16T15:00:00Z');
  const mockReturnMovementId = 'movement-789';

  let mockReturn: Return;

  beforeEach(() => {
    const returnNumber = ReturnNumber.fromString('RETURN-2024-001');
    const status = ReturnStatus.create('CONFIRMED');
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
        confirmedAt: mockConfirmedAt,
        returnMovementId: mockReturnMovementId,
        createdBy: 'user-123',
      },
      mockReturnId,
      mockOrgId
    );
  });

  describe('constructor', () => {
    it('Given: a Return entity and movement id When: creating ReturnConfirmedEvent Then: should create event with correct properties', () => {
      // Arrange
      const returnMovementId = 'movement-new-123';

      // Act
      const event = new ReturnConfirmedEvent(mockReturn, returnMovementId);

      // Assert
      expect(event).toBeDefined();
      expect(event.returnId).toBe(mockReturnId);
      expect(event.returnMovementId).toBe(returnMovementId);
    });

    it('Given: a Return entity without movement id When: creating ReturnConfirmedEvent Then: should create event with undefined movement id', () => {
      // Arrange
      // No movement id provided

      // Act
      const event = new ReturnConfirmedEvent(mockReturn);

      // Assert
      expect(event).toBeDefined();
      expect(event.returnMovementId).toBeUndefined();
    });
  });

  describe('eventName', () => {
    it('Given: a ReturnConfirmedEvent When: getting eventName Then: should return "ReturnConfirmed"', () => {
      // Arrange
      const event = new ReturnConfirmedEvent(mockReturn);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('ReturnConfirmed');
    });
  });

  describe('occurredOn', () => {
    it('Given: a Return with confirmedAt date When: getting occurredOn Then: should return the confirmedAt date', () => {
      // Arrange
      const event = new ReturnConfirmedEvent(mockReturn);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toEqual(mockConfirmedAt);
    });

    it('Given: a Return without confirmedAt date When: getting occurredOn Then: should return current date', () => {
      // Arrange
      const returnWithoutConfirmedAt = Return.reconstitute(
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
      const now = Date.now();
      const event = new ReturnConfirmedEvent(returnWithoutConfirmedAt);

      // Act
      const occurredOn = event.occurredOn;

      // Assert — allow 1s tolerance for CI environments under load
      expect(Math.abs(occurredOn.getTime() - now)).toBeLessThan(1000);
    });
  });

  describe('returnId', () => {
    it('Given: a Return with specific id When: getting returnId Then: should return correct id', () => {
      // Arrange
      const event = new ReturnConfirmedEvent(mockReturn);

      // Act
      const returnId = event.returnId;

      // Assert
      expect(returnId).toBe(mockReturnId);
    });
  });

  describe('returnNumber', () => {
    it('Given: a Return with specific number When: getting returnNumber Then: should return correct number', () => {
      // Arrange
      const event = new ReturnConfirmedEvent(mockReturn);

      // Act
      const returnNumber = event.returnNumber;

      // Assert
      expect(returnNumber).toBe('RETURN-2024-001');
    });
  });

  describe('returnType', () => {
    it('Given: a customer return When: getting returnType Then: should return RETURN_CUSTOMER', () => {
      // Arrange
      const event = new ReturnConfirmedEvent(mockReturn);

      // Act
      const returnType = event.returnType;

      // Assert
      expect(returnType).toBe('RETURN_CUSTOMER');
    });

    it('Given: a supplier return When: getting returnType Then: should return RETURN_SUPPLIER', () => {
      // Arrange
      const supplierReturn = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-003'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Wrong items'),
          warehouseId: mockWarehouseId,
          sourceMovementId: 'source-movement-123',
          confirmedAt: mockConfirmedAt,
          createdBy: 'user-123',
        },
        'return-789',
        mockOrgId
      );
      const event = new ReturnConfirmedEvent(supplierReturn);

      // Act
      const returnType = event.returnType;

      // Assert
      expect(returnType).toBe('RETURN_SUPPLIER');
    });
  });

  describe('returnMovementId', () => {
    it('Given: event created with movement id When: getting returnMovementId Then: should return the movement id', () => {
      // Arrange
      const movementId = 'movement-confirmed-123';
      const event = new ReturnConfirmedEvent(mockReturn, movementId);

      // Act
      const returnMovementId = event.returnMovementId;

      // Assert
      expect(returnMovementId).toBe(movementId);
    });

    it('Given: event created without movement id When: getting returnMovementId Then: should return undefined', () => {
      // Arrange
      const event = new ReturnConfirmedEvent(mockReturn);

      // Act
      const returnMovementId = event.returnMovementId;

      // Assert
      expect(returnMovementId).toBeUndefined();
    });
  });

  describe('orgId', () => {
    it('Given: a Return with specific orgId When: getting orgId Then: should return correct orgId', () => {
      // Arrange
      const event = new ReturnConfirmedEvent(mockReturn);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(mockOrgId);
    });
  });

  describe('warehouseId', () => {
    it('Given: a Return with specific warehouseId When: getting warehouseId Then: should return correct warehouseId', () => {
      // Arrange
      const event = new ReturnConfirmedEvent(mockReturn);

      // Act
      const warehouseId = event.warehouseId;

      // Assert
      expect(warehouseId).toBe(mockWarehouseId);
    });
  });
});
