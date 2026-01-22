/* eslint-disable @typescript-eslint/no-explicit-any */
import { PostMovementUseCase } from '@application/movementUseCases/postMovementUseCase';
import { Money, Quantity } from '@inventory/stock';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

describe('Movement Integration Tests', () => {
  let postMovementUseCase: PostMovementUseCase;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockStockRepository: jest.Mocked<IStockRepository>;
  let mockEventDispatcher: { markAndDispatch: jest.Mock; dispatchEvents: jest.Mock };

  const testOrgId = 'test-org-123';
  const testWarehouseId = 'warehouse-123';
  const testProductId = 'product-123';
  const testLocationId = 'location-123';
  const testUserId = 'user-123';

  beforeEach(() => {
    // Create mocks
    mockMovementRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findDraftMovements: jest.fn(),
      findPostedMovements: jest.fn(),
    } as any;

    mockStockRepository = {
      getStockQuantity: jest.fn(),
      getStockWithCost: jest.fn(),
      updateStock: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
    } as any;

    mockEventDispatcher = {
      markAndDispatch: jest.fn().mockResolvedValue(undefined),
      dispatchEvents: jest.fn().mockResolvedValue(undefined),
    };

    postMovementUseCase = new PostMovementUseCase(
      mockMovementRepository,
      mockStockRepository,
      mockEventDispatcher
    );
  });

  describe('PostMovementUseCase - Stock Validation', () => {
    it('Given: output movement with sufficient stock When: posting movement Then: should post successfully', async () => {
      // Arrange
      const movement = Movement.create(
        {
          type: MovementType.create('OUT'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: testWarehouseId,
          createdBy: testUserId,
        },
        testOrgId
      );

      const line = MovementLine.create(
        {
          productId: testProductId,
          locationId: testLocationId,
          quantity: Quantity.create(10),
          currency: 'COP',
        },
        testOrgId
      );

      movement.addLine(line);

      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(20));
      mockMovementRepository.findDraftMovements.mockResolvedValue([]);
      mockMovementRepository.findPostedMovements.mockResolvedValue([]);
      mockMovementRepository.save.mockResolvedValue(movement);

      // Act
      const result = await postMovementUseCase.execute({
        movementId: movement.id,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => fail('Should not return error')
      );
      expect(mockStockRepository.getStockQuantity).toHaveBeenCalledWith(
        testProductId,
        testWarehouseId,
        testOrgId,
        testLocationId
      );
      expect(mockMovementRepository.save).toHaveBeenCalled();
    });

    it('Given: output movement with insufficient stock When: posting movement Then: should return BusinessRuleError result', async () => {
      // Arrange
      const movement = Movement.create(
        {
          type: MovementType.create('OUT'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: testWarehouseId,
          createdBy: testUserId,
        },
        testOrgId
      );

      const line = MovementLine.create(
        {
          productId: testProductId,
          locationId: testLocationId,
          quantity: Quantity.create(30),
          currency: 'COP',
        },
        testOrgId
      );

      movement.addLine(line);

      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(20));
      mockMovementRepository.findDraftMovements.mockResolvedValue([]);
      mockMovementRepository.findPostedMovements.mockResolvedValue([]);

      // Act
      const result = await postMovementUseCase.execute({
        movementId: movement.id,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: input movement When: posting movement Then: should post without stock validation', async () => {
      // Arrange
      const movement = Movement.create(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: testWarehouseId,
          createdBy: testUserId,
        },
        testOrgId
      );

      const line = MovementLine.create(
        {
          productId: testProductId,
          locationId: testLocationId,
          quantity: Quantity.create(10),
          unitCost: Money.create(100),
          currency: 'COP',
        },
        testOrgId
      );

      movement.addLine(line);

      mockMovementRepository.findById.mockResolvedValue(movement);
      mockMovementRepository.save.mockResolvedValue(movement);

      // Act
      const result = await postMovementUseCase.execute({
        movementId: movement.id,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => fail('Should not return error')
      );
      expect(mockStockRepository.getStockQuantity).not.toHaveBeenCalled();
      expect(mockMovementRepository.save).toHaveBeenCalled();
    });

    it('Given: movement not found When: posting movement Then: should return NotFoundError result', async () => {
      // Arrange
      mockMovementRepository.findById.mockResolvedValue(null);

      // Act
      const result = await postMovementUseCase.execute({
        movementId: 'non-existent-id',
        orgId: testOrgId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
    });

    it('Given: movement already posted When: posting movement Then: should return BusinessRuleError result', async () => {
      // Arrange
      const movement = Movement.create(
        {
          type: MovementType.create('OUT'),
          status: MovementStatus.create('POSTED'),
          warehouseId: testWarehouseId,
          createdBy: testUserId,
        },
        testOrgId
      );

      mockMovementRepository.findById.mockResolvedValue(movement);

      // Act
      const result = await postMovementUseCase.execute({
        movementId: movement.id,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
    });
  });
});
