import { PostMovementUseCase } from '@application/movementUseCases/postMovementUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';
import { StockValidationService } from '@stock/domain/services/stockValidation.service';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { IMovementRepository } from '@movement/domain/ports/repositories';
import type { IStockRepository } from '@stock/domain/ports/repositories';

describe('PostMovementUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockMovementId = 'movement-123';

  let useCase: PostMovementUseCase;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockStockRepository: jest.Mocked<IStockRepository>;

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

    mockStockRepository = {
      getStockQuantity: jest.fn(),
      getStockWithCost: jest.fn(),
      updateStock: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
    } as jest.Mocked<IStockRepository>;

    useCase = new PostMovementUseCase(mockMovementRepository, mockStockRepository);
  });

  describe('execute', () => {
    const createMockMovement = (
      type: 'IN' | 'OUT' = 'IN',
      status: 'DRAFT' | 'POSTED' = 'DRAFT'
    ) => {
      const props = MovementMapper.toDomainProps({
        type,
        warehouseId: 'warehouse-123',
        lines: [
          {
            productId: 'product-123',
            locationId: 'location-123',
            quantity: 10,
            unitCost: 100,
            currency: 'COP',
          },
        ],
        createdBy: 'user-123',
      });
      const movement = Movement.create(props, mockOrgId);

      // Add line to movement
      const line = MovementMapper.createLineEntity(
        {
          productId: 'product-123',
          locationId: 'location-123',
          quantity: 10,
          unitCost: 100,
          currency: 'COP',
        },
        0, // precision
        mockOrgId
      );
      movement.addLine(line);

      if (status === 'POSTED') {
        const postedMovement = movement.post();
        return postedMovement;
      }

      return Movement.reconstitute(props, mockMovementId, mockOrgId, [line]);
    };

    it('Given: draft IN movement When: posting movement Then: should return success result', async () => {
      // Arrange
      const mockMovement = createMockMovement('IN', 'DRAFT');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      // Mock the posted movement
      const postedMovement = mockMovement.post();
      mockMovementRepository.save.mockResolvedValue(postedMovement);
      mockMovementRepository.findDraftMovements.mockResolvedValue([]);
      mockMovementRepository.findPostedMovements.mockResolvedValue([]);

      const request = {
        movementId: mockMovementId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Movement posted successfully');
          expect(value.data.id).toBe(mockMovementId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockMovementRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent movement When: posting movement Then: should return NotFoundError', async () => {
      // Arrange
      mockMovementRepository.findById.mockResolvedValue(null);

      const request = {
        movementId: 'non-existent-id',
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
          expect(error.message).toBe('Movement not found');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: already posted movement When: posting movement Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockMovement = createMockMovement('IN', 'POSTED');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      const request = {
        movementId: mockMovementId,
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
          expect(error.message).toBe('Movement cannot be posted');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: OUT movement with insufficient stock When: posting movement Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockMovement = createMockMovement('OUT', 'DRAFT');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockMovementRepository.findDraftMovements.mockResolvedValue([]);
      mockMovementRepository.findPostedMovements.mockResolvedValue([]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0)); // Less than required 10

      jest.spyOn(StockValidationService, 'validateStockForOutput').mockReturnValue({
        isValid: false,
        availableQuantity: Quantity.create(5, 0),
        requestedQuantity: Quantity.create(10, 0),
        errors: ['Insufficient stock'],
      });

      const request = {
        movementId: mockMovementId,
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
          expect(error.message).toContain('Insufficient stock');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });
  });
});
