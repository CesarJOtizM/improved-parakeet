import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumberGenerationService } from '@sale/domain/services/saleNumberGeneration.service';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleMapper } from '@sale/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

describe('CreateSaleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';
  const mockWarehouseId = 'warehouse-123';
  const mockContactId = 'contact-123';
  const mockProductId = 'product-123';
  const mockLocationId = 'location-123';
  const mockUserId = 'user-123';

  let useCase: CreateSaleUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;
  let mockContactRepository: jest.Mocked<IContactRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSaleRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySaleNumber: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findByDateRange: jest.fn(),
      getLastSaleNumberForYear: jest.fn(),
      findByMovementId: jest.fn(),
    } as unknown as jest.Mocked<ISaleRepository>;

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

    mockContactRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn<IContactRepository['exists']>().mockResolvedValue(true),
      delete: jest.fn(),
      findByIdentification: jest.fn(),
      existsByIdentification: jest.fn(),
      findByType: jest.fn(),
      countSales: jest.fn(),
    } as unknown as jest.Mocked<IContactRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new CreateSaleUseCase(
      mockSaleRepository,
      mockWarehouseRepository,
      mockContactRepository,
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

    const validRequest = {
      warehouseId: mockWarehouseId,
      contactId: mockContactId,
      customerReference: 'CUST-001',
      externalReference: 'EXT-001',
      note: 'Test sale',
      lines: [
        {
          productId: mockProductId,
          locationId: mockLocationId,
          quantity: 10,
          salePrice: 100,
          currency: 'COP',
        },
      ],
      createdBy: mockUserId,
      orgId: mockOrgId,
    };

    it('Given: valid sale data When: creating sale Then: should return success result', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      const mockSaleNumber = SaleNumber.create(2025, 1);
      jest
        .spyOn(SaleNumberGenerationService, 'generateNextSaleNumber')
        .mockResolvedValue(mockSaleNumber);

      const saleProps = SaleMapper.toDomainProps(validRequest, mockSaleNumber);
      const saleWithId = Sale.reconstitute(saleProps, mockSaleId, mockOrgId);

      mockSaleRepository.save.mockResolvedValue(saleWithId);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Sale created successfully');
          expect(value.data.warehouseId).toBe(mockWarehouseId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockSaleRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent warehouse When: creating sale Then: should return NotFoundError', async () => {
      // Arrange
      mockWarehouseRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('Warehouse');
        }
      );
      expect(mockSaleRepository.save).not.toHaveBeenCalled();
    });

    it('Given: repository error When: creating sale Then: should return ValidationError', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      const mockSaleNumber = SaleNumber.create(2025, 1);
      jest
        .spyOn(SaleNumberGenerationService, 'generateNextSaleNumber')
        .mockResolvedValue(mockSaleNumber);
      mockSaleRepository.save.mockRejectedValue(new Error('Database error'));

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
          expect(error.message).toBe('Database error');
        }
      );
    });

    it('Given: sale with empty lines When: creating sale Then: should create sale without lines', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      const mockSaleNumber = SaleNumber.create(2025, 1);
      jest
        .spyOn(SaleNumberGenerationService, 'generateNextSaleNumber')
        .mockResolvedValue(mockSaleNumber);

      const requestWithEmptyLines = {
        ...validRequest,
        lines: [],
      };

      const saleProps = SaleMapper.toDomainProps(requestWithEmptyLines, mockSaleNumber);
      const saleWithId = Sale.reconstitute(saleProps, mockSaleId, mockOrgId);

      mockSaleRepository.save.mockResolvedValue(saleWithId);

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

    it('Given: sale with multiple lines When: creating sale Then: should create sale with all lines', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      const mockSaleNumber = SaleNumber.create(2025, 1);
      jest
        .spyOn(SaleNumberGenerationService, 'generateNextSaleNumber')
        .mockResolvedValue(mockSaleNumber);

      const requestWithMultipleLines = {
        ...validRequest,
        lines: [
          {
            productId: mockProductId,
            locationId: mockLocationId,
            quantity: 10,
            salePrice: 100,
            currency: 'COP',
          },
          {
            productId: 'product-456',
            locationId: mockLocationId,
            quantity: 5,
            salePrice: 200,
            currency: 'COP',
          },
        ],
      };

      const saleProps = SaleMapper.toDomainProps(requestWithMultipleLines, mockSaleNumber);
      const saleWithId = Sale.reconstitute(saleProps, mockSaleId, mockOrgId);

      mockSaleRepository.save.mockResolvedValue(saleWithId);

      // Act
      const result = await useCase.execute(requestWithMultipleLines);

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
  });
});
