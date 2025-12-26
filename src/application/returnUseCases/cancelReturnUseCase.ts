import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReturnValidationService } from '@returns/domain/services/returnValidation.service';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnData } from './createReturnUseCase';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

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
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(request: ICancelReturnRequest): Promise<ICancelReturnResponse> {
    this.logger.log('Cancelling return', { returnId: request.id, orgId: request.orgId });

    // Retrieve return
    const returnEntity = await this.returnRepository.findById(request.id, request.orgId);

    if (!returnEntity) {
      throw new NotFoundException(`Return with ID ${request.id} not found`);
    }

    // Validate return can be cancelled
    const validationResult = ReturnValidationService.validateReturnCanBeCancelled(returnEntity);
    if (!validationResult.isValid) {
      throw new BadRequestException(
        `Return cannot be cancelled: ${validationResult.errors.join(', ')}`
      );
    }

    // Cancel return
    try {
      returnEntity.cancel(request.reason);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to cancel return'
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

    return {
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
    };
  }
}
