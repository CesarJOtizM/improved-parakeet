import { Money, Quantity } from '@inventory/stock';
import { MovementPostedEvent } from '@movement/domain/events/movementPosted.event';
import { PPMRecalculatedEvent } from '@movement/domain/events/ppmRecalculated.event';
import { StockUpdatedEvent } from '@movement/domain/events/stockUpdated.event';
import { calculatePPM } from '@movement/domain/services/ppmService';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { DomainEventBus, EventIdempotencyService } from '@shared/domain/events';
import { IDomainEventHandler } from '@shared/domain/events/domainEventBus.service';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

@Injectable()
export class MovementPostedEventHandler implements IDomainEventHandler<MovementPostedEvent> {
  private readonly logger = new Logger(MovementPostedEventHandler.name);

  constructor(
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository,
    private readonly eventBus: DomainEventBus,
    private readonly idempotencyService: EventIdempotencyService
  ) {}

  async handle(event: MovementPostedEvent): Promise<void> {
    this.logger.log('Handling MovementPosted event', {
      movementId: event.movementId,
      type: event.type,
      warehouseId: event.warehouseId,
      orgId: event.orgId,
    });

    // Check idempotency - prevent duplicate processing
    const shouldProcess = await this.idempotencyService.tryMarkAsProcessed(
      'MovementPostedEvent',
      event.movementId,
      event.orgId
    );

    if (!shouldProcess) {
      this.logger.warn('MovementPosted event already processed, skipping', {
        movementId: event.movementId,
      });
      return;
    }

    try {
      // Retrieve the full movement entity
      const movement = await this.movementRepository.findById(event.movementId, event.orgId);

      if (!movement) {
        this.logger.warn('Movement not found for event', { movementId: event.movementId });
        return;
      }

      const lines = movement.getLines();
      const warehouseId = movement.warehouseId;
      const orgId = movement.orgId;

      // Process each line
      for (const line of lines) {
        const productId = line.productId;
        const locationId = line.locationId;
        const lineQuantity = line.quantity;
        const lineUnitCost = line.unitCost;

        // Get current stock
        const currentStockData = await this.stockRepository.getStockWithCost(
          productId,
          warehouseId,
          orgId,
          locationId
        );

        const quantityBefore = currentStockData?.quantity || Quantity.create(0);
        const currentAverageCost = currentStockData?.averageCost || Money.create(0);

        let quantityAfter: Quantity = quantityBefore;
        let newAverageCost: Money = currentAverageCost;

        // Process based on movement type
        if (movement.type.isInput()) {
          // Input movement: increment stock and calculate PPM if cost is provided
          if (lineUnitCost) {
            // Calculate new PPM using pure function
            const ppmResult = calculatePPM(
              quantityBefore,
              currentAverageCost,
              lineQuantity,
              lineUnitCost
            );

            newAverageCost = ppmResult.newAverageCost;
            quantityAfter = ppmResult.totalQuantity;

            // Update stock with new quantity and average cost
            await this.stockRepository.updateStock(
              productId,
              warehouseId,
              orgId,
              quantityAfter,
              newAverageCost,
              locationId
            );

            // Emit PPMRecalculatedEvent if cost changed
            if (currentAverageCost.getAmount() !== newAverageCost.getAmount()) {
              const ppmEvent = new PPMRecalculatedEvent(
                productId,
                warehouseId,
                currentAverageCost,
                newAverageCost,
                quantityAfter,
                orgId,
                new Date()
              );
              await this.eventBus.publish(ppmEvent);
            }
          } else {
            // Input without cost: just increment quantity
            quantityAfter = quantityBefore.add(lineQuantity);
            await this.stockRepository.incrementStock(
              productId,
              warehouseId,
              orgId,
              lineQuantity,
              locationId
            );
          }
        } else if (movement.type.isOutput()) {
          // Output movement: decrement stock (PPM doesn't change)
          quantityAfter = quantityBefore.subtract(lineQuantity);
          await this.stockRepository.decrementStock(
            productId,
            warehouseId,
            orgId,
            lineQuantity,
            locationId
          );
        }

        // Emit StockUpdatedEvent
        const stockUpdatedEvent = new StockUpdatedEvent(
          productId,
          warehouseId,
          locationId,
          quantityBefore,
          quantityAfter,
          orgId,
          new Date()
        );
        await this.eventBus.publish(stockUpdatedEvent);

        this.logger.log('Stock updated for movement line', {
          productId,
          locationId,
          quantityBefore: quantityBefore.getNumericValue(),
          quantityAfter: quantityAfter.getNumericValue(),
          averageCost: newAverageCost.getAmount(),
        });
      }

      this.logger.log('MovementPosted event handled successfully', {
        movementId: event.movementId,
      });
    } catch (error) {
      this.logger.error('Error handling MovementPosted event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        movementId: event.movementId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't throw - we don't want event handling failures to break the main flow
    }
  }
}
