import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ITransferData } from './initiateTransferUseCase';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';

export interface ICancelTransferRequest {
  transferId: string;
  orgId: string;
}

export type ICancelTransferResponse = IApiResponseSuccess<ITransferData>;

@Injectable()
export class CancelTransferUseCase {
  private readonly logger = new Logger(CancelTransferUseCase.name);

  constructor(
    @Inject('TransferRepository')
    private readonly transferRepository: ITransferRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: ICancelTransferRequest
  ): Promise<Result<ICancelTransferResponse, DomainError>> {
    this.logger.log('Canceling transfer', {
      transferId: request.transferId,
      orgId: request.orgId,
    });

    // Retrieve transfer
    const transfer = await this.transferRepository.findById(request.transferId, request.orgId);

    if (!transfer) {
      return err(new NotFoundError(`Transfer with ID ${request.transferId} not found`));
    }

    // Validate transfer can be canceled
    if (!transfer.status.canCancel()) {
      return err(
        new BusinessRuleError(
          `Transfer cannot be canceled. Current status: ${transfer.status.getValue()}. Only DRAFT transfers can be canceled.`
        )
      );
    }

    // Cancel the transfer
    transfer.cancel();

    // Save transfer
    const canceledTransfer = await this.transferRepository.save(transfer);

    // Dispatch transfer domain events (if any)
    await this.eventDispatcher.markAndDispatch(canceledTransfer.domainEvents);
    canceledTransfer.clearEvents();

    this.logger.log('Transfer canceled successfully', {
      transferId: canceledTransfer.id,
      status: canceledTransfer.status.getValue(),
    });

    return ok({
      success: true,
      message: 'Transfer canceled successfully.',
      data: {
        id: canceledTransfer.id,
        fromWarehouseId: canceledTransfer.fromWarehouseId,
        toWarehouseId: canceledTransfer.toWarehouseId,
        status: canceledTransfer.status.getValue(),
        createdBy: canceledTransfer.createdBy,
        note: canceledTransfer.note,
        linesCount: canceledTransfer.getLines().length,
        orgId: canceledTransfer.orgId!,
        createdAt: canceledTransfer.createdAt,
        updatedAt: canceledTransfer.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
