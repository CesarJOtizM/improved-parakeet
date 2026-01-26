import { AddReturnLineUseCase } from '@application/returnUseCases/addReturnLineUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnMapper } from '@returns/mappers';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { SaleMapper } from '@sale/mappers';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('AddReturnLineUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockReturnId = 'return-123';
  const mockProductId = 'product-123';

  let useCase: AddReturnLineUseCase;
  let mockReturnRepository: jest.Mocked<IReturnRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;

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
      getNextReturnNumber: jest.fn(),
      addLine: jest.fn(),
    } as jest.Mocked<IReturnRepository>;

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
      getNextSaleNumber: jest.fn(),
      addLine: jest.fn(),
    } as jest.Mocked<ISaleRepository>;

    mockMovementRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByWarehouse: jest.fn(),
      findByStatus: jest.fn(),
      findByType: jest.fn(),
      findByDateRange: jest.fn(),
      findByProduct: jest.fn(),
      findDraftMovements: jest.fn(),
      findPostedMovements: jest.fn(),
    } as jest.Mocked<IMovementRepository>;

    useCase = new AddReturnLineUseCase(
      mockReturnRepository,
      mockProductRepository,
      mockSaleRepository,
      mockMovementRepository
    );
  });

  describe('execute', () => {
    const createMockReturn = () => {
      const props = ReturnMapper.toDomainProps(
        {
          type: 'RETURN_CUSTOMER',
          warehouseId: 'warehouse-123',
          saleId: 'sale-123',
          createdBy: 'user-123',
        },
        ReturnNumber.create(2025, 1)
      );
      const returnEntity = Return.reconstitute(props, mockReturnId, mockOrgId);
      return returnEntity;
    };

    const createMockProduct = () => {
      const props = ProductMapper.toDomainProps({
        sku: 'PROD-001',
        name: 'Test Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      }).unwrap();
      return Product.create(props, mockOrgId);
    };

    const createMockReturnLine = () => {
      return ReturnLine.reconstitute(
        {
          productId: mockProductId,
          locationId: 'location-123',
          quantity: Quantity.create(5, 6),
          originalSalePrice: SalePrice.create(100, 'COP', 2),
          currency: 'COP',
        },
        'line-123',
        mockOrgId
      );
    };

    it('Given: existing return and product When: adding line Then: should return success result', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      const mockProduct = createMockProduct();
      const mockSavedLine = createMockReturnLine();

      // Create a mock Sale with lines
      const saleNumber = SaleNumber.create(2025, 1);
      const saleProps = SaleMapper.toDomainProps(
        {
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        saleNumber
      );
      const mockSale = Sale.create(saleProps, mockOrgId);
      const saleLine = SaleLine.create(
        {
          productId: mockProductId,
          locationId: 'location-123',
          quantity: Quantity.create(10, 6),
          salePrice: SalePrice.create(100, 'COP', 2),
        },
        mockOrgId
      );
      mockSale.addLine(saleLine);

      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockReturnRepository.addLine.mockResolvedValue(mockSavedLine);

      const request = {
        returnId: mockReturnId,
        productId: mockProductId,
        locationId: 'location-123',
        quantity: 5,
        currency: 'COP',
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Line added to return successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockReturnRepository.addLine).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent return When: adding line Then: should return NotFoundError', async () => {
      // Arrange
      mockReturnRepository.findById.mockResolvedValue(null);

      const request = {
        returnId: 'non-existent-id',
        productId: mockProductId,
        locationId: 'location-123',
        quantity: 5,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

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

    it('Given: non-existent product When: adding line Then: should return ValidationError', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      mockProductRepository.findById.mockResolvedValue(null);

      const request = {
        returnId: mockReturnId,
        productId: 'non-existent-product',
        locationId: 'location-123',
        quantity: 5,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

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
  });
});
