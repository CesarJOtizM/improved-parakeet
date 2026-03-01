import { MarkMovementReturnedUseCase } from '@application/movementUseCases/markMovementReturnedUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

import type { IMovementRepository } from '@movement/domain/ports/repositories';

describe('MarkMovementReturnedUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockMovementId = 'movement-123';
  const mockProductId = 'product-123';
  const mockUserId = 'user-123';

  let useCase: MarkMovementReturnedUseCase;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

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

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new MarkMovementReturnedUseCase(mockMovementRepository, mockEventDispatcher);
  });

  describe('execute', () => {
    const createMockMovement = (status: 'DRAFT' | 'POSTED' | 'VOID' | 'RETURNED' = 'POSTED') => {
      const props = MovementMapper.toDomainProps({
        type: 'IN',
        warehouseId: 'warehouse-123',
        lines: [],
        createdBy: mockUserId,
      });

      const line = MovementMapper.createLineEntity(
        { productId: mockProductId, quantity: 10, unitCost: 100, currency: 'COP' },
        0,
        mockOrgId
      );

      const draftMovement = Movement.reconstitute(props, mockMovementId, mockOrgId, [line]);

      if (status === 'DRAFT') {
        return draftMovement;
      }

      const postedMovement = draftMovement.post();

      if (status === 'POSTED') {
        return postedMovement;
      }

      if (status === 'VOID') {
        return postedMovement.void();
      }

      if (status === 'RETURNED') {
        return postedMovement.markAsReturned(mockUserId);
      }

      return postedMovement;
    };

    const validRequest = {
      movementId: mockMovementId,
      orgId: mockOrgId,
      userId: mockUserId,
    };

    it('Given: POSTED movement exists When: marking as returned Then: should return success result', async () => {
      // Arrange
      const mockMovement = createMockMovement('POSTED');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      const returnedMovement = mockMovement.markAsReturned(mockUserId);
      mockMovementRepository.save.mockResolvedValue(returnedMovement);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Movement marked as returned successfully');
          expect(value.data.id).toBe(mockMovementId);
          expect(value.data.status).toBe('RETURNED');
          expect(value.data.type).toBe('IN');
          expect(value.data.warehouseId).toBe('warehouse-123');
          expect(value.data.returnedBy).toBe(mockUserId);
          expect(value.data.returnedAt).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockMovementRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent movement When: marking as returned Then: should return NotFoundError', async () => {
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
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: DRAFT movement When: marking as returned Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockMovement = createMockMovement('DRAFT');
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
          expect(error.message).toBe('Only POSTED movements can be marked as returned');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: VOID movement When: marking as returned Then: should return BusinessRuleError', async () => {
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
          expect(error.message).toBe('Only POSTED movements can be marked as returned');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: already RETURNED movement When: marking as returned Then: should return BusinessRuleError', async () => {
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
          expect(error.message).toBe('Only POSTED movements can be marked as returned');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: POSTED movement When: marking as returned Then: should dispatch domain events', async () => {
      // Arrange
      const mockMovement = createMockMovement('POSTED');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      const returnedMovement = mockMovement.markAsReturned(mockUserId);
      mockMovementRepository.save.mockResolvedValue(returnedMovement);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockEventDispatcher.markAndDispatch).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.markAndDispatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventName: expect.any(String),
          }),
        ])
      );
    });

    it('Given: POSTED movement without userId When: marking as returned Then: should succeed without returnedBy', async () => {
      // Arrange
      const mockMovement = createMockMovement('POSTED');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      const returnedMovement = mockMovement.markAsReturned(undefined);
      mockMovementRepository.save.mockResolvedValue(returnedMovement);

      const requestWithoutUserId = {
        movementId: mockMovementId,
        orgId: mockOrgId,
        // userId not provided
      };

      // Act
      const result = await useCase.execute(requestWithoutUserId);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.status).toBe('RETURNED');
          expect(value.data.returnedBy).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: POSTED movement When: marking as returned and save succeeds Then: should save with RETURNED status', async () => {
      // Arrange
      const mockMovement = createMockMovement('POSTED');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockMovementRepository.save.mockImplementation(async movement => movement);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockMovementRepository.save).toHaveBeenCalledTimes(1);
      const savedMovement = mockMovementRepository.save.mock.calls[0][0] as Movement;
      expect(savedMovement.status.getValue()).toBe('RETURNED');
      expect(savedMovement.returnedBy).toBe(mockUserId);
      expect(savedMovement.returnedAt).toBeInstanceOf(Date);
    });
  });
});
