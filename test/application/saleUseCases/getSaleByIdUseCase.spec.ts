import { GetSaleByIdUseCase } from '@application/saleUseCases/getSaleByIdUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleMapper } from '@sale/mappers';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('GetSaleByIdUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';

  let useCase: GetSaleByIdUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;

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

    useCase = new GetSaleByIdUseCase(mockSaleRepository);
  });

  describe('execute', () => {
    const createMockSale = () => {
      const saleNumber = SaleNumber.create(2025, 1);
      const props = SaleMapper.toDomainProps(
        {
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        saleNumber
      );
      return Sale.reconstitute(props, mockSaleId, mockOrgId);
    };

    it('Given: existing sale ID When: getting sale by ID Then: should return sale', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Sale retrieved successfully');
          expect(value.data.id).toBe(mockSaleId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockSaleRepository.findById).toHaveBeenCalledWith(mockSaleId, mockOrgId);
    });

    it('Given: non-existent sale ID When: getting sale by ID Then: should return NotFoundError', async () => {
      // Arrange
      mockSaleRepository.findById.mockResolvedValue(null);

      const request = {
        id: 'non-existent-id',
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
          expect(error.message).toContain('Sale');
        }
      );
    });
  });
});
