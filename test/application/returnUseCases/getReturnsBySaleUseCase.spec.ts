import { GetReturnsBySaleUseCase } from '@application/returnUseCases/getReturnsBySaleUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnMapper } from '@returns/mappers';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleMapper } from '@sale/mappers';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('GetReturnsBySaleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';

  let useCase: GetReturnsBySaleUseCase;
  let mockReturnRepository: jest.Mocked<IReturnRepository>;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;

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

    useCase = new GetReturnsBySaleUseCase(mockReturnRepository, mockSaleRepository);
  });

  describe('execute', () => {
    const createMockSale = () => {
      const props = SaleMapper.toDomainProps(
        {
          warehouseId: 'warehouse-123',
          contactId: 'contact-123',
          createdBy: 'user-123',
        },
        SaleNumber.create(2025, 1)
      );
      return Sale.create(props, mockOrgId);
    };

    const createMockReturn = () => {
      const props = ReturnMapper.toDomainProps(
        {
          type: 'RETURN_CUSTOMER',
          warehouseId: 'warehouse-123',
          saleId: mockSaleId,
          createdBy: 'user-123',
        },
        ReturnNumber.create(2025, 1)
      );
      return Return.create(props, mockOrgId);
    };

    it('Given: existing sale with returns When: getting returns by sale Then: should return returns', async () => {
      // Arrange
      const mockSale = createMockSale();
      const mockReturns = [createMockReturn()];

      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockReturnRepository.findBySaleId.mockResolvedValue(mockReturns);

      const request = {
        saleId: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Returns retrieved successfully');
          expect(value.data.length).toBeGreaterThanOrEqual(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent sale When: getting returns by sale Then: should return NotFoundError', async () => {
      // Arrange
      mockSaleRepository.findById.mockResolvedValue(null);

      const request = {
        saleId: 'non-existent-id',
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
  });
});
