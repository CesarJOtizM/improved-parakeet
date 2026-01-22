import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { ReturnValidationService } from '@returns/domain/services/returnValidation.service';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('ReturnValidationService', () => {
  const mockOrgId = 'org-123';
  const mockWarehouseId = 'warehouse-123';
  const mockSaleId = 'sale-123';
  const mockMovementId = 'movement-123';

  describe('validateReturnCanBeConfirmed', () => {
    it('Given: a DRAFT return with lines When: validating confirmation Then: should return valid result', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-001'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective product'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-123',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-123',
              locationId: 'location-123',
              quantity: Quantity.create(5, 2),
              originalSalePrice: SalePrice.create(100, 'USD'),
              currency: 'USD',
            },
            'line-123',
            mockOrgId
          ),
        ]
      );

      // Act
      const result = ReturnValidationService.validateReturnCanBeConfirmed(returnEntity);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: a CONFIRMED return When: validating confirmation Then: should return invalid result', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-002'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Wrong item'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'return-456',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-123',
              locationId: 'location-123',
              quantity: Quantity.create(2, 2),
              originalSalePrice: SalePrice.create(50, 'USD'),
              currency: 'USD',
            },
            'line-456',
            mockOrgId
          ),
        ]
      );

      // Act
      const result = ReturnValidationService.validateReturnCanBeConfirmed(returnEntity);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Return cannot be confirmed. Only DRAFT returns can be confirmed.'
      );
    });

    it('Given: a DRAFT return without lines When: validating confirmation Then: should return invalid result', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-003'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Changed mind'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-789',
        mockOrgId,
        []
      );

      // Act
      const result = ReturnValidationService.validateReturnCanBeConfirmed(returnEntity);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Return must have at least one line before confirming');
    });
  });

  describe('validateReturnCanBeCancelled', () => {
    it('Given: a DRAFT return When: validating cancellation Then: should return valid result', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-010'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Test'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-101',
        mockOrgId
      );

      // Act
      const result = ReturnValidationService.validateReturnCanBeCancelled(returnEntity);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: a CONFIRMED return When: validating cancellation Then: should return valid result', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-011'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Test'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'return-102',
        mockOrgId
      );

      // Act
      const result = ReturnValidationService.validateReturnCanBeCancelled(returnEntity);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: a CANCELLED return When: validating cancellation Then: should return invalid result', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-012'),
          status: ReturnStatus.create('CANCELLED'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Test'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          cancelledAt: new Date(),
          createdBy: 'user-123',
        },
        'return-103',
        mockOrgId
      );

      // Act
      const result = ReturnValidationService.validateReturnCanBeCancelled(returnEntity);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Return is already cancelled');
    });
  });

  describe('validateCustomerReturnQuantity', () => {
    let mockSaleRepository: jest.Mocked<ISaleRepository>;

    beforeEach(() => {
      mockSaleRepository = {
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findAll: jest.fn(),
        findBySpecification: jest.fn(),
        exists: jest.fn(),
        findBySaleNumber: jest.fn(),
        getLastSaleNumberForYear: jest.fn(),
      } as unknown as jest.Mocked<ISaleRepository>;
    });

    it('Given: a supplier return When: validating customer quantity Then: should return valid result without checking', async () => {
      // Arrange
      const supplierReturn = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-020'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          createdBy: 'user-123',
        },
        'return-201',
        mockOrgId
      );

      // Act
      const result = await ReturnValidationService.validateCustomerReturnQuantity(
        supplierReturn,
        mockSaleRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockSaleRepository.findById).not.toHaveBeenCalled();
    });

    it('Given: a customer return without sale ID When: validating customer quantity Then: should return invalid result', async () => {
      // Arrange
      const returnWithoutSaleId = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-021'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: mockWarehouseId,
          createdBy: 'user-123',
        },
        'return-202',
        mockOrgId
      );

      // Act
      const result = await ReturnValidationService.validateCustomerReturnQuantity(
        returnWithoutSaleId,
        mockSaleRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sale ID is required for customer returns');
    });

    it('Given: a customer return with non-existent sale When: validating customer quantity Then: should return invalid result', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-022'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: mockWarehouseId,
          saleId: 'non-existent-sale',
          createdBy: 'user-123',
        },
        'return-203',
        mockOrgId
      );
      mockSaleRepository.findById.mockResolvedValue(null);

      // Act
      const result = await ReturnValidationService.validateCustomerReturnQuantity(
        returnEntity,
        mockSaleRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sale with ID non-existent-sale not found');
    });

    it('Given: a customer return with repository error When: validating customer quantity Then: should return error message', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-023'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-204',
        mockOrgId
      );
      mockSaleRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await ReturnValidationService.validateCustomerReturnQuantity(
        returnEntity,
        mockSaleRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Error validating customer return quantity');
      expect(result.errors[0]).toContain('Database connection failed');
    });
  });

  describe('validateSupplierReturnQuantity', () => {
    let mockMovementRepository: jest.Mocked<IMovementRepository>;

    beforeEach(() => {
      mockMovementRepository = {
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findAll: jest.fn(),
        findBySpecification: jest.fn(),
        exists: jest.fn(),
        findByReference: jest.fn(),
        getLastSequenceForYear: jest.fn(),
      } as unknown as jest.Mocked<IMovementRepository>;
    });

    it('Given: a customer return When: validating supplier quantity Then: should return valid result without checking', async () => {
      // Arrange
      const customerReturn = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-030'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-301',
        mockOrgId
      );

      // Act
      const result = await ReturnValidationService.validateSupplierReturnQuantity(
        customerReturn,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockMovementRepository.findById).not.toHaveBeenCalled();
    });

    it('Given: a supplier return without source movement ID When: validating supplier quantity Then: should return invalid result', async () => {
      // Arrange
      const returnWithoutMovementId = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-031'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          createdBy: 'user-123',
        },
        'return-302',
        mockOrgId
      );

      // Act
      const result = await ReturnValidationService.validateSupplierReturnQuantity(
        returnWithoutMovementId,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Source movement ID is required for supplier returns');
    });

    it('Given: a supplier return with non-existent movement When: validating supplier quantity Then: should return invalid result', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-032'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: 'non-existent-movement',
          createdBy: 'user-123',
        },
        'return-303',
        mockOrgId
      );
      mockMovementRepository.findById.mockResolvedValue(null);

      // Act
      const result = await ReturnValidationService.validateSupplierReturnQuantity(
        returnEntity,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Movement with ID non-existent-movement not found');
    });

    it('Given: a supplier return with repository error When: validating supplier quantity Then: should return error message', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-033'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          createdBy: 'user-123',
        },
        'return-304',
        mockOrgId
      );
      mockMovementRepository.findById.mockRejectedValue(new Error('Connection timeout'));

      // Act
      const result = await ReturnValidationService.validateSupplierReturnQuantity(
        returnEntity,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Error validating supplier return quantity');
      expect(result.errors[0]).toContain('Connection timeout');
    });
  });
});
