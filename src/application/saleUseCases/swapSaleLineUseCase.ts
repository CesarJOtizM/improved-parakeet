import { UnitOfWork } from '@infrastructure/database/unitOfWork.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SaleLineSwappedEvent } from '@sale/domain/events/saleLineSwapped.event';
import { SaleValidationService } from '@sale/domain/services/saleValidation.service';
import {
  BusinessRuleError,
  DomainError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
  err,
  ok,
  Result,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

export interface ISwapSaleLineRequest {
  saleId: string;
  lineId: string;
  replacementProductId: string;
  swapQuantity: number;
  sourceWarehouseId: string;
  pricingStrategy: 'KEEP_ORIGINAL' | 'NEW_PRICE';
  newSalePrice?: number;
  currency?: string;
  reason?: string;
  performedBy: string;
  orgId: string;
}

export interface ISwapSaleLineData {
  swapId: string;
  saleId: string;
  originalProductId: string;
  replacementProductId: string;
  swapQuantity: number;
  originalSalePrice: number;
  replacementSalePrice: number;
  pricingStrategy: string;
  isCrossWarehouse: boolean;
  returnMovementId: string;
  deductMovementId: string;
  newLineId?: string;
  isPartial: boolean;
}

export type ISwapSaleLineResponse = IApiResponseSuccess<ISwapSaleLineData>;

@Injectable()
export class SwapSaleLineUseCase {
  private readonly logger = new Logger(SwapSaleLineUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async execute(
    request: ISwapSaleLineRequest
  ): Promise<Result<ISwapSaleLineResponse, DomainError>> {
    this.logger.log('Swapping sale line', {
      saleId: request.saleId,
      lineId: request.lineId,
      replacementProductId: request.replacementProductId,
      swapQuantity: request.swapQuantity,
      orgId: request.orgId,
    });

    // 1. Validate pricing strategy consistency
    if (request.pricingStrategy === 'NEW_PRICE' && !request.newSalePrice) {
      return err(new ValidationError('newSalePrice is required when pricingStrategy is NEW_PRICE'));
    }

    // 2. Load sale with lines
    const sale = await this.saleRepository.findById(request.saleId, request.orgId);
    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.saleId} not found`));
    }

    // 3. Validate sale can swap line
    const validation = SaleValidationService.validateSaleCanSwapLine(
      sale,
      request.lineId,
      request.swapQuantity
    );
    if (!validation.isValid) {
      return err(new BusinessRuleError(`Cannot swap line: ${validation.errors.join(', ')}`));
    }

    // 4. Pre-check stock availability for replacement product
    const availableStock = await this.stockRepository.getStockQuantity(
      request.replacementProductId,
      request.sourceWarehouseId,
      request.orgId
    );
    const swapQtyRounded = Math.round(request.swapQuantity);
    if (availableStock.getNumericValue() < swapQtyRounded) {
      return err(
        new BusinessRuleError(
          `Insufficient stock for replacement product ${request.replacementProductId}: available ${availableStock.getNumericValue()}, requested ${swapQtyRounded}`
        )
      );
    }

    // Get original line data before transaction
    const originalLine = sale.getLines().find(l => l.id === request.lineId)!;
    const originalProductId = originalLine.productId;
    const originalQuantity = originalLine.quantity.getNumericValue();
    const originalSalePrice = originalLine.salePrice.getAmount();
    const originalCurrency = originalLine.salePrice.getCurrency();
    const originalWarehouseId = sale.warehouseId;
    const isCrossWarehouse = request.sourceWarehouseId !== originalWarehouseId;

    // Determine replacement sale price
    const replacementSalePrice =
      request.pricingStrategy === 'NEW_PRICE' ? request.newSalePrice! : originalSalePrice;
    const replacementCurrency = request.currency || originalCurrency;

    const isPartial = request.swapQuantity < originalQuantity;

    try {
      // 5. Execute atomic transaction
      const result = await this.unitOfWork.execute(async tx => {
        // a) Return original product stock to sale's warehouse
        await tx.$executeRaw`
          UPDATE "stock"
          SET "quantity" = "quantity" + ${swapQtyRounded}
          WHERE "productId" = ${originalProductId}
            AND "warehouseId" = ${originalWarehouseId}
            AND "locationId" IS NULL
            AND "orgId" = ${request.orgId}
        `;

        // If no stock row exists for return, create it
        await tx.$executeRaw`
          INSERT INTO "stock" ("id", "productId", "warehouseId", "quantity", "unitCost", "orgId")
          SELECT gen_random_uuid(), ${originalProductId}, ${originalWarehouseId}, ${swapQtyRounded}, 0, ${request.orgId}
          WHERE NOT EXISTS (
            SELECT 1 FROM "stock"
            WHERE "productId" = ${originalProductId}
              AND "warehouseId" = ${originalWarehouseId}
              AND "locationId" IS NULL
              AND "orgId" = ${request.orgId}
          )
        `;
        // If we inserted a new row, we need to correct — the UPDATE above would have affected 0 rows
        // Actually the UPDATE runs first; if 0 rows affected, the INSERT creates the row with swapQtyRounded

        // b) Deduct replacement product stock from source warehouse
        const deductResult = await tx.$executeRaw`
          UPDATE "stock"
          SET "quantity" = "quantity" - ${swapQtyRounded}
          WHERE "productId" = ${request.replacementProductId}
            AND "warehouseId" = ${request.sourceWarehouseId}
            AND "locationId" IS NULL
            AND "orgId" = ${request.orgId}
            AND "quantity" >= ${swapQtyRounded}
        `;

        if (deductResult === 0) {
          throw new InsufficientStockError(
            request.replacementProductId,
            request.sourceWarehouseId,
            swapQtyRounded
          );
        }

        // c) Create ADJUST_IN movement (return of original product)
        const returnMovement = await tx.movement.create({
          data: {
            type: 'ADJUSTMENT',
            status: 'POSTED',
            warehouseId: originalWarehouseId,
            reference: `SWAP-RETURN-${sale.saleNumber.getValue()}`,
            reason: 'SWAP',
            notes: request.reason || `Product swap: return of ${originalProductId}`,
            postedAt: new Date(),
            createdBy: request.performedBy,
            orgId: request.orgId,
          },
        });

        await tx.movementLine.create({
          data: {
            movementId: returnMovement.id,
            productId: originalProductId,
            quantity: swapQtyRounded,
            unitCost: originalSalePrice,
            currency: originalCurrency,
            orgId: request.orgId,
          },
        });

        // d) Create ADJUST_OUT movement (deduction of replacement product)
        const deductMovement = await tx.movement.create({
          data: {
            type: 'ADJUSTMENT',
            status: 'POSTED',
            warehouseId: request.sourceWarehouseId,
            reference: `SWAP-DEDUCT-${sale.saleNumber.getValue()}`,
            reason: 'SWAP',
            notes: request.reason || `Product swap: deduction of ${request.replacementProductId}`,
            postedAt: new Date(),
            createdBy: request.performedBy,
            orgId: request.orgId,
          },
        });

        await tx.movementLine.create({
          data: {
            movementId: deductMovement.id,
            productId: request.replacementProductId,
            quantity: swapQtyRounded,
            unitCost: replacementSalePrice,
            currency: replacementCurrency,
            orgId: request.orgId,
          },
        });

        // e) Update sale lines
        let newLineId: string | undefined;

        if (isPartial) {
          // Partial swap: reduce original line quantity + create new line
          const remainingQty = originalQuantity - request.swapQuantity;
          await tx.saleLine.update({
            where: { id: request.lineId },
            data: { quantity: remainingQty },
          });

          const newLine = await tx.saleLine.create({
            data: {
              saleId: request.saleId,
              productId: request.replacementProductId,
              quantity: request.swapQuantity,
              salePrice: replacementSalePrice,
              currency: replacementCurrency,
              orgId: request.orgId,
            },
          });
          newLineId = newLine.id;
        } else {
          // Full swap: update existing line with replacement product
          await tx.saleLine.update({
            where: { id: request.lineId },
            data: {
              productId: request.replacementProductId,
              quantity: request.swapQuantity,
              salePrice: replacementSalePrice,
              currency: replacementCurrency,
            },
          });
        }

        // f) Create SaleLineSwap record
        const swap = await tx.saleLineSwap.create({
          data: {
            saleId: request.saleId,
            originalLineId: request.lineId,
            newLineId: newLineId || null,
            originalProductId,
            originalQuantity,
            originalSalePrice,
            originalCurrency,
            replacementProductId: request.replacementProductId,
            replacementQuantity: request.swapQuantity,
            replacementSalePrice,
            replacementCurrency,
            originalWarehouseId,
            sourceWarehouseId: request.sourceWarehouseId,
            isCrossWarehouse,
            returnMovementId: returnMovement.id,
            deductMovementId: deductMovement.id,
            pricingStrategy: request.pricingStrategy,
            reason: request.reason || null,
            performedBy: request.performedBy,
            orgId: request.orgId,
          },
        });

        return {
          swapId: swap.id,
          returnMovementId: returnMovement.id,
          deductMovementId: deductMovement.id,
          newLineId,
        };
      });

      // 6. Dispatch domain event post-commit
      const event = new SaleLineSwappedEvent({
        saleId: request.saleId,
        saleNumber: sale.saleNumber.getValue(),
        orgId: request.orgId,
        warehouseId: originalWarehouseId,
        originalLineId: request.lineId,
        originalProductId,
        replacementProductId: request.replacementProductId,
        swapQuantity: request.swapQuantity,
        sourceWarehouseId: request.sourceWarehouseId,
        swapId: result.swapId,
        performedBy: request.performedBy,
      });
      event.markForDispatch();
      await this.eventDispatcher.dispatchEvents([event]);

      this.logger.log('Sale line swapped successfully', {
        swapId: result.swapId,
        saleId: request.saleId,
        isPartial,
      });

      return ok({
        success: true,
        message: 'Sale line swapped successfully',
        data: {
          swapId: result.swapId,
          saleId: request.saleId,
          originalProductId,
          replacementProductId: request.replacementProductId,
          swapQuantity: request.swapQuantity,
          originalSalePrice,
          replacementSalePrice,
          pricingStrategy: request.pricingStrategy,
          isCrossWarehouse,
          returnMovementId: result.returnMovementId,
          deductMovementId: result.deductMovementId,
          newLineId: result.newLineId,
          isPartial,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return err(
          new BusinessRuleError(
            `Insufficient stock for replacement product ${error.productId}: requested ${error.requestedQuantity}, available ${error.availableQuantity ?? 'unknown'}`
          )
        );
      }
      throw error;
    }
  }
}
