/* eslint-disable @typescript-eslint/no-explicit-any */
import { MovementPostedEventHandler } from '@application/eventHandlers/movementPostedEventHandler';
import { Money, Quantity } from '@inventory/stock';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { MovementPostedEvent } from '@movement/domain/events/movementPosted.event';
import { PPMRecalculatedEvent } from '@movement/domain/events/ppmRecalculated.event';
import { StockUpdatedEvent } from '@movement/domain/events/stockUpdated.event';
import { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { DomainEventBus, EventIdempotencyService } from '@shared/domain/events';
import { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

describe('PPM Calculation Integration Tests', () => {
  let handler: MovementPostedEventHandler;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockStockRepository: jest.Mocked<IStockRepository>;
  let mockIdempotencyService: jest.Mocked<EventIdempotencyService>;
  let eventBus: DomainEventBus;

  const testOrgId = 'test-org-123';
  const testWarehouseId = 'warehouse-123';
  const testProductId = 'product-123';
  const testLocationId = 'location-123';
  const testUserId = 'user-123';

  beforeEach(() => {
    eventBus = new DomainEventBus();

    mockMovementRepository = {
      findById: jest.fn(),
    } as any;

    mockStockRepository = {
      getStockWithCost: jest.fn(),
      updateStock: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
    } as any;

    mockIdempotencyService = {
      tryMarkAsProcessed: jest.fn().mockResolvedValue(true),
    } as any;

    handler = new MovementPostedEventHandler(
      mockMovementRepository,
      mockStockRepository,
      eventBus,
      mockIdempotencyService
    );
  });

  describe('PPM Calculation for Input Movements', () => {
    it('Given: input movement with cost When: handling MovementPosted event Then: should calculate PPM and update stock', async () => {
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
      movement.post();

      const event = new MovementPostedEvent(movement);

      // Mock current stock: 20 units at $50 average cost
      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockWithCost.mockResolvedValue({
        quantity: Quantity.create(20),
        averageCost: Money.create(50),
      });

      const publishedEvents: any[] = [];
      jest.spyOn(eventBus, 'publish').mockImplementation(async (event: any) => {
        publishedEvents.push(event);
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockStockRepository.getStockWithCost).toHaveBeenCalledWith(
        testProductId,
        testWarehouseId,
        testOrgId,
        testLocationId
      );

      // Verify PPM calculation: (20 * 50 + 10 * 100) / 30 = 66.67
      expect(mockStockRepository.updateStock).toHaveBeenCalledWith(
        testProductId,
        testWarehouseId,
        testOrgId,
        expect.any(Quantity),
        expect.any(Money),
        testLocationId
      );

      // Verify events were published
      expect(publishedEvents.length).toBeGreaterThan(0);
      const ppmEvent = publishedEvents.find(e => e instanceof PPMRecalculatedEvent);
      const stockEvent = publishedEvents.find(e => e instanceof StockUpdatedEvent);

      expect(ppmEvent).toBeDefined();
      expect(stockEvent).toBeDefined();
    });

    it('Given: multiple input movements When: handling events Then: should recalculate PPM correctly', async () => {
      // Arrange - First movement: 10 units at $100
      const movement1 = Movement.create(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: testWarehouseId,
          createdBy: testUserId,
        },
        testOrgId
      );

      const line1 = MovementLine.create(
        {
          productId: testProductId,
          locationId: testLocationId,
          quantity: Quantity.create(10),
          unitCost: Money.create(100),
          currency: 'COP',
        },
        testOrgId
      );

      movement1.addLine(line1);
      movement1.post();

      const event1 = new MovementPostedEvent(movement1);

      // Initial stock: 0 units
      mockMovementRepository.findById.mockResolvedValue(movement1);
      mockStockRepository.getStockWithCost.mockResolvedValue({
        quantity: Quantity.create(0),
        averageCost: Money.create(0),
      });

      // Act - First movement
      await handler.handle(event1);

      // Assert - After first movement: 10 units at $100
      expect(mockStockRepository.updateStock).toHaveBeenCalledWith(
        testProductId,
        testWarehouseId,
        testOrgId,
        Quantity.create(10),
        Money.create(100),
        testLocationId
      );

      // Second movement: 20 units at $50
      const movement2 = Movement.create(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: testWarehouseId,
          createdBy: testUserId,
        },
        testOrgId
      );

      const line2 = MovementLine.create(
        {
          productId: testProductId,
          locationId: testLocationId,
          quantity: Quantity.create(20),
          unitCost: Money.create(50),
          currency: 'COP',
        },
        testOrgId
      );

      movement2.addLine(line2);
      movement2.post();

      const event2 = new MovementPostedEvent(movement2);

      // Current stock after first movement: 10 units at $100
      mockMovementRepository.findById.mockResolvedValue(movement2);
      mockStockRepository.getStockWithCost.mockResolvedValue({
        quantity: Quantity.create(10),
        averageCost: Money.create(100),
      });

      // Act - Second movement
      await handler.handle(event2);

      // Assert - After second movement: 30 units at $66.67
      // (10 * 100 + 20 * 50) / 30 = 2000 / 30 = 66.67
      expect(mockStockRepository.updateStock).toHaveBeenCalledWith(
        testProductId,
        testWarehouseId,
        testOrgId,
        Quantity.create(30),
        expect.objectContaining({
          props: expect.objectContaining({
            value: expect.objectContaining({
              amount: expect.closeTo(66.67, 2),
            }),
          }),
        }),
        testLocationId
      );
    });
  });

  describe('Output Movements - No PPM Change', () => {
    it('Given: output movement When: handling MovementPosted event Then: should decrement stock without changing PPM', async () => {
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
          quantity: Quantity.create(5),
          currency: 'COP',
        },
        testOrgId
      );

      movement.addLine(line);
      movement.post();

      const event = new MovementPostedEvent(movement);

      // Current stock: 20 units at $50 average cost
      mockMovementRepository.findById.mockResolvedValue(movement);
      mockStockRepository.getStockWithCost.mockResolvedValue({
        quantity: Quantity.create(20),
        averageCost: Money.create(50),
      });

      // Act
      await handler.handle(event);

      // Assert - Should decrement stock, not update PPM
      expect(mockStockRepository.decrementStock).toHaveBeenCalledWith(
        testProductId,
        testWarehouseId,
        testOrgId,
        Quantity.create(5),
        testLocationId
      );

      expect(mockStockRepository.updateStock).not.toHaveBeenCalled();
    });
  });
});
