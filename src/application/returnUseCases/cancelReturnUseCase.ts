import { UnitOfWork } from '@infrastructure/database/unitOfWork.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ReturnValidationService } from '@returns/domain/services/returnValidation.service';
import { RETURN_NOT_FOUND, RETURN_CANCEL_ERROR } from '@shared/constants/error-codes';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnData } from './createReturnUseCase';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface ICancelReturnRequest {
  id: string;
  reason?: string;
  cancelledBy: string;
  orgId: string;
}

export type ICancelReturnResponse = IApiResponseSuccess<IReturnData>;

@Injectable()
export class CancelReturnUseCase {
  private readonly logger = new Logger(CancelReturnUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async execute(
    request: ICancelReturnRequest
  ): Promise<Result<ICancelReturnResponse, DomainError>> {
    this.logger.log('Cancelling return', { returnId: request.id, orgId: request.orgId });

    // Retrieve return
    const returnEntity = await this.returnRepository.findById(request.id, request.orgId);

    if (!returnEntity) {
      return err(new NotFoundError(`Return with ID ${request.id} not found`, RETURN_NOT_FOUND));
    }

    // Validate return can be cancelled
    const validationResult = ReturnValidationService.validateReturnCanBeCancelled(returnEntity);
    if (!validationResult.isValid) {
      return err(
        new BusinessRuleError(
          `Return cannot be cancelled: ${validationResult.errors.join(', ')}`,
          RETURN_CANCEL_ERROR
        )
      );
    }

    const wasConfirmed = returnEntity.status.isConfirmed();
    const isCustomerReturn = returnEntity.type.isCustomerReturn();
    const returnNumber = returnEntity.returnNumber.getValue();

    try {
      if (wasConfirmed && returnEntity.returnMovementId) {
        // CONFIRMED return: reverse all side effects in a single transaction
        await this.unitOfWork.execute(async tx => {
          const cancellationNote = `Reversed by cancellation of ${returnNumber}. Cancelled by: ${request.cancelledBy}. Reason: ${request.reason || 'No reason provided'}`;

          // 1. Get the return movement and its lines to reverse stock
          const returnMovement = await tx.movement.findUnique({
            where: { id: returnEntity.returnMovementId! },
            include: { lines: true },
          });

          if (returnMovement) {
            // 2. Reverse stock adjustments
            for (const line of returnMovement.lines) {
              const quantity = Math.abs(Number(line.quantity));
              const locationId = line.locationId || null;

              if (isCustomerReturn) {
                // Customer return had added stock (IN) → now subtract it back
                // Use GREATEST to prevent negative stock
                await tx.$executeRaw`
                  UPDATE "stock"
                  SET "quantity" = GREATEST("quantity" - ${quantity}, 0)
                  WHERE "productId" = ${line.productId}
                    AND "warehouseId" = ${returnMovement.warehouseId}
                    AND "locationId" IS NOT DISTINCT FROM ${locationId}
                    AND "orgId" = ${returnMovement.orgId}
                `;
              } else {
                // Supplier return had removed stock (OUT) → now add it back
                await tx.$executeRaw`
                  INSERT INTO "stock" ("id", "productId", "warehouseId", "locationId", "orgId", "quantity", "unitCost")
                  VALUES (gen_random_uuid()::TEXT, ${line.productId}, ${returnMovement.warehouseId}, ${locationId}, ${returnMovement.orgId}, ${quantity}, 0)
                  ON CONFLICT ("productId", "warehouseId", "locationId", "orgId")
                  DO UPDATE SET "quantity" = "stock"."quantity" + ${quantity}
                `;
              }
            }

            // 3. Void the return movement (keep it for traceability)
            await tx.movement.update({
              where: { id: returnEntity.returnMovementId! },
              data: {
                status: 'VOID',
                notes: cancellationNote,
              },
            });
          }

          // 4. Revert sale status (customer returns)
          if (isCustomerReturn && returnEntity.saleId) {
            // Check if there are OTHER confirmed (non-cancelled) returns for this sale
            const otherActiveReturns = await tx.return.count({
              where: {
                saleId: returnEntity.saleId,
                status: 'CONFIRMED',
                id: { not: returnEntity.id },
              },
            });

            if (otherActiveReturns === 0) {
              // No other active returns → revert sale from RETURNED
              const sale = await tx.sale.findUnique({
                where: { id: returnEntity.saleId },
                select: { id: true, status: true, completedAt: true, shippedAt: true },
              });

              if (sale && sale.status === 'RETURNED') {
                const previousStatus = sale.completedAt
                  ? 'COMPLETED'
                  : sale.shippedAt
                    ? 'SHIPPED'
                    : 'CONFIRMED';
                await tx.sale.update({
                  where: { id: returnEntity.saleId },
                  data: {
                    status: previousStatus,
                    returnedAt: null,
                    returnedBy: null,
                  },
                });
                this.logger.log(
                  `Sale ${returnEntity.saleId} reverted from RETURNED to ${previousStatus}`
                );
              }
            } else {
              this.logger.log(
                `Sale ${returnEntity.saleId} has ${otherActiveReturns} other active returns, keeping RETURNED status`
              );
            }
          }

          // 5. Revert source movement status (supplier returns)
          if (!isCustomerReturn && returnEntity.sourceMovementId) {
            const sourceMovement = await tx.movement.findUnique({
              where: { id: returnEntity.sourceMovementId },
              select: { id: true, status: true },
            });

            if (sourceMovement && sourceMovement.status === 'RETURNED') {
              await tx.movement.update({
                where: { id: returnEntity.sourceMovementId },
                data: {
                  status: 'POSTED',
                  returnedAt: null,
                  returnedBy: null,
                },
              });
              this.logger.log(
                `Source movement ${returnEntity.sourceMovementId} reverted from RETURNED to POSTED`
              );
            }
          }

          // 6. Cancel the return itself
          await tx.return.update({
            where: { id: returnEntity.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              reason: request.reason || returnEntity.reason.getValue(),
            },
          });
        });

        // Update entity in memory to reflect changes
        returnEntity.cancel(request.reason);
      } else {
        // DRAFT return: just cancel, no side effects
        returnEntity.cancel(request.reason);
        await this.returnRepository.save(returnEntity);
      }

      // Dispatch domain events
      returnEntity.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(returnEntity.domainEvents);
      returnEntity.clearEvents();

      this.logger.log('Return cancelled successfully', {
        returnId: returnEntity.id,
        returnNumber,
        wasConfirmed,
        reversedInventory: wasConfirmed,
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
        message: wasConfirmed
          ? 'Return cancelled and inventory adjustments reversed successfully'
          : 'Return cancelled successfully',
        data: {
          id: returnEntity.id,
          returnNumber: returnEntity.returnNumber.getValue(),
          status: returnEntity.status.getValue(),
          type: returnEntity.type.getValue(),
          reason: returnEntity.reason.getValue(),
          warehouseId: returnEntity.warehouseId,
          saleId: returnEntity.saleId,
          sourceMovementId: returnEntity.sourceMovementId,
          returnMovementId: returnEntity.returnMovementId,
          note: returnEntity.note,
          confirmedAt: returnEntity.confirmedAt,
          cancelledAt: returnEntity.cancelledAt,
          createdBy: returnEntity.createdBy,
          orgId: returnEntity.orgId,
          createdAt: returnEntity.createdAt,
          updatedAt: returnEntity.updatedAt,
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
      this.logger.error('Failed to cancel return', {
        returnId: request.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to cancel return',
          RETURN_CANCEL_ERROR
        )
      );
    }
  }
}
