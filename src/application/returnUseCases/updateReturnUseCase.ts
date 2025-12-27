import { Inject, Injectable, Logger } from '@nestjs/common';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
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

export interface IUpdateReturnRequest {
  id: string;
  reason?: string;
  note?: string;
  orgId: string;
}

export type IUpdateReturnResponse = IApiResponseSuccess<IReturnData>;

@Injectable()
export class UpdateReturnUseCase {
  private readonly logger = new Logger(UpdateReturnUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IUpdateReturnRequest
  ): Promise<Result<IUpdateReturnResponse, DomainError>> {
    this.logger.log('Updating return', { returnId: request.id, orgId: request.orgId });

    const returnEntity = await this.returnRepository.findById(request.id, request.orgId);

    if (!returnEntity) {
      return err(new NotFoundError(`Return with ID ${request.id} not found`));
    }

    // Update return
    const updateProps: { reason?: ReturnReason; note?: string } = {};
    if (request.reason !== undefined) {
      updateProps.reason = ReturnReason.create(request.reason);
    }
    if (request.note !== undefined) {
      updateProps.note = request.note;
    }

    try {
      returnEntity.update(updateProps);
    } catch (error) {
      return err(
        new BusinessRuleError(error instanceof Error ? error.message : 'Failed to update return')
      );
    }

    // Save return
    const updatedReturn = await this.returnRepository.save(returnEntity);

    // Dispatch domain events
    updatedReturn.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(updatedReturn.domainEvents);
    updatedReturn.clearEvents();

    this.logger.log('Return updated successfully', {
      returnId: updatedReturn.id,
      returnNumber: updatedReturn.returnNumber.getValue(),
    });

    const totalAmount = updatedReturn.getTotalAmount();
    const lines = updatedReturn.getLines().map(line => {
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
      message: 'Return updated successfully',
      data: {
        id: updatedReturn.id,
        returnNumber: updatedReturn.returnNumber.getValue(),
        status: updatedReturn.status.getValue(),
        type: updatedReturn.type.getValue(),
        reason: updatedReturn.reason.getValue(),
        warehouseId: updatedReturn.warehouseId,
        saleId: updatedReturn.saleId,
        sourceMovementId: updatedReturn.sourceMovementId,
        returnMovementId: updatedReturn.returnMovementId,
        note: updatedReturn.note,
        confirmedAt: updatedReturn.confirmedAt,
        cancelledAt: updatedReturn.cancelledAt,
        createdBy: updatedReturn.createdBy,
        orgId: updatedReturn.orgId,
        createdAt: updatedReturn.createdAt,
        updatedAt: updatedReturn.updatedAt,
        totalAmount: totalAmount?.getAmount(),
        currency: totalAmount?.getCurrency(),
        lines,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
