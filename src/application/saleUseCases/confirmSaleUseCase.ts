import { UnitOfWork } from '@infrastructure/database/unitOfWork.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InventoryOutGeneratedEvent } from '@sale/domain/events/inventoryOutGenerated.event';
import { InventoryIntegrationService } from '@sale/domain/services/inventoryIntegration.service';
import { SaleValidationService } from '@sale/domain/services/saleValidation.service';
import { SALE_NOT_FOUND, SALE_INSUFFICIENT_STOCK } from '@shared/constants/error-codes';
import {
  BusinessRuleError,
  DomainError,
  err,
  InsufficientStockError,
  NotFoundError,
  ok,
  Result,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISaleData } from './createSaleUseCase';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

export interface IConfirmSaleRequest {
  id: string;
  orgId: string;
  userId?: string;
}

export type IConfirmSaleResponse = IApiResponseSuccess<ISaleData & { movementId: string }>;

@Injectable()
export class ConfirmSaleUseCase {
  private readonly logger = new Logger(ConfirmSaleUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async execute(request: IConfirmSaleRequest): Promise<Result<IConfirmSaleResponse, DomainError>> {
    this.logger.log('Confirming sale', { saleId: request.id, orgId: request.orgId });

    // Retrieve sale
    const sale = await this.saleRepository.findById(request.id, request.orgId);

    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.id} not found`, SALE_NOT_FOUND));
    }

    // Validate sale can be confirmed
    const validationResult = SaleValidationService.validateSaleCanBeConfirmed(sale);
    if (!validationResult.isValid) {
      return err(
        new BusinessRuleError(`Sale cannot be confirmed: ${validationResult.errors.join(', ')}`)
      );
    }

    // Validate stock availability (pre-check before transaction)
    const stockValidation = await SaleValidationService.validateStockAvailability(
      sale,
      this.stockRepository
    );
    if (!stockValidation.isValid) {
      return err(
        new BusinessRuleError(
          `Insufficient stock: ${stockValidation.errors.join(', ')}`,
          SALE_INSUFFICIENT_STOCK
        )
      );
    }

    // Generate movement from sale
    const movement = InventoryIntegrationService.generateMovementFromSale(sale);

    try {
      // Execute all operations in a single atomic transaction
      const { confirmedSale, postedMovement } = await this.unitOfWork.execute(async tx => {
        // 1. Create and post movement atomically
        const movementData = {
          id: movement.id,
          type: movement.type.getValue(),
          status: 'POSTED', // Create directly as POSTED
          warehouseId: movement.warehouseId,
          reference: movement.reference || null,
          reason: movement.reason || null,
          notes: movement.note || null,
          postedAt: new Date(),
          createdBy: movement.createdBy,
          orgId: movement.orgId,
        };

        const savedMovement = await tx.movement.create({
          data: movementData,
        });

        // 2. Create movement lines
        const movementLines = movement.getLines();
        if (movementLines.length > 0) {
          await tx.movementLine.createMany({
            data: movementLines.map(line => ({
              id: line.id,
              movementId: savedMovement.id,
              productId: line.productId,
              locationId: line.locationId || null,
              quantity: Math.round(line.quantity.getNumericValue()),
              unitCost: line.unitCost?.getAmount() || null,
              currency: line.currency,
              orgId: movement.orgId,
            })),
          });
        }

        // 3. Update stock atomically for each line (decrement for OUT movement)
        for (const line of movementLines) {
          const quantityValue = Math.round(line.quantity.getNumericValue());
          const locationIdValue = line.locationId || null;

          const result = await tx.$executeRaw`
            UPDATE "stock"
            SET "quantity" = "quantity" - ${quantityValue}
            WHERE "productId" = ${line.productId}
              AND "warehouseId" = ${movement.warehouseId}
              AND "locationId" IS NOT DISTINCT FROM ${locationIdValue}
              AND "orgId" = ${movement.orgId}
              AND "quantity" >= ${quantityValue}
          `;

          if (result === 0) {
            // Stock insufficient - transaction will be rolled back
            throw new InsufficientStockError(
              line.productId,
              movement.warehouseId,
              quantityValue,
              undefined,
              line.locationId
            );
          }
        }

        // 4. Confirm sale with movement ID
        const updatedSale = await tx.sale.update({
          where: { id: sale.id },
          data: {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            confirmedBy: request.userId || null,
            movementId: savedMovement.id,
          },
          include: { lines: true },
        });

        return {
          confirmedSale: updatedSale,
          postedMovement: savedMovement,
        };
      });

      // Dispatch domain events AFTER successful transaction
      sale.confirm(postedMovement.id, request.userId);
      sale.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(sale.domainEvents);
      sale.clearEvents();

      // Dispatch inventory out generated event
      const inventoryEvent = new InventoryOutGeneratedEvent(
        confirmedSale.id,
        postedMovement.id,
        confirmedSale.orgId
      );
      inventoryEvent.markForDispatch();
      await this.eventDispatcher.dispatchEvents([inventoryEvent]);

      this.logger.log('Sale confirmed successfully', {
        saleId: confirmedSale.id,
        saleNumber: confirmedSale.saleNumber,
        movementId: postedMovement.id,
      });

      // Calculate total from sale lines
      const totalAmount = sale.getTotalAmount();

      return ok({
        success: true,
        message: 'Sale confirmed successfully',
        data: {
          id: confirmedSale.id,
          saleNumber: confirmedSale.saleNumber,
          status: confirmedSale.status,
          warehouseId: confirmedSale.warehouseId,
          customerReference: confirmedSale.customerReference || undefined,
          externalReference: confirmedSale.externalReference || undefined,
          note: confirmedSale.note || undefined,
          confirmedAt: confirmedSale.confirmedAt || undefined,
          confirmedBy: confirmedSale.confirmedBy || undefined,
          cancelledAt: confirmedSale.cancelledAt || undefined,
          cancelledBy: confirmedSale.cancelledBy || undefined,
          movementId: confirmedSale.movementId!,
          createdBy: confirmedSale.createdBy,
          orgId: confirmedSale.orgId,
          createdAt: confirmedSale.createdAt,
          updatedAt: confirmedSale.updatedAt,
          totalAmount: totalAmount.getAmount(),
          currency: totalAmount.getCurrency(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return err(
          new BusinessRuleError(
            `Insufficient stock for product ${error.productId}: requested ${error.requestedQuantity}, available ${error.availableQuantity ?? 'unknown'}`
          )
        );
      }
      throw error;
    }
  }
}
