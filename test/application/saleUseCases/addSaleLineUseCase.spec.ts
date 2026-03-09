import { AddSaleLineUseCase } from '@application/saleUseCases/addSaleLineUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/result/domainError';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('AddSaleLineUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';
  const mockProductId = 'product-123';

  let useCase: AddSaleLineUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;

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
      getNextSaleNumber: jest.fn(),
      addLine: jest.fn(),
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

    useCase = new AddSaleLineUseCase(mockSaleRepository, mockProductRepository);
  });

  describe('execute', () => {
    const createMockProduct = () => {
      const props = ProductMapper.toDomainProps({
        sku: 'PROD-001',
        name: 'Test Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      }).unwrap();
      return Product.create(props, mockOrgId);
    };

    const createMockSaleLine = () => {
      return SaleLine.reconstitute(
        {
          productId: mockProductId,
          locationId: 'location-123',
          quantity: Quantity.create(10, 6),
          salePrice: SalePrice.create(100, 'COP', 2),
        },
        'line-123',
        mockOrgId
      );
    };

    it('Given: existing sale and product When: adding line Then: should return success result', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      const mockSavedLine = createMockSaleLine();

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockSaleRepository.addLine.mockResolvedValue(mockSavedLine);

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
          expect(value.data.productId).toBe(mockProductId);
          expect(value.data.quantity).toBe(10);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockSaleRepository.addLine).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent sale When: adding line Then: should return NotFoundError', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockSaleRepository.addLine.mockRejectedValue(
        new NotFoundError('Sale with ID non-existent-id not found')
      );

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

    it('Given: sale not in DRAFT status When: adding line Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockSaleRepository.addLine.mockRejectedValue(
        new BusinessRuleError('Cannot add lines to sale in CONFIRMED status')
      );

      const request = {
        saleId: mockSaleId,
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
          expect(error).toBeInstanceOf(BusinessRuleError);
        }
      );
    });

    it('Given: no currency provided When: adding line Then: should default to COP', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      const mockSavedLine = createMockSaleLine();

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockSaleRepository.addLine.mockResolvedValue(mockSavedLine);

      const request = {
        saleId: mockSaleId,
        productId: mockProductId,
        locationId: 'location-123',
        quantity: 10,
        salePrice: 100,
        // currency is omitted - should default to COP
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.currency).toBe('COP');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: no locationId provided When: adding line Then: should succeed without locationId', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      const savedLineWithoutLocation = SaleLine.reconstitute(
        {
          productId: mockProductId,
          locationId: undefined,
          quantity: Quantity.create(10, 6),
          salePrice: SalePrice.create(100, 'COP', 2),
        },
        'line-456',
        mockOrgId
      );

      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockSaleRepository.addLine.mockResolvedValue(savedLineWithoutLocation);

      const request = {
        saleId: mockSaleId,
        productId: mockProductId,
        // locationId is omitted
        quantity: 10,
        salePrice: 100,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.locationId).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: addLine throws generic Error When: adding line Then: should rethrow the error', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockSaleRepository.addLine.mockRejectedValue(new Error('Unexpected DB failure'));

      const request = {
        saleId: mockSaleId,
        productId: mockProductId,
        locationId: 'location-123',
        quantity: 10,
        salePrice: 100,
        orgId: mockOrgId,
      };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Unexpected DB failure');
    });
  });
});
