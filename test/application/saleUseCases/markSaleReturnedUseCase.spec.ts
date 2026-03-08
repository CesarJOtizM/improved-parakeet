/* eslint-disable @typescript-eslint/no-explicit-any */
import { MarkSaleReturnedUseCase } from '@application/saleUseCases/markSaleReturnedUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { SaleMapper } from '@sale/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('MarkSaleReturnedUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';
  const mockUserId = 'user-456';

  let useCase: MarkSaleReturnedUseCase;
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
      getNextSaleNumber: jest.fn(),
      addLine: jest.fn(),
    } as jest.Mocked<ISaleRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new MarkSaleReturnedUseCase(mockSaleRepository, mockEventDispatcher);
  });

  const createMockSale = (status: string = 'COMPLETED') => {
    const saleNumber = SaleNumber.create(2025, 1);
    const props = SaleMapper.toDomainProps(
      {
        warehouseId: 'warehouse-123',
        contactId: 'contact-123',
        createdBy: 'user-123',
      },
      saleNumber
    );
    props.status = SaleStatus.create(status as any);

    if (status === 'COMPLETED') {
      props.confirmedAt = new Date();
      props.confirmedBy = 'user-123';
      props.pickedAt = new Date();
      props.pickedBy = 'user-123';
      props.shippedAt = new Date();
      props.shippedBy = 'user-123';
      props.completedAt = new Date();
      props.completedBy = 'user-123';
    }

    if (status === 'SHIPPED') {
      props.confirmedAt = new Date();
      props.confirmedBy = 'user-123';
      props.pickedAt = new Date();
      props.pickedBy = 'user-123';
      props.shippedAt = new Date();
      props.shippedBy = 'user-123';
    }

    const sale = Sale.reconstitute(props, mockSaleId, mockOrgId);
    return sale;
  };

  describe('execute', () => {
    it('Given: completed sale When: marking as returned Then: should return success result', async () => {
      // Arrange
      const mockSale = createMockSale('COMPLETED');
      mockSale.markAsReturned = jest.fn();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Sale marked as returned successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: shipped sale When: marking as returned Then: should return success result', async () => {
      // Arrange
      const mockSale = createMockSale('SHIPPED');
      mockSale.markAsReturned = jest.fn();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Sale marked as returned successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent sale When: marking as returned Then: should return NotFoundError', async () => {
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
          expect(error.message).toContain('Sale');
        }
      );
    });

    it('Given: sale in invalid status When: marking as returned Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockSale = createMockSale('COMPLETED');
      mockSale.markAsReturned = jest.fn(() => {
        throw new Error('Sale cannot be marked as returned from current status');
      });
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
          expect(error.message).toContain('cannot be marked as returned');
        }
      );
    });

    it('Given: draft sale When: marking as returned Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockSale = createMockSale('DRAFT');
      mockSale.markAsReturned = jest.fn(() => {
        throw new Error('Sale cannot be marked as returned from current status');
      });
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
        }
      );
    });

    it('Given: completed sale When: marking as returned Then: should call save on repository', async () => {
      // Arrange
      const mockSale = createMockSale('COMPLETED');
      mockSale.markAsReturned = jest.fn();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockSaleRepository.save).toHaveBeenCalledTimes(1);
      expect(mockSaleRepository.save).toHaveBeenCalledWith(mockSale);
    });

    it('Given: completed sale When: marking as returned Then: should dispatch domain events', async () => {
      // Arrange
      const mockSale = createMockSale('COMPLETED');
      mockSale.markAsReturned = jest.fn();
      mockSale.markEventsForDispatch = jest.fn();
      mockSale.clearEvents = jest.fn();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
      expect(mockSale.markEventsForDispatch).toHaveBeenCalledTimes(1);
      expect(mockSale.clearEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: completed sale When: marking as returned with userId Then: should pass userId to markAsReturned method', async () => {
      // Arrange
      const mockSale = createMockSale('COMPLETED');
      mockSale.markAsReturned = jest.fn();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockSale.markAsReturned).toHaveBeenCalledWith(mockUserId);
    });

    it('Given: completed sale When: marking as returned without userId Then: should pass undefined to markAsReturned method', async () => {
      // Arrange
      const mockSale = createMockSale('COMPLETED');
      mockSale.markAsReturned = jest.fn();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockSale.markAsReturned).toHaveBeenCalledWith(undefined);
    });

    it('Given: completed sale When: marking as returned successfully Then: response should contain correct sale data', async () => {
      // Arrange
      const mockSale = createMockSale('COMPLETED');
      mockSale.markAsReturned = jest.fn();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.id).toBe(mockSaleId);
          expect(value.data.orgId).toBe(mockOrgId);
          expect(value.data.warehouseId).toBe('warehouse-123');
          expect(value.data.createdBy).toBe('user-123');
          expect(value.timestamp).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: completed sale When: marking as returned Then: should use saleId field from request', async () => {
      // Arrange
      const mockSale = createMockSale('COMPLETED');
      mockSale.markAsReturned = jest.fn();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        saleId: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockSaleRepository.findById).toHaveBeenCalledWith(mockSaleId, mockOrgId);
    });
  });
});
