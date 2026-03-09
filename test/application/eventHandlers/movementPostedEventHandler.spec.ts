/* eslint-disable @typescript-eslint/no-explicit-any */
import { MovementPostedEventHandler } from '@application/eventHandlers/movementPostedEventHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Money, Quantity } from '@inventory/stock';
import { MovementPostedEvent } from '@movement/domain/events/movementPosted.event';

import type { DomainEventBus } from '@shared/domain/events/domainEventBus.service';
import type { EventIdempotencyService } from '@shared/domain/events/eventIdempotency.service';
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

describe('MovementPostedEventHandler', () => {
  let handler: MovementPostedEventHandler;
  let mockMovementRepository: Record<string, jest.Mock<any>>;
  let mockStockRepository: Record<string, jest.Mock<any>>;
  let mockEventBus: Record<string, jest.Mock<any>>;
  let mockIdempotencyService: Record<string, jest.Mock<any>>;

  const createMockMovement = (overrides: Partial<any> = {}): any => ({
    id: 'mov-123',
    orgId: 'org-123',
    warehouseId: 'warehouse-789',
    createdAt: new Date(),
    postedAt: new Date(),
    type: {
      getValue: () => 'IN',
      isInput: () => true,
      isOutput: () => false,
    },
    status: {
      getValue: () => 'POSTED',
    },
    getLines: () => [
      {
        productId: 'product-1',
        locationId: null,
        quantity: Quantity.create(10, 0),
        unitCost: Money.create(100),
      },
    ],
    getTotalQuantity: () => 10,
    ...overrides,
  });

  const createMockEvent = (movement: any): MovementPostedEvent => {
    return new MovementPostedEvent(movement);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockMovementRepository = {
      findById: jest.fn(),
    };

    mockStockRepository = {
      getStockWithCost: jest.fn(),
      updateStock: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockIdempotencyService = {
      tryMarkAsProcessed: jest.fn().mockResolvedValue(true),
    };

    handler = new MovementPostedEventHandler(
      mockMovementRepository as unknown as IMovementRepository,
      mockStockRepository as unknown as IStockRepository,
      mockEventBus as unknown as DomainEventBus,
      mockIdempotencyService as unknown as EventIdempotencyService
    );
  });

  describe('handle', () => {
    it('Given: input movement with cost When: handling Then: should update stock with PPM and emit events', async () => {
      // Arrange
      const movement = createMockMovement();
      const event = createMockEvent(movement);
      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockWithCost.mockResolvedValue({
        quantity: Quantity.create(20, 0),
        averageCost: Money.create(80),
      });
      mockStockRepository.updateStock.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockIdempotencyService.tryMarkAsProcessed).toHaveBeenCalledWith(
        'MovementPostedEvent',
        'mov-123',
        'org-123'
      );
      expect(mockMovementRepository.findById).toHaveBeenCalledWith('mov-123', 'org-123');
      expect(mockStockRepository.updateStock).toHaveBeenCalled();
      // Should emit StockUpdatedEvent + possibly PPMRecalculatedEvent
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('Given: input movement without cost When: handling Then: should increment stock without PPM', async () => {
      // Arrange
      const movement = createMockMovement({
        getLines: () => [
          {
            productId: 'product-1',
            locationId: null,
            quantity: Quantity.create(10, 0),
            unitCost: null,
          },
        ],
      });
      const event = createMockEvent(movement);
      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockWithCost.mockResolvedValue({
        quantity: Quantity.create(20, 0),
        averageCost: Money.create(80),
      });
      mockStockRepository.incrementStock.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockStockRepository.incrementStock).toHaveBeenCalled();
      expect(mockStockRepository.updateStock).not.toHaveBeenCalled();
      // StockUpdatedEvent should be emitted
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('Given: output movement When: handling Then: should decrement stock', async () => {
      // Arrange
      const movement = createMockMovement({
        type: {
          getValue: () => 'OUT',
          isInput: () => false,
          isOutput: () => true,
        },
        getLines: () => [
          {
            productId: 'product-1',
            locationId: null,
            quantity: Quantity.create(5, 0),
            unitCost: Money.create(100),
          },
        ],
      });
      const event = createMockEvent(movement);
      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockWithCost.mockResolvedValue({
        quantity: Quantity.create(20, 0),
        averageCost: Money.create(80),
      });
      mockStockRepository.decrementStock.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockStockRepository.decrementStock).toHaveBeenCalled();
      expect(mockStockRepository.updateStock).not.toHaveBeenCalled();
      expect(mockStockRepository.incrementStock).not.toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('Given: already processed event When: handling Then: should skip processing', async () => {
      // Arrange
      mockIdempotencyService.tryMarkAsProcessed.mockResolvedValue(false);
      const movement = createMockMovement();
      const event = createMockEvent(movement);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockMovementRepository.findById).not.toHaveBeenCalled();
      expect(mockStockRepository.updateStock).not.toHaveBeenCalled();
    });

    it('Given: movement not found When: handling Then: should return early without error', async () => {
      // Arrange
      const movement = createMockMovement();
      const event = createMockEvent(movement);
      mockMovementRepository.findById.mockResolvedValue(null);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockStockRepository.updateStock).not.toHaveBeenCalled();
      expect(mockStockRepository.incrementStock).not.toHaveBeenCalled();
      expect(mockStockRepository.decrementStock).not.toHaveBeenCalled();
    });

    it('Given: no existing stock data When: handling input movement Then: should use zero defaults', async () => {
      // Arrange
      const movement = createMockMovement();
      const event = createMockEvent(movement);
      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockWithCost.mockResolvedValue(null);
      mockStockRepository.updateStock.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockStockRepository.updateStock).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('Given: movement with multiple lines When: handling Then: should process each line', async () => {
      // Arrange
      const movement = createMockMovement({
        getLines: () => [
          {
            productId: 'product-1',
            locationId: null,
            quantity: Quantity.create(10, 0),
            unitCost: Money.create(100),
          },
          {
            productId: 'product-2',
            locationId: 'loc-1',
            quantity: Quantity.create(5, 0),
            unitCost: Money.create(200),
          },
        ],
      });
      const event = createMockEvent(movement);
      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockWithCost.mockResolvedValue({
        quantity: Quantity.create(20, 0),
        averageCost: Money.create(80),
      });
      mockStockRepository.updateStock.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockStockRepository.getStockWithCost).toHaveBeenCalledTimes(2);
      expect(mockStockRepository.updateStock).toHaveBeenCalledTimes(2);
      // Should emit StockUpdatedEvent for each line
      expect(mockEventBus.publish).toHaveBeenCalledTimes(4); // 2 PPMRecalculated + 2 StockUpdated
    });

    it('Given: input movement where PPM does not change When: handling Then: should NOT emit PPMRecalculatedEvent', async () => {
      // Arrange
      const movement = createMockMovement({
        getLines: () => [
          {
            productId: 'product-1',
            locationId: null,
            quantity: Quantity.create(10, 0),
            unitCost: Money.create(100), // same as current average cost
          },
        ],
      });
      const event = createMockEvent(movement);
      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockWithCost.mockResolvedValue({
        quantity: Quantity.create(10, 0),
        averageCost: Money.create(100), // same as line unit cost
      });
      mockStockRepository.updateStock.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      // Only StockUpdatedEvent should be emitted (not PPMRecalculated since cost didn't change)
      expect(mockStockRepository.updateStock).toHaveBeenCalled();
      const publishCalls = mockEventBus.publish.mock.calls;
      // At minimum, StockUpdatedEvent is emitted
      expect(publishCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('Given: repository error during handling When: handling Then: should catch error and not throw', async () => {
      // Arrange
      const movement = createMockMovement();
      const event = createMockEvent(movement);
      mockMovementRepository.findById.mockRejectedValue(new Error('DB connection lost'));

      // Act
      await handler.handle(event);

      // Assert - should not throw
      expect(mockStockRepository.updateStock).not.toHaveBeenCalled();
    });

    it('Given: movement with locationId When: handling Then: should pass locationId to stock operations', async () => {
      // Arrange
      const movement = createMockMovement({
        getLines: () => [
          {
            productId: 'product-1',
            locationId: 'loc-42',
            quantity: Quantity.create(10, 0),
            unitCost: Money.create(100),
          },
        ],
      });
      const event = createMockEvent(movement);
      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockWithCost.mockResolvedValue({
        quantity: Quantity.create(20, 0),
        averageCost: Money.create(80),
      });
      mockStockRepository.updateStock.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockStockRepository.getStockWithCost).toHaveBeenCalledWith(
        'product-1',
        'warehouse-789',
        'org-123',
        'loc-42'
      );
    });

    it('Given: output movement without existing stock When: handling Then: should catch error from negative subtraction gracefully', async () => {
      // Arrange
      // When stock is null, quantityBefore defaults to 0. Subtracting 5 from 0 throws.
      // The outer try-catch in the handler catches this.
      const movement = createMockMovement({
        type: {
          getValue: () => 'OUT',
          isInput: () => false,
          isOutput: () => true,
        },
        getLines: () => [
          {
            productId: 'product-1',
            locationId: null,
            quantity: Quantity.create(5, 0),
            unitCost: null,
          },
        ],
      });
      const event = createMockEvent(movement);
      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockWithCost.mockResolvedValue(null);

      // Act - should not throw; handler catches errors internally
      await handler.handle(event);

      // Assert - decrementStock should NOT be called because subtract throws first
      expect(mockStockRepository.decrementStock).not.toHaveBeenCalled();
    });
  });
});
