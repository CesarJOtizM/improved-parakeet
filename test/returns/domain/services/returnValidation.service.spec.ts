/* eslint-disable @typescript-eslint/no-explicit-any */
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

    it('Given: a DRAFT return with a line with non-positive quantity When: validating confirmation Then: should return invalid with per-product error', () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-004'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective product'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-004',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-good',
              locationId: 'location-123',
              quantity: Quantity.create(5, 2),
              originalSalePrice: SalePrice.create(100, 'USD'),
              currency: 'USD',
            },
            'line-good',
            mockOrgId
          ),
        ]
      );

      // Spy on getLines to return a mock line with non-positive quantity
      const mockLine = {
        productId: 'product-bad',
        quantity: {
          isPositive: () => false,
          getNumericValue: () => 0,
        },
      };
      jest.spyOn(returnEntity, 'getLines').mockReturnValue([mockLine] as unknown as ReturnLine[]);

      // Act
      const result = ReturnValidationService.validateReturnCanBeConfirmed(returnEntity);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Line with product product-bad must have positive quantity');
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

    it('Given: a customer return with quantities within sold amounts When: validating customer quantity Then: should return valid result', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-024'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-205',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-A',
              locationId: 'location-123',
              quantity: Quantity.create(2, 2),
              originalSalePrice: SalePrice.create(50, 'USD'),
              currency: 'USD',
            },
            'rline-A',
            mockOrgId
          ),
        ]
      );

      // Mock sale with lines that have enough quantity
      const mockSale = {
        getLines: jest.fn().mockReturnValue([
          {
            productId: 'product-A',
            quantity: { getNumericValue: () => 10 },
          },
        ]),
      };
      mockSaleRepository.findById.mockResolvedValue(mockSale as any);

      // Act
      const result = await ReturnValidationService.validateCustomerReturnQuantity(
        returnEntity,
        mockSaleRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockSaleRepository.findById).toHaveBeenCalledWith(mockSaleId, mockOrgId);
    });

    it('Given: a customer return with product not in sale lines When: validating customer quantity Then: should return invalid result', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-025'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Wrong item'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-206',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-NOT-SOLD',
              locationId: 'location-123',
              quantity: Quantity.create(1, 2),
              originalSalePrice: SalePrice.create(25, 'USD'),
              currency: 'USD',
            },
            'rline-NS',
            mockOrgId
          ),
        ]
      );

      // Mock sale with different products
      const mockSale = {
        getLines: jest.fn().mockReturnValue([
          {
            productId: 'product-OTHER',
            quantity: { getNumericValue: () => 5 },
          },
        ]),
      };
      mockSaleRepository.findById.mockResolvedValue(mockSale as any);

      // Act
      const result = await ReturnValidationService.validateCustomerReturnQuantity(
        returnEntity,
        mockSaleRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Product product-NOT-SOLD was not sold in sale ${mockSaleId}`
      );
    });

    it('Given: a customer return with quantity exceeding sold quantity When: validating customer quantity Then: should return invalid result', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-026'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-207',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-B',
              locationId: 'location-123',
              quantity: Quantity.create(15, 2),
              originalSalePrice: SalePrice.create(30, 'USD'),
              currency: 'USD',
            },
            'rline-B',
            mockOrgId
          ),
        ]
      );

      // Mock sale where only 10 units were sold
      const mockSale = {
        getLines: jest.fn().mockReturnValue([
          {
            productId: 'product-B',
            quantity: { getNumericValue: () => 10 },
          },
        ]),
      };
      mockSaleRepository.findById.mockResolvedValue(mockSale as any);

      // Act
      const result = await ReturnValidationService.validateCustomerReturnQuantity(
        returnEntity,
        mockSaleRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Cannot return 15 units of product product-B. Only 10 units were sold.'
      );
    });

    it('Given: a customer return with non-Error thrown in catch block When: validating customer quantity Then: should return Unknown error message', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-027'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: mockWarehouseId,
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        'return-208',
        mockOrgId
      );
      mockSaleRepository.findById.mockRejectedValue('string error thrown');

      // Act
      const result = await ReturnValidationService.validateCustomerReturnQuantity(
        returnEntity,
        mockSaleRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Error validating customer return quantity');
      expect(result.errors[0]).toContain('Unknown error');
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

    it('Given: a supplier return with source movement type not IN When: validating supplier quantity Then: should return invalid result', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-034'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          createdBy: 'user-123',
        },
        'return-305',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-S1',
              locationId: 'location-123',
              quantity: Quantity.create(3, 2),
              originalUnitCost: undefined,
              currency: 'USD',
            },
            'rline-S1',
            mockOrgId
          ),
        ]
      );

      // Mock movement with OUT type instead of IN
      const mockMovement = {
        type: { getValue: () => 'OUT' },
        reason: 'PURCHASE',
        getLines: jest.fn().mockReturnValue([
          {
            productId: 'product-S1',
            quantity: { getNumericValue: () => 10 },
          },
        ]),
      };
      mockMovementRepository.findById.mockResolvedValue(mockMovement as any);

      // Act
      const result = await ReturnValidationService.validateSupplierReturnQuantity(
        returnEntity,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Source movement must be an IN movement for supplier returns'
      );
    });

    it('Given: a supplier return with source movement reason not PURCHASE When: validating supplier quantity Then: should return invalid result', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-035'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          createdBy: 'user-123',
        },
        'return-306',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-S2',
              locationId: 'location-123',
              quantity: Quantity.create(2, 2),
              originalUnitCost: undefined,
              currency: 'USD',
            },
            'rline-S2',
            mockOrgId
          ),
        ]
      );

      // Mock movement with IN type but wrong reason
      const mockMovement = {
        type: { getValue: () => 'IN' },
        reason: 'ADJUSTMENT',
        getLines: jest.fn().mockReturnValue([
          {
            productId: 'product-S2',
            quantity: { getNumericValue: () => 10 },
          },
        ]),
      };
      mockMovementRepository.findById.mockResolvedValue(mockMovement as any);

      // Act
      const result = await ReturnValidationService.validateSupplierReturnQuantity(
        returnEntity,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Source movement must have reason PURCHASE for supplier returns'
      );
    });

    it('Given: a supplier return with product not in movement lines When: validating supplier quantity Then: should return invalid result', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-036'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          createdBy: 'user-123',
        },
        'return-307',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-NOT-PURCHASED',
              locationId: 'location-123',
              quantity: Quantity.create(1, 2),
              originalUnitCost: undefined,
              currency: 'USD',
            },
            'rline-NP',
            mockOrgId
          ),
        ]
      );

      // Mock movement with different products
      const mockMovement = {
        type: { getValue: () => 'IN' },
        reason: 'PURCHASE',
        getLines: jest.fn().mockReturnValue([
          {
            productId: 'product-OTHER',
            quantity: { getNumericValue: () => 5 },
          },
        ]),
      };
      mockMovementRepository.findById.mockResolvedValue(mockMovement as any);

      // Act
      const result = await ReturnValidationService.validateSupplierReturnQuantity(
        returnEntity,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Product product-NOT-PURCHASED was not purchased in movement ${mockMovementId}`
      );
    });

    it('Given: a supplier return with quantity exceeding purchased quantity When: validating supplier quantity Then: should return invalid result', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-037'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          createdBy: 'user-123',
        },
        'return-308',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-S3',
              locationId: 'location-123',
              quantity: Quantity.create(20, 2),
              originalUnitCost: undefined,
              currency: 'USD',
            },
            'rline-S3',
            mockOrgId
          ),
        ]
      );

      // Mock movement where only 10 units were purchased
      const mockMovement = {
        type: { getValue: () => 'IN' },
        reason: 'PURCHASE',
        getLines: jest.fn().mockReturnValue([
          {
            productId: 'product-S3',
            quantity: { getNumericValue: () => 10 },
          },
        ]),
      };
      mockMovementRepository.findById.mockResolvedValue(mockMovement as any);

      // Act
      const result = await ReturnValidationService.validateSupplierReturnQuantity(
        returnEntity,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Cannot return 20 units of product product-S3. Only 10 units were purchased.'
      );
    });

    it('Given: a supplier return with quantities within purchased amounts When: validating supplier quantity Then: should return valid result', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-038'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          createdBy: 'user-123',
        },
        'return-309',
        mockOrgId,
        [
          ReturnLine.reconstitute(
            {
              productId: 'product-S4',
              locationId: 'location-123',
              quantity: Quantity.create(3, 2),
              originalUnitCost: undefined,
              currency: 'USD',
            },
            'rline-S4',
            mockOrgId
          ),
        ]
      );

      // Mock movement with enough purchased quantity
      const mockMovement = {
        type: { getValue: () => 'IN' },
        reason: 'PURCHASE',
        getLines: jest.fn().mockReturnValue([
          {
            productId: 'product-S4',
            quantity: { getNumericValue: () => 10 },
          },
        ]),
      };
      mockMovementRepository.findById.mockResolvedValue(mockMovement as any);

      // Act
      const result = await ReturnValidationService.validateSupplierReturnQuantity(
        returnEntity,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockMovementRepository.findById).toHaveBeenCalledWith(mockMovementId, mockOrgId);
    });

    it('Given: a supplier return with non-Error thrown in catch block When: validating supplier quantity Then: should return Unknown error message', async () => {
      // Arrange
      const returnEntity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2024-039'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Quality issue'),
          warehouseId: mockWarehouseId,
          sourceMovementId: mockMovementId,
          createdBy: 'user-123',
        },
        'return-310',
        mockOrgId
      );
      mockMovementRepository.findById.mockRejectedValue(42);

      // Act
      const result = await ReturnValidationService.validateSupplierReturnQuantity(
        returnEntity,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Error validating supplier return quantity');
      expect(result.errors[0]).toContain('Unknown error');
    });
  });
});
