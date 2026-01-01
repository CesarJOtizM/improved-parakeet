import { CancelReturnUseCase } from '@application/returnUseCases/cancelReturnUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnValidationService } from '@returns/domain/services/returnValidation.service';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnMapper } from '@returns/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

describe('CancelReturnUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockReturnId = 'return-123';

  let useCase: CancelReturnUseCase;
  let mockReturnRepository: jest.Mocked<IReturnRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

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

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new CancelReturnUseCase(mockReturnRepository, mockEventDispatcher);
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
      returnEntity.cancel = jest.fn();
      return returnEntity;
    };

    it('Given: draft return When: cancelling return Then: should return success result', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      mockReturnRepository.findById.mockResolvedValue(mockReturn);

      jest.spyOn(ReturnValidationService, 'validateReturnCanBeCancelled').mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockReturnRepository.save.mockResolvedValue(mockReturn);

      const request = {
        id: mockReturnId,
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
          expect(value.message).toBe('Return cancelled successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent return When: cancelling return Then: should return NotFoundError', async () => {
      // Arrange
      mockReturnRepository.findById.mockResolvedValue(null);

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

    it('Given: return that cannot be cancelled When: cancelling return Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      mockReturnRepository.findById.mockResolvedValue(mockReturn);

      jest.spyOn(ReturnValidationService, 'validateReturnCanBeCancelled').mockReturnValue({
        isValid: false,
        errors: ['Return is already confirmed'],
      });

      const request = {
        id: mockReturnId,
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
