import { Inject, Injectable, Logger } from '@nestjs/common';
import { ReturnValidationService } from '@returns/domain/services/returnValidation.service';
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
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: ICancelReturnRequest
  ): Promise<Result<ICancelReturnResponse, DomainError>> {
    this.logger.log('Cancelling return', { returnId: request.id, orgId: request.orgId });

    // Retrieve return
    const returnEntity = await this.returnRepository.findById(request.id, request.orgId);

    if (!returnEntity) {
      return err(new NotFoundError(`Return with ID ${request.id} not found`));
    }

    // Validate return can be cancelled
    const validationResult = ReturnValidationService.validateReturnCanBeCancelled(returnEntity);
    if (!validationResult.isValid) {
      return err(
        new BusinessRuleError(`Return cannot be cancelled: ${validationResult.errors.join(', ')}`)
      );
    }

    // Cancel return
    try {
      returnEntity.cancel(request.reason);
    } catch (error) {
      return err(
        new BusinessRuleError(error instanceof Error ? error.message : 'Failed to cancel return')
      );
    }

    // Save return
    const cancelledReturn = await this.returnRepository.save(returnEntity);

    // Dispatch domain events
    cancelledReturn.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(cancelledReturn.domainEvents);
    cancelledReturn.clearEvents();

    this.logger.log('Return cancelled successfully', {
      returnId: cancelledReturn.id,
      returnNumber: cancelledReturn.returnNumber.getValue(),
    });

    const totalAmount = cancelledReturn.getTotalAmount();
    const lines = cancelledReturn.getLines().map(line => {
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
      message: 'Return cancelled successfully',
      data: {
        id: cancelledReturn.id,
        returnNumber: cancelledReturn.returnNumber.getValue(),
        status: cancelledReturn.status.getValue(),
        type: cancelledReturn.type.getValue(),
        reason: cancelledReturn.reason.getValue(),
        warehouseId: cancelledReturn.warehouseId,
        saleId: cancelledReturn.saleId,
        sourceMovementId: cancelledReturn.sourceMovementId,
        returnMovementId: cancelledReturn.returnMovementId,
        note: cancelledReturn.note,
        confirmedAt: cancelledReturn.confirmedAt,
        cancelledAt: cancelledReturn.cancelledAt,
        createdBy: cancelledReturn.createdBy,
        orgId: cancelledReturn.orgId,
        createdAt: cancelledReturn.createdAt,
        updatedAt: cancelledReturn.updatedAt,
        totalAmount: totalAmount?.getAmount(),
        currency: totalAmount?.getCurrency(),
        lines,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
