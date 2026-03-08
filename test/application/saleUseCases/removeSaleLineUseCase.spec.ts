import { RemoveSaleLineUseCase } from '@application/saleUseCases/removeSaleLineUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleMapper } from '@sale/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('RemoveSaleLineUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';
  const mockLineId = 'line-123';

  let useCase: RemoveSaleLineUseCase;
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

    useCase = new RemoveSaleLineUseCase(mockSaleRepository, mockEventDispatcher);
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
      const sale = Sale.reconstitute(props, mockSaleId, mockOrgId);
      sale.removeLine = jest.fn();
      return sale;
    };

    it('Given: existing sale with line When: removing line Then: should return success result', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        lineId: mockLineId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Line removed from sale successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockSaleRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent sale When: removing line Then: should return NotFoundError', async () => {
      // Arrange
      mockSaleRepository.findById.mockResolvedValue(null);

      const request = {
        saleId: 'non-existent-id',
        lineId: mockLineId,
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

    it('Given: sale that cannot remove line When: removing line Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSale.removeLine = jest.fn(() => {
        throw new Error('Line cannot be removed');
      });
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        lineId: mockLineId,
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
