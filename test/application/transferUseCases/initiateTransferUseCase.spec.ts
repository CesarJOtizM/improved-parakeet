import { InitiateTransferUseCase } from '@application/transferUseCases/initiateTransferUseCase';
import { Quantity } from '@inventory/stock';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { ValidationError } from '@shared/domain/result/domainError';
import { Transfer } from '@transfer/domain/entities/transfer.entity';
import { TransferValidationService } from '@transfer/domain/services/transferValidation.service';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';
import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';
import type { ILocationRepository } from '@warehouse/domain/repositories/locationRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

describe('InitiateTransferUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockTransferId = 'transfer-123';
  const mockFromWarehouseId = 'warehouse-from-123';
  const mockToWarehouseId = 'warehouse-to-123';
  const mockProductId = 'product-123';
  const mockUserId = 'user-123';

  let useCase: InitiateTransferUseCase;
  let mockTransferRepository: jest.Mocked<ITransferRepository>;
  let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockStockRepository: jest.Mocked<IStockRepository>;
  let mockLocationRepository: jest.Mocked<ILocationRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransferRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByFromWarehouse: jest.fn(),
      findByToWarehouse: jest.fn(),
      findByStatus: jest.fn(),
      findByDateRange: jest.fn(),
      findInTransitTransfers: jest.fn(),
      findPendingTransfers: jest.fn(),
    } as jest.Mocked<ITransferRepository>;

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

    mockProductRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySku: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
    } as jest.Mocked<IProductRepository>;

    mockStockRepository = {
      getStockQuantity: jest.fn(),
      getStockWithCost: jest.fn(),
      updateStock: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
    } as jest.Mocked<IStockRepository>;

    mockLocationRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByCode: jest.fn(),
      findByWarehouse: jest.fn(),
      findDefaultLocation: jest.fn(),
      existsByCode: jest.fn(),
    } as jest.Mocked<ILocationRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new InitiateTransferUseCase(
      mockTransferRepository,
      mockWarehouseRepository,
      mockProductRepository,
      mockStockRepository,
      mockLocationRepository,
      mockEventDispatcher
    );
  });

  describe('execute', () => {
    const createMockWarehouse = () => {
      return Warehouse.create(
        {
          code: WarehouseCode.create('WH-001'),
          name: 'Test Warehouse',
          isActive: true,
        },
        mockOrgId
      );
    };

    const createMockProduct = () => {
      const props = ProductMapper.toDomainProps({
        sku: 'PROD-001',
        name: 'Test Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      }).unwrap();
      return Product.create(props, mockOrgId);
    };

    const validRequest = {
      fromWarehouseId: mockFromWarehouseId,
      toWarehouseId: mockToWarehouseId,
      createdBy: mockUserId,
      note: 'Test transfer',
      lines: [
        {
          productId: mockProductId,
          quantity: 10,
        },
      ],
      orgId: mockOrgId,
    };

    it('Given: valid transfer data When: initiating transfer Then: should return success result', async () => {
      // Arrange
      const mockFromWarehouse = createMockWarehouse();
      const mockProduct = createMockProduct();

      jest.spyOn(TransferValidationService, 'validateTransferCreation').mockResolvedValue({
        isValid: true,
        errors: [],
      });

      mockWarehouseRepository.findById.mockResolvedValue(mockFromWarehouse);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      const mockQuantity = Quantity.create(100, 0);
      mockStockRepository.getStockQuantity.mockResolvedValue(mockQuantity);

      const transferProps = {
        fromWarehouseId: mockFromWarehouseId,
        toWarehouseId: mockToWarehouseId,
        status: TransferStatus.create('DRAFT'),
        createdBy: mockUserId,
      };
      const transferWithId = Transfer.reconstitute(transferProps, mockTransferId, mockOrgId);

      mockTransferRepository.save.mockResolvedValue(transferWithId);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Transfer initiated successfully');
          expect(value.data.fromWarehouseId).toBe(mockFromWarehouseId);
          expect(value.data.toWarehouseId).toBe(mockToWarehouseId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockTransferRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: invalid transfer validation When: initiating transfer Then: should return ValidationError', async () => {
      // Arrange
      jest.spyOn(TransferValidationService, 'validateTransferCreation').mockResolvedValue({
        isValid: false,
        errors: ['Same warehouse cannot be used for from and to'],
      });

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
        }
      );
      expect(mockTransferRepository.save).not.toHaveBeenCalled();
    });

    it('Given: non-existent product When: initiating transfer Then: should return ValidationError', async () => {
      // Arrange
      const mockFromWarehouse = createMockWarehouse();
      jest.spyOn(TransferValidationService, 'validateTransferCreation').mockResolvedValue({
        isValid: true,
        errors: [],
      });
      jest.spyOn(TransferValidationService, 'validateTransferLines').mockResolvedValue({
        isValid: false,
        errors: ['Product not found'],
      });

      mockWarehouseRepository.findById.mockResolvedValue(mockFromWarehouse);
      mockProductRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
        }
      );
      expect(mockTransferRepository.save).not.toHaveBeenCalled();
    });

    it('Given: insufficient stock When: initiating transfer Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockFromWarehouse = createMockWarehouse();
      const mockProduct = createMockProduct();

      jest.spyOn(TransferValidationService, 'validateTransferCreation').mockResolvedValue({
        isValid: true,
        errors: [],
      });
      jest.spyOn(TransferValidationService, 'validateTransferLines').mockResolvedValue({
        isValid: true,
        errors: [],
      });
      jest.spyOn(TransferValidationService, 'validateStockAvailability').mockResolvedValue({
        isValid: false,
        errors: ['Insufficient stock available'],
      });

      mockWarehouseRepository.findById.mockResolvedValue(mockFromWarehouse);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0)); // Less than requested 10

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error.message).toContain('stock');
        }
      );
      expect(mockTransferRepository.save).not.toHaveBeenCalled();
    });

    it('Given: empty lines array When: initiating transfer Then: should return ValidationError', async () => {
      // Arrange
      const requestWithEmptyLines = {
        ...validRequest,
        lines: [],
      };

      jest.spyOn(TransferValidationService, 'validateTransferCreation').mockResolvedValue({
        isValid: true,
        errors: [],
      });
      jest.spyOn(TransferValidationService, 'validateTransferLines').mockResolvedValue({
        isValid: false,
        errors: ['Transfer must have at least one line'],
      });

      // Act
      const result = await useCase.execute(requestWithEmptyLines);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
        }
      );
    });

    it('Given: zero quantity in line When: initiating transfer Then: should throw error during line creation', async () => {
      // Arrange
      const requestWithZeroQuantity = {
        ...validRequest,
        lines: [
          {
            productId: mockProductId,
            quantity: 0,
          },
        ],
      };

      const mockFromWarehouse = createMockWarehouse();
      const mockProduct = createMockProduct();

      jest.spyOn(TransferValidationService, 'validateTransferCreation').mockResolvedValue({
        isValid: true,
        errors: [],
      });
      jest.spyOn(TransferValidationService, 'validateTransferLines').mockResolvedValue({
        isValid: true,
        errors: [],
      });

      mockWarehouseRepository.findById.mockResolvedValue(mockFromWarehouse);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // Act & Assert
      // The error is thrown during TransferLine.create, which happens before validation
      await expect(useCase.execute(requestWithZeroQuantity)).rejects.toThrow(
        'Quantity must be positive'
      );
    });
  });
});
