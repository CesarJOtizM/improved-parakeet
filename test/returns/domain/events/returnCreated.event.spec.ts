import { beforeEach, describe, expect, it } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnCreatedEvent } from '@returns/domain/events/returnCreated.event';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';

describe('ReturnCreatedEvent', () => {
  const mockOrgId = 'org-123';
  const mockReturnId = 'return-123';
  const mockWarehouseId = 'warehouse-123';
  const mockSaleId = 'sale-123';
  const mockCreatedAt = new Date('2024-01-15T10:00:00Z');

  let mockReturn: Return;

  beforeEach(() => {
    const returnNumber = ReturnNumber.fromString('RETURN-2024-001');
    const status = ReturnStatus.create('DRAFT');
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
        createdBy: 'user-123',
      },
      mockReturnId,
      mockOrgId
    );

    // Mock createdAt
    Object.defineProperty(mockReturn, 'createdAt', {
      get: () => mockCreatedAt,
    });
  });

  describe('constructor', () => {
    it('Given: a Return entity When: creating ReturnCreatedEvent Then: should create event with correct properties', () => {
      // Arrange
      // Return is set up in beforeEach

      // Act
      const event = new ReturnCreatedEvent(mockReturn);

      // Assert
      expect(event).toBeDefined();
      expect(event.returnId).toBe(mockReturnId);
      expect(event.returnNumber).toBe('RETURN-2024-001');
      expect(event.orgId).toBe(mockOrgId);
    });
  });

  describe('eventName', () => {
    it('Given: a ReturnCreatedEvent When: getting eventName Then: should return "ReturnCreated"', () => {
      // Arrange
      const event = new ReturnCreatedEvent(mockReturn);

      // Act
      const eventName = event.eventName;

      // Assert
      expect(eventName).toBe('ReturnCreated');
    });
  });

  describe('occurredOn', () => {
    it('Given: a Return with createdAt date When: getting occurredOn Then: should return the return createdAt date', () => {
      // Arrange
      const event = new ReturnCreatedEvent(mockReturn);

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toEqual(mockCreatedAt);
    });
  });

  describe('returnId', () => {
    it('Given: a Return with specific id When: getting returnId Then: should return correct id', () => {
      // Arrange
      const event = new ReturnCreatedEvent(mockReturn);

      // Act
      const returnId = event.returnId;

      // Assert
      expect(returnId).toBe(mockReturnId);
    });
  });

  describe('returnNumber', () => {
    it('Given: a Return with specific number When: getting returnNumber Then: should return correct number', () => {
      // Arrange
      const event = new ReturnCreatedEvent(mockReturn);

      // Act
      const returnNumber = event.returnNumber;

      // Assert
      expect(returnNumber).toBe('RETURN-2024-001');
    });
  });

  describe('returnType', () => {
    it('Given: a customer return When: getting returnType Then: should return RETURN_CUSTOMER', () => {
      // Arrange
      const event = new ReturnCreatedEvent(mockReturn);

      // Act
      const returnType = event.returnType;

      // Assert
      expect(returnType).toBe('RETURN_CUSTOMER');
    });

    it('Given: a supplier return When: getting returnType Then: should return RETURN_SUPPLIER', () => {
      // Arrange
      const supplierReturn = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-002'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Wrong items received'),
          warehouseId: mockWarehouseId,
          sourceMovementId: 'movement-123',
          createdBy: 'user-123',
        },
        'return-456',
        mockOrgId
      );
      const event = new ReturnCreatedEvent(supplierReturn);

      // Act
      const returnType = event.returnType;

      // Assert
      expect(returnType).toBe('RETURN_SUPPLIER');
    });
  });

  describe('orgId', () => {
    it('Given: a Return with specific orgId When: getting orgId Then: should return correct orgId', () => {
      // Arrange
      const event = new ReturnCreatedEvent(mockReturn);

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe(mockOrgId);
    });
  });

  describe('warehouseId', () => {
    it('Given: a Return with specific warehouseId When: getting warehouseId Then: should return correct warehouseId', () => {
      // Arrange
      const event = new ReturnCreatedEvent(mockReturn);

      // Act
      const warehouseId = event.warehouseId;

      // Assert
      expect(warehouseId).toBe(mockWarehouseId);
    });
  });

  describe('saleId', () => {
    it('Given: a customer return with saleId When: getting saleId Then: should return correct saleId', () => {
      // Arrange
      const event = new ReturnCreatedEvent(mockReturn);

      // Act
      const saleId = event.saleId;

      // Assert
      expect(saleId).toBe(mockSaleId);
    });

    it('Given: a supplier return without saleId When: getting saleId Then: should return undefined', () => {
      // Arrange
      const supplierReturn = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-003'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Damaged goods'),
          warehouseId: mockWarehouseId,
          sourceMovementId: 'movement-123',
          createdBy: 'user-123',
        },
        'return-789',
        mockOrgId
      );
      const event = new ReturnCreatedEvent(supplierReturn);

      // Act
      const saleId = event.saleId;

      // Assert
      expect(saleId).toBeUndefined();
    });
  });

  describe('sourceMovementId', () => {
    it('Given: a supplier return with sourceMovementId When: getting sourceMovementId Then: should return correct id', () => {
      // Arrange
      const supplierReturn = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-004'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issues'),
          warehouseId: mockWarehouseId,
          sourceMovementId: 'movement-456',
          createdBy: 'user-123',
        },
        'return-999',
        mockOrgId
      );
      const event = new ReturnCreatedEvent(supplierReturn);

      // Act
      const sourceMovementId = event.sourceMovementId;

      // Assert
      expect(sourceMovementId).toBe('movement-456');
    });

    it('Given: a customer return without sourceMovementId When: getting sourceMovementId Then: should return undefined', () => {
      // Arrange
      const event = new ReturnCreatedEvent(mockReturn);

      // Act
      const sourceMovementId = event.sourceMovementId;

      // Assert
      expect(sourceMovementId).toBeUndefined();
    });
  });
});
