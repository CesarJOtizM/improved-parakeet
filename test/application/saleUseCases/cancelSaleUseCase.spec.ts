import { CancelSaleUseCase } from '@application/saleUseCases/cancelSaleUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleMapper } from '@sale/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('CancelSaleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';

  let useCase: CancelSaleUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
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

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new CancelSaleUseCase(mockSaleRepository, mockEventDispatcher);
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
      const sale = Sale.reconstitute(props, mockSaleId, mockOrgId);
      sale.cancel = jest.fn();
      return sale;
    };

    it('Given: draft sale When: cancelling sale Then: should return success result', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
        reason: 'Customer request',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Sale cancelled successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockSaleRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent sale When: cancelling sale Then: should return NotFoundError', async () => {
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
        }
      );
    });

    it('Given: sale that cannot be cancelled When: cancelling sale Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSale.cancel = jest.fn(() => {
        throw new Error('Sale cannot be cancelled');
      });
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
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
  });
});
