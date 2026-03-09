import { CreateReturnUseCase } from '@application/returnUseCases/createReturnUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnNumberGenerationService } from '@returns/domain/services/returnNumberGeneration.service';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnMapper } from '@returns/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

describe('CreateReturnUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockReturnId = 'return-123';
  const mockWarehouseId = 'warehouse-123';
  const mockSaleId = 'sale-123';
  const mockUserId = 'user-123';

  let useCase: CreateReturnUseCase;
  let mockReturnRepository: jest.Mocked<IReturnRepository>;
  let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReturnRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByReturnNumber: jest.fn(),
      findByStatus: jest.fn(),
      findByType: jest.fn(),
      findBySaleId: jest.fn(),
      findBySourceMovementId: jest.fn(),
      findByDateRange: jest.fn(),
      getLastReturnNumberForYear: jest.fn(),
      findByReturnMovementId: jest.fn(),
    } as jest.Mocked<IReturnRepository>;

    mockWarehouseRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByCode: jest.fn(),
      existsByCode: jest.fn(),
      findActive: jest.fn(),
    } as jest.Mocked<IWarehouseRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new CreateReturnUseCase(
      mockReturnRepository,
      mockWarehouseRepository,
      mockEventDispatcher
    );
  });

  describe('execute', () => {
    const createMockWarehouse = () => {
      const props = {
        code: WarehouseCode.create('WH-001'),
        name: 'Test Warehouse',
        isActive: true,
      };
      return Warehouse.create(props, mockOrgId);
    };

    const validCustomerReturnRequest = {
      type: 'RETURN_CUSTOMER' as const,
      warehouseId: mockWarehouseId,
      saleId: mockSaleId,
      reason: 'DEFECTIVE',
      note: 'Test return',
      lines: [
        {
          productId: 'product-123',
          locationId: 'location-123',
          quantity: 5,
          originalSalePrice: 100,
          currency: 'COP',
        },
      ],
      createdBy: mockUserId,
      orgId: mockOrgId,
    };

    it('Given: valid customer return data When: creating return Then: should return success result', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      jest
        .spyOn(ReturnNumberGenerationService, 'generateNextReturnNumber')
        .mockResolvedValue(ReturnNumber.create(2025, 1));

      const returnProps = ReturnMapper.toDomainProps(
        validCustomerReturnRequest,
        ReturnNumber.create(2025, 1)
      );
      const returnWithId = Return.reconstitute(returnProps, mockReturnId, mockOrgId);

      mockReturnRepository.save.mockResolvedValue(returnWithId);

      // Act
      const result = await useCase.execute(validCustomerReturnRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Return created successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockReturnRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent warehouse When: creating return Then: should return NotFoundError', async () => {
      // Arrange
      mockWarehouseRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validCustomerReturnRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
        }
      );
    });

    it('Given: customer return without saleId When: creating return Then: should return ValidationError', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      const invalidRequest = {
        ...validCustomerReturnRequest,
        saleId: undefined,
      };

      // Act
      const result = await useCase.execute(
        invalidRequest as unknown as typeof invalidRequest & { orgId: string }
      );

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('Sale ID is required');
        }
      );
    });

    it('Given: supplier return without sourceMovementId When: creating return Then: should return ValidationError', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      const supplierReturnRequest = {
        type: 'RETURN_SUPPLIER' as const,
        warehouseId: mockWarehouseId,
        sourceMovementId: undefined,
        reason: 'DEFECTIVE',
        lines: [
          {
            productId: 'product-123',
            locationId: 'location-123',
            quantity: 5,
            originalUnitCost: 50,
            currency: 'COP',
          },
        ],
        createdBy: mockUserId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(
        supplierReturnRequest as unknown as typeof supplierReturnRequest & { orgId: string }
      );

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('Source movement ID is required');
        }
      );
    });

    it('Given: customer return without originalSalePrice When: creating return Then: should return ValidationError', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      jest
        .spyOn(ReturnNumberGenerationService, 'generateNextReturnNumber')
        .mockResolvedValue(ReturnNumber.create(2025, 1));

      const requestWithoutPrice = {
        ...validCustomerReturnRequest,
        lines: [
          {
            productId: 'product-123',
            locationId: 'location-123',
            quantity: 5,
            originalSalePrice: undefined,
            currency: 'COP',
          },
        ],
      };

      // Act
      const result = await useCase.execute(
        requestWithoutPrice as unknown as typeof requestWithoutPrice & { orgId: string }
      );

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('Original sale price is required');
        }
      );
    });

    it('Given: supplier return without originalUnitCost When: creating return Then: should return ValidationError', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      jest
        .spyOn(ReturnNumberGenerationService, 'generateNextReturnNumber')
        .mockResolvedValue(ReturnNumber.create(2025, 1));

      const supplierReturnRequest = {
        type: 'RETURN_SUPPLIER' as const,
        warehouseId: mockWarehouseId,
        sourceMovementId: 'movement-123',
        reason: 'DEFECTIVE',
        lines: [
          {
            productId: 'product-123',
            locationId: 'location-123',
            quantity: 5,
            originalUnitCost: undefined,
            currency: 'COP',
          },
        ],
        createdBy: mockUserId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(
        supplierReturnRequest as unknown as typeof supplierReturnRequest & { orgId: string }
      );

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('Original unit cost is required');
        }
      );
    });

    it('Given: return with empty lines When: creating return Then: should create return without lines', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      jest
        .spyOn(ReturnNumberGenerationService, 'generateNextReturnNumber')
        .mockResolvedValue(ReturnNumber.create(2025, 1));

      const requestWithEmptyLines = {
        ...validCustomerReturnRequest,
        lines: [],
      };

      const returnProps = ReturnMapper.toDomainProps(
        requestWithEmptyLines,
        ReturnNumber.create(2025, 1)
      );
      const returnWithId = Return.reconstitute(returnProps, mockReturnId, mockOrgId);

      mockReturnRepository.save.mockResolvedValue(returnWithId);

      // Act
      const result = await useCase.execute(requestWithEmptyLines);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: return with undefined lines When: creating return Then: should create return without lines', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      jest
        .spyOn(ReturnNumberGenerationService, 'generateNextReturnNumber')
        .mockResolvedValue(ReturnNumber.create(2025, 1));

      const requestWithNoLines = {
        ...validCustomerReturnRequest,
        lines: undefined,
      };

      const returnProps = ReturnMapper.toDomainProps(
        requestWithNoLines,
        ReturnNumber.create(2025, 1)
      );
      const returnWithId = Return.reconstitute(returnProps, mockReturnId, mockOrgId);

      mockReturnRepository.save.mockResolvedValue(returnWithId);

      // Act
      const result = await useCase.execute(requestWithNoLines);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: valid supplier return data When: creating return Then: should return success result', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      jest
        .spyOn(ReturnNumberGenerationService, 'generateNextReturnNumber')
        .mockResolvedValue(ReturnNumber.create(2025, 2));

      const validSupplierReturnRequest = {
        type: 'RETURN_SUPPLIER' as const,
        warehouseId: mockWarehouseId,
        sourceMovementId: 'movement-123',
        reason: 'DEFECTIVE',
        note: 'Test supplier return',
        lines: [
          {
            productId: 'product-123',
            locationId: 'location-123',
            quantity: 5,
            originalUnitCost: 50,
            currency: 'COP',
          },
        ],
        createdBy: mockUserId,
        orgId: mockOrgId,
      };

      const returnProps = ReturnMapper.toDomainProps(
        validSupplierReturnRequest,
        ReturnNumber.create(2025, 2)
      );
      const returnWithId = Return.reconstitute(returnProps, mockReturnId, mockOrgId);

      mockReturnRepository.save.mockResolvedValue(returnWithId);

      // Act
      const result = await useCase.execute(validSupplierReturnRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Return created successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: customer return with valid saleId When: creating return Then: should not require sourceMovementId', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      jest
        .spyOn(ReturnNumberGenerationService, 'generateNextReturnNumber')
        .mockResolvedValue(ReturnNumber.create(2025, 3));

      const requestWithOptionals = {
        ...validCustomerReturnRequest,
        reason: undefined,
        note: undefined,
      };

      const returnProps = ReturnMapper.toDomainProps(
        requestWithOptionals,
        ReturnNumber.create(2025, 3)
      );
      const returnWithId = Return.reconstitute(returnProps, mockReturnId, mockOrgId);

      mockReturnRepository.save.mockResolvedValue(returnWithId);

      // Act
      const result = await useCase.execute(requestWithOptionals);

      // Assert
      expect(result.isOk()).toBe(true);
    });
  });
});
