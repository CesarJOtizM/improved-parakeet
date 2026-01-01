import { GetMovementsUseCase } from '@application/movementUseCases/getMovementsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';

describe('GetMovementsUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetMovementsUseCase;
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

    useCase = new GetMovementsUseCase(mockMovementRepository);
  });

  describe('execute', () => {
    const createMockMovement = (type: 'IN' | 'OUT' = 'IN') => {
      const props = MovementMapper.toDomainProps({
        type,
        warehouseId: 'warehouse-123',
        lines: [],
        createdBy: 'user-123',
      });
      return Movement.create(props, mockOrgId);
    };

    it('Given: valid request When: getting movements Then: should return paginated movements', async () => {
      // Arrange
      const mockMovements = [createMockMovement('IN'), createMockMovement('OUT')];

      mockMovementRepository.findAll.mockResolvedValue(mockMovements);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Movements retrieved successfully');
          expect(value.data.length).toBeGreaterThanOrEqual(0);
          expect(value.pagination).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with warehouse filter When: getting movements Then: should return filtered movements', async () => {
      // Arrange
      const mockMovements = [createMockMovement('IN')];

      mockMovementRepository.findBySpecification.mockResolvedValue({
        data: mockMovements,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        warehouseId: 'warehouse-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockMovementRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with status filter When: getting movements Then: should return filtered movements', async () => {
      // Arrange
      const mockMovements = [createMockMovement('IN')];

      mockMovementRepository.findBySpecification.mockResolvedValue({
        data: mockMovements,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'DRAFT',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with type filter When: getting movements Then: should return filtered movements', async () => {
      // Arrange
      const mockMovements = [createMockMovement('IN')];

      mockMovementRepository.findBySpecification.mockResolvedValue({
        data: mockMovements,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        type: 'IN',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: empty movements list When: getting movements Then: should return empty paginated result', async () => {
      // Arrange
      mockMovementRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(0);
          expect(value.pagination.total).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
