import { DeleteMovementUseCase } from '@application/movementUseCases/deleteMovementUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { IMovementRepository } from '@movement/domain/ports/repositories';

describe('DeleteMovementUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockMovementId = 'movement-123';
  const mockUserId = 'user-123';

  let useCase: DeleteMovementUseCase;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

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

    useCase = new DeleteMovementUseCase(mockMovementRepository);
  });

  describe('execute', () => {
    const createMockMovement = (status: 'DRAFT' | 'POSTED' | 'VOID' | 'RETURNED' = 'DRAFT') => {
      const props = MovementMapper.toDomainProps({
        type: 'IN',
        warehouseId: 'warehouse-123',
        lines: [],
        createdBy: mockUserId,
      });

      // Override status if not DRAFT
      if (status !== 'DRAFT') {
        const movement = Movement.create(props, mockOrgId);
        const line = MovementMapper.createLineEntity(
          { productId: 'product-123', quantity: 10, unitCost: 100, currency: 'COP' },
          0,
          mockOrgId
        );
        movement.addLine(line);

        const reconstitutedProps = MovementMapper.toDomainProps({
          type: 'IN',
          warehouseId: 'warehouse-123',
          lines: [],
          createdBy: mockUserId,
        });

        // For POSTED status, post the movement first
        if (status === 'POSTED') {
          const draftMovement = Movement.reconstitute(
            reconstitutedProps,
            mockMovementId,
            mockOrgId,
            [line]
          );
          return draftMovement.post();
        }

        // For VOID status, post then void
        if (status === 'VOID') {
          const draftMovement = Movement.reconstitute(
            reconstitutedProps,
            mockMovementId,
            mockOrgId,
            [line]
          );
          const posted = draftMovement.post();
          return posted.void();
        }

        // For RETURNED status, post then mark as returned
        if (status === 'RETURNED') {
          const draftMovement = Movement.reconstitute(
            reconstitutedProps,
            mockMovementId,
            mockOrgId,
            [line]
          );
          const posted = draftMovement.post();
          return posted.markAsReturned(mockUserId);
        }
      }

      return Movement.reconstitute(props, mockMovementId, mockOrgId, []);
    };

    const validRequest = {
      movementId: mockMovementId,
      orgId: mockOrgId,
    };

    it('Given: DRAFT movement exists When: deleting movement Then: should return success result', async () => {
      // Arrange
      const mockMovement = createMockMovement('DRAFT');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockMovementRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Movement deleted successfully');
          expect(value.data.deleted).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockMovementRepository.findById).toHaveBeenCalledWith(mockMovementId, mockOrgId);
      expect(mockMovementRepository.delete).toHaveBeenCalledWith(mockMovementId, mockOrgId);
    });

    it('Given: non-existent movement When: deleting movement Then: should return NotFoundError', async () => {
      // Arrange
      mockMovementRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Movement not found');
        }
      );
      expect(mockMovementRepository.delete).not.toHaveBeenCalled();
    });

    it('Given: POSTED movement When: deleting movement Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockMovement = createMockMovement('POSTED');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toBe('Only DRAFT movements can be deleted');
        }
      );
      expect(mockMovementRepository.delete).not.toHaveBeenCalled();
    });

    it('Given: VOID movement When: deleting movement Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockMovement = createMockMovement('VOID');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toBe('Only DRAFT movements can be deleted');
        }
      );
      expect(mockMovementRepository.delete).not.toHaveBeenCalled();
    });

    it('Given: RETURNED movement When: deleting movement Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockMovement = createMockMovement('RETURNED');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toBe('Only DRAFT movements can be deleted');
        }
      );
      expect(mockMovementRepository.delete).not.toHaveBeenCalled();
    });

    it('Given: DRAFT movement When: delete succeeds Then: should call repository delete with correct args', async () => {
      // Arrange
      const mockMovement = createMockMovement('DRAFT');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockMovementRepository.delete.mockResolvedValue(undefined);

      // Act
      await useCase.execute(validRequest);

      // Assert
      expect(mockMovementRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockMovementRepository.findById).toHaveBeenCalledWith(mockMovementId, mockOrgId);
      expect(mockMovementRepository.delete).toHaveBeenCalledTimes(1);
      expect(mockMovementRepository.delete).toHaveBeenCalledWith(mockMovementId, mockOrgId);
    });

    it('Given: DRAFT movement When: delete returns success Then: response should contain timestamp', async () => {
      // Arrange
      const mockMovement = createMockMovement('DRAFT');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockMovementRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.timestamp).toBeDefined();
          expect(typeof value.timestamp).toBe('string');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
