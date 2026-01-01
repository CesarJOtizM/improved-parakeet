import { GetSaleMovementUseCase } from '@application/saleUseCases/getSaleMovementUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleMapper } from '@sale/mappers';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('GetSaleMovementUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';
  const mockMovementId = 'movement-123';

  let useCase: GetSaleMovementUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;

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

    useCase = new GetSaleMovementUseCase(mockSaleRepository, mockMovementRepository);
  });

  describe('execute', () => {
    const createMockSale = (hasMovementId = true) => {
      const saleNumber = SaleNumber.create(2025, 1);
      const props = SaleMapper.toDomainProps(
        {
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        saleNumber
      );
      const sale = Sale.reconstitute(props, mockSaleId, mockOrgId);
      if (hasMovementId) {
        Object.defineProperty(sale, 'movementId', {
          get: () => mockMovementId,
          configurable: true,
        });
      }
      return sale;
    };

    const createMockMovement = () => {
      const props = MovementMapper.toDomainProps({
        type: 'OUT',
        warehouseId: 'warehouse-123',
        lines: [],
        createdBy: 'user-123',
      });
      return Movement.reconstitute(props, mockMovementId, mockOrgId);
    };

    it('Given: confirmed sale with movement When: getting movement Then: should return movement', async () => {
      // Arrange
      const mockSale = createMockSale(true);
      const mockMovement = createMockMovement();

      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

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
          expect(value.message).toBe('Movement retrieved successfully');
          expect(value.data.id).toBe(mockMovementId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent sale When: getting movement Then: should return NotFoundError', async () => {
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

    it('Given: sale without movement When: getting movement Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockSale = createMockSale(false);
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
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
          expect(error.message).toContain('not confirmed');
        }
      );
    });

    it('Given: sale with non-existent movement When: getting movement Then: should return NotFoundError', async () => {
      // Arrange
      const mockSale = createMockSale(true);
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockMovementRepository.findById.mockResolvedValue(null);

      const request = {
        saleId: mockSaleId,
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
          expect(error.message).toContain('Movement');
        }
      );
    });
  });
});
