import { UnitOfWork } from '@infrastructure/database/unitOfWork.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InventoryInGeneratedEvent } from '@returns/domain/events/inventoryInGenerated.event';
import { InventoryOutGeneratedEvent } from '@returns/domain/events/inventoryOutGenerated.event';
import { InventoryIntegrationService } from '@returns/domain/services/inventoryIntegration.service';
import { ReturnValidationService } from '@returns/domain/services/returnValidation.service';
import {
  BusinessRuleError,
  DomainError,
  InsufficientStockError,
  NotFoundError,
  Result,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnData } from './createReturnUseCase';
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface IConfirmReturnRequest {
  id: string;
  orgId: string;
}

export type IConfirmReturnResponse = IApiResponseSuccess<
  IReturnData & { returnMovementId: string }
>;

@Injectable()
export class ConfirmReturnUseCase {
  private readonly logger = new Logger(ConfirmReturnUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async execute(
    request: IConfirmReturnRequest
  ): Promise<Result<IConfirmReturnResponse, DomainError>> {
    this.logger.log('Confirming return', { returnId: request.id, orgId: request.orgId });

    // Retrieve return
    const returnEntity = await this.returnRepository.findById(request.id, request.orgId);

    if (!returnEntity) {
      return err(new NotFoundError(`Return with ID ${request.id} not found`));
    }

    // Validate return can be confirmed
    const validationResult = ReturnValidationService.validateReturnCanBeConfirmed(returnEntity);
    if (!validationResult.isValid) {
      return err(
        new BusinessRuleError(`Return cannot be confirmed: ${validationResult.errors.join(', ')}`)
      );
    }

    // Generate movement from return
    let movement;
    if (returnEntity.type.isCustomerReturn()) {
      movement = InventoryIntegrationService.generateMovementFromCustomerReturn(returnEntity);
    } else {
      movement = InventoryIntegrationService.generateMovementFromSupplierReturn(returnEntity);
    }

    const isCustomerReturn = returnEntity.type.isCustomerReturn();

    try {
      // Execute all operations in a single atomic transaction
      const { confirmedReturn, postedMovement } = await this.unitOfWork.execute(async tx => {
        // 1. Validate return quantity WITH LOCK to prevent race conditions
        // This must be done INSIDE the transaction to avoid TOCTOU vulnerabilities
        if (isCustomerReturn && returnEntity.saleId) {
          // Lock the sale row to prevent concurrent returns from exceeding sold quantities
          await tx.$executeRaw`
            SELECT id FROM "sales" WHERE id = ${returnEntity.saleId} FOR UPDATE
          `;

          // Get all existing returns for this sale (excluding cancelled ones)
          const existingReturns = await tx.return.findMany({
            where: {
              saleId: returnEntity.saleId,
              status: { not: 'CANCELLED' },
              id: { not: returnEntity.id }, // Exclude current return
            },
            include: { lines: true },
          });

          // Get the sale lines
          const sale = await tx.sale.findUnique({
            where: { id: returnEntity.saleId },
            include: { lines: true },
          });

          if (!sale) {
            throw new BusinessRuleError(`Sale with ID ${returnEntity.saleId} not found`);
          }

          // Calculate total already returned per product
          const alreadyReturnedByProduct = new Map<string, number>();
          for (const existingReturn of existingReturns) {
            for (const line of existingReturn.lines) {
              const current = alreadyReturnedByProduct.get(line.productId) || 0;
              alreadyReturnedByProduct.set(line.productId, current + Number(line.quantity));
            }
          }

          // Validate this return doesn't exceed remaining quantities
          for (const returnLine of returnEntity.getLines()) {
            const saleLine = sale.lines.find(l => l.productId === returnLine.productId);
            if (!saleLine) {
              throw new BusinessRuleError(
                `Product ${returnLine.productId} was not sold in sale ${returnEntity.saleId}`
              );
            }

            const soldQuantity = Number(saleLine.quantity);
            const alreadyReturned = alreadyReturnedByProduct.get(returnLine.productId) || 0;
            const thisReturnQty = returnLine.quantity.getNumericValue();

            if (alreadyReturned + thisReturnQty > soldQuantity) {
              throw new BusinessRuleError(
                `Cannot return ${thisReturnQty} units of product ${returnLine.productId}. ` +
                  `Sold: ${soldQuantity}, Already returned: ${alreadyReturned}, ` +
                  `Remaining: ${soldQuantity - alreadyReturned}`
              );
            }
          }
        } else if (!isCustomerReturn && returnEntity.sourceMovementId) {
          // Lock the source movement for supplier returns
          await tx.$executeRaw`
            SELECT id FROM "movements" WHERE id = ${returnEntity.sourceMovementId} FOR UPDATE
          `;

          // Validate supplier return quantity (similar logic can be implemented here)
          const quantityValidation = await ReturnValidationService.validateSupplierReturnQuantity(
            returnEntity,
            this.movementRepository
          );
          if (!quantityValidation.isValid) {
            throw new BusinessRuleError(
              `Invalid return quantities: ${quantityValidation.errors.join(', ')}`
            );
          }
        }

        // 2. Create and post movement atomically
        const movementData = {
          id: movement.id,
          type: movement.type.getValue(),
          status: 'POSTED',
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

        // 3. Create movement lines
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

        // 4. Update stock atomically for each line
        for (const line of movementLines) {
          const quantityValue = Math.round(line.quantity.getNumericValue());
          const locationIdValue = line.locationId || null;

          if (isCustomerReturn) {
            // Customer return = IN movement = increment stock
            await tx.$executeRaw`
              INSERT INTO "stock" ("id", "productId", "warehouseId", "locationId", "orgId", "quantity", "unitCost")
              VALUES (gen_random_uuid()::TEXT, ${line.productId}, ${movement.warehouseId}, ${locationIdValue}, ${movement.orgId}, ${quantityValue}, 0)
              ON CONFLICT ("productId", "warehouseId", "locationId", "orgId")
              DO UPDATE SET "quantity" = "stock"."quantity" + ${quantityValue}
            `;
          } else {
            // Supplier return = OUT movement = decrement stock
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
              throw new InsufficientStockError(
                line.productId,
                movement.warehouseId,
                quantityValue,
                undefined,
                line.locationId
              );
            }
          }
        }

        // 5. Confirm return with movement ID
        const updatedReturn = await tx.return.update({
          where: { id: returnEntity.id },
          data: {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            returnMovementId: savedMovement.id,
          },
          include: { lines: true },
        });

        return {
          confirmedReturn: updatedReturn,
          postedMovement: savedMovement,
        };
      });

      // Dispatch domain events AFTER successful transaction
      returnEntity.confirm(postedMovement.id);
      returnEntity.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(returnEntity.domainEvents);
      returnEntity.clearEvents();

      // Dispatch inventory event
      let inventoryEvent;
      if (isCustomerReturn) {
        inventoryEvent = new InventoryInGeneratedEvent(
          confirmedReturn.id,
          postedMovement.id,
          confirmedReturn.orgId
        );
      } else {
        inventoryEvent = new InventoryOutGeneratedEvent(
          confirmedReturn.id,
          postedMovement.id,
          confirmedReturn.orgId
        );
      }
      inventoryEvent.markForDispatch();
      await this.eventDispatcher.dispatchEvents([inventoryEvent]);

      this.logger.log('Return confirmed successfully', {
        returnId: confirmedReturn.id,
        returnNumber: confirmedReturn.returnNumber,
        movementId: postedMovement.id,
      });

      const totalAmount = returnEntity.getTotalAmount();
      const lines = returnEntity.getLines().map(line => {
        const lineTotal = line.getTotalPrice();
        return {
          id: line.id,
          productId: line.productId,
          locationId: line.locationId,
          quantity: line.quantity.getNumericValue(),
          originalSalePrice: line.originalSalePrice?.getAmount(),
          originalUnitCost: line.originalUnitCost?.getAmount(),
          currency: line.currency,
          totalPrice: lineTotal?.getAmount() || 0,
        };
      });

      return ok({
        success: true,
        message: 'Return confirmed successfully',
        data: {
          id: confirmedReturn.id,
          returnNumber: confirmedReturn.returnNumber,
          status: confirmedReturn.status,
          type: confirmedReturn.type,
          reason: confirmedReturn.reason,
          warehouseId: confirmedReturn.warehouseId,
          saleId: confirmedReturn.saleId || undefined,
          sourceMovementId: confirmedReturn.sourceMovementId || undefined,
          returnMovementId: confirmedReturn.returnMovementId!,
          note: confirmedReturn.note || undefined,
          confirmedAt: confirmedReturn.confirmedAt || undefined,
          cancelledAt: confirmedReturn.cancelledAt || undefined,
          createdBy: confirmedReturn.createdBy,
          orgId: confirmedReturn.orgId,
          createdAt: confirmedReturn.createdAt,
          updatedAt: confirmedReturn.updatedAt,
          totalAmount: totalAmount?.getAmount(),
          currency: totalAmount?.getCurrency(),
          lines,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof BusinessRuleError) {
        return err(error);
      }
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
