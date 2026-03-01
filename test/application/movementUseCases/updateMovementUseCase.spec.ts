import { UpdateMovementUseCase } from '@application/movementUseCases/updateMovementUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { IMovementRepository } from '@movement/domain/ports/repositories';
import type { IProductRepository } from '@product/domain/ports/repositories';

describe('UpdateMovementUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockMovementId = 'movement-123';
  const mockWarehouseId = 'warehouse-123';
  const mockProductId = 'product-123';
  const mockUserId = 'user-123';

  let useCase: UpdateMovementUseCase;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;

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

    mockProductRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySku: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
    } as jest.Mocked<IProductRepository>;

    useCase = new UpdateMovementUseCase(mockMovementRepository, mockProductRepository);
  });

  describe('execute', () => {
    const createMockMovement = (status: 'DRAFT' | 'POSTED' | 'VOID' | 'RETURNED' = 'DRAFT') => {
      const props = MovementMapper.toDomainProps({
        type: 'IN',
        warehouseId: mockWarehouseId,
        reference: 'REF-001',
        reason: 'PURCHASE',
        note: 'Original note',
        lines: [],
        createdBy: mockUserId,
      });

      const line = MovementMapper.createLineEntity(
        { productId: mockProductId, quantity: 10, unitCost: 100, currency: 'COP' },
        0,
        mockOrgId
      );

      if (status === 'DRAFT') {
        return Movement.reconstitute(props, mockMovementId, mockOrgId, [line]);
      }

      // For non-DRAFT statuses, create movement with line, then transition
      const draftMovement = Movement.reconstitute(props, mockMovementId, mockOrgId, [line]);

      if (status === 'POSTED') {
        return draftMovement.post();
      }

      if (status === 'VOID') {
        const posted = draftMovement.post();
        return posted.void();
      }

      if (status === 'RETURNED') {
        const posted = draftMovement.post();
        return posted.markAsReturned(mockUserId);
      }

      return draftMovement;
    };

    const createMockProduct = () => {
      const props = ProductMapper.toDomainProps({
        sku: 'PROD-001',
        name: 'Test Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      }).unwrap();
      return Product.create(props, mockOrgId);
    };

    it('Given: DRAFT movement exists When: updating header fields Then: should return success result', async () => {
      // Arrange
      const mockMovement = createMockMovement('DRAFT');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      const updatedMovement = mockMovement.update({
        reference: 'REF-002',
        reason: 'ADJUSTMENT',
        note: 'Updated note',
      });
      mockMovementRepository.save.mockResolvedValue(updatedMovement);

      const request = {
        movementId: mockMovementId,
        orgId: mockOrgId,
        reference: 'REF-002',
        reason: 'ADJUSTMENT',
        note: 'Updated note',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Movement updated successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockMovementRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent movement When: updating movement Then: should return NotFoundError', async () => {
      // Arrange
      mockMovementRepository.findById.mockResolvedValue(null);

      const request = {
        movementId: 'non-existent-id',
        orgId: mockOrgId,
        note: 'Updated note',
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

    it('Given: POSTED movement When: updating movement Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockMovement = createMockMovement('POSTED');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      const request = {
        movementId: mockMovementId,
        orgId: mockOrgId,
        note: 'Updated note',
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
          expect(error.message).toBe('Only DRAFT movements can be updated');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: VOID movement When: updating movement Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockMovement = createMockMovement('VOID');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      const request = {
        movementId: mockMovementId,
        orgId: mockOrgId,
        note: 'Updated note',
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
          expect(error.message).toBe('Only DRAFT movements can be updated');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: DRAFT movement with new lines When: updating lines Then: should replace lines and return success', async () => {
      // Arrange
      const mockMovement = createMockMovement('DRAFT');
      const mockProduct = createMockProduct();

      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockMovementRepository.save.mockImplementation(async movement => movement);

      const request = {
        movementId: mockMovementId,
        orgId: mockOrgId,
        lines: [
          {
            productId: mockProductId,
            quantity: 20,
            unitCost: 150,
            currency: 'COP',
          },
        ],
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Movement updated successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId, mockOrgId);
      expect(mockMovementRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: DRAFT movement with new lines referencing non-existent product When: updating lines Then: should return NotFoundError', async () => {
      // Arrange
      const mockMovement = createMockMovement('DRAFT');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockProductRepository.findById.mockResolvedValue(null);

      const request = {
        movementId: mockMovementId,
        orgId: mockOrgId,
        lines: [
          {
            productId: 'non-existent-product',
            quantity: 10,
            unitCost: 100,
            currency: 'COP',
          },
        ],
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
          expect(error.message).toContain('Product not found');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: DRAFT movement When: updating only partial header fields Then: should preserve unchanged fields', async () => {
      // Arrange
      const mockMovement = createMockMovement('DRAFT');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);
      mockMovementRepository.save.mockImplementation(async movement => movement);

      const request = {
        movementId: mockMovementId,
        orgId: mockOrgId,
        note: 'Only updating note',
        // reference and reason not provided
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          // The original fields should be preserved
          expect(value.data.reference).toBe('REF-001');
          expect(value.data.reason).toBe('PURCHASE');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: RETURNED movement When: updating movement Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockMovement = createMockMovement('RETURNED');
      mockMovementRepository.findById.mockResolvedValue(mockMovement);

      const request = {
        movementId: mockMovementId,
        orgId: mockOrgId,
        note: 'Updated note',
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
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });
  });
});
