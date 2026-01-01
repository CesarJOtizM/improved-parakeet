import { AddSaleLineUseCase } from '@application/saleUseCases/addSaleLineUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleMapper } from '@sale/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('AddSaleLineUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';
  const mockProductId = 'product-123';

  let useCase: AddSaleLineUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
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
    } as jest.Mocked<ISaleRepository>;

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

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new AddSaleLineUseCase(
      mockSaleRepository,
      mockProductRepository,
      mockEventDispatcher
    );
  });

  describe('execute', () => {
    const createMockSale = () => {
      const props = SaleMapper.toDomainProps(
        {
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        SaleNumber.create(2025, 1)
      );
      const sale = Sale.reconstitute(props, mockSaleId, mockOrgId);
      sale.addLine = jest.fn();
      return sale;
    };

    const createMockProduct = () => {
      const props = ProductMapper.toDomainProps({
        sku: 'PROD-001',
        name: 'Test Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      }).unwrap();
      return Product.create(props, mockOrgId);
    };

    it('Given: existing sale and product When: adding line Then: should return success result', async () => {
      // Arrange
      const mockSale = createMockSale();
      const mockProduct = createMockProduct();

      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        productId: mockProductId,
        locationId: 'location-123',
        quantity: 10,
        salePrice: 100,
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
          expect(value.message).toBe('Line added to sale successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockSaleRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent sale When: adding line Then: should return NotFoundError', async () => {
      // Arrange
      mockSaleRepository.findById.mockResolvedValue(null);

      const request = {
        saleId: 'non-existent-id',
        productId: mockProductId,
        locationId: 'location-123',
        quantity: 10,
        salePrice: 100,
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
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockProductRepository.findById.mockResolvedValue(null);

      const request = {
        saleId: mockSaleId,
        productId: 'non-existent-product',
        locationId: 'location-123',
        quantity: 10,
        salePrice: 100,
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
