import { GetReturnsByMovementUseCase } from '@application/returnUseCases/getReturnsByMovementUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnMapper } from '@returns/mappers';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

describe('GetReturnsByMovementUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockMovementId = 'movement-123';

  let useCase: GetReturnsByMovementUseCase;
  let mockReturnRepository: jest.Mocked<IReturnRepository>;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;

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
    } as any;

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

    useCase = new GetReturnsByMovementUseCase(mockReturnRepository, mockMovementRepository);
  });

  describe('execute', () => {
    const createMockMovement = () => {
      const props = MovementMapper.toDomainProps({
        type: 'IN',
        warehouseId: 'warehouse-123',
        lines: [],
        createdBy: 'user-123',
      });
      return Movement.create(props, mockOrgId);
    };

    const createMockReturn = () => {
      const props = ReturnMapper.toDomainProps(
        {
          type: 'RETURN_SUPPLIER',
          warehouseId: 'warehouse-123',
          sourceMovementId: mockMovementId,
          createdBy: 'user-123',
        },
        ReturnNumber.create(2025, 1)
      );
      return Return.create(props, mockOrgId);
    };

    it('Given: existing movement with returns When: getting returns by movement Then: should return returns', async () => {
      // Arrange
      const mockMovement = createMockMovement();
      const mockReturns = [createMockReturn()];

      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockReturnRepository.findBySourceMovementId.mockResolvedValue(mockReturns);

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
          expect(value.message).toBe('Returns retrieved successfully');
          expect(value.data.length).toBeGreaterThanOrEqual(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent movement When: getting returns by movement Then: should return NotFoundError', async () => {
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
        }
      );
    });
  });
});
