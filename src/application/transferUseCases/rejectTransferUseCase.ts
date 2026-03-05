import { Inject, Injectable, Logger } from '@nestjs/common';
import { TRANSFER_CANNOT_REJECT, TRANSFER_NOT_FOUND } from '@shared/constants/error-codes';
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

export interface IRejectTransferRequest {
  transferId: string;
  orgId: string;
  reason?: string;
}

export type IRejectTransferResponse = IApiResponseSuccess<ITransferData>;

@Injectable()
export class RejectTransferUseCase {
  private readonly logger = new Logger(RejectTransferUseCase.name);

  constructor(
    @Inject('TransferRepository')
    private readonly transferRepository: ITransferRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IRejectTransferRequest
  ): Promise<Result<IRejectTransferResponse, DomainError>> {
    this.logger.log('Rejecting transfer', {
      transferId: request.transferId,
      orgId: request.orgId,
      reason: request.reason,
    });

    // Retrieve transfer
    const transfer = await this.transferRepository.findById(request.transferId, request.orgId);

    if (!transfer) {
      return err(
        new NotFoundError(`Transfer with ID ${request.transferId} not found`, TRANSFER_NOT_FOUND)
      );
    }

    // Validate transfer can be rejected
    if (!transfer.status.canReject()) {
      return err(
        new BusinessRuleError(
          `Transfer cannot be rejected. Current status: ${transfer.status.getValue()}. Must be IN_TRANSIT or PARTIAL.`,
          TRANSFER_CANNOT_REJECT
        )
      );
    }

    // Reject the transfer
    transfer.reject(request.reason);

    // Save transfer
    const rejectedTransfer = await this.transferRepository.save(transfer);

    // Dispatch transfer domain events
    await this.eventDispatcher.markAndDispatch(rejectedTransfer.domainEvents);
    rejectedTransfer.clearEvents();

    this.logger.log('Transfer rejected successfully', {
      transferId: rejectedTransfer.id,
      status: rejectedTransfer.status.getValue(),
      reason: request.reason,
    });

    return ok({
      success: true,
      message:
        'Transfer rejected successfully. Note: Stock was already deducted from origin warehouse during confirmation.',
      data: {
        id: rejectedTransfer.id,
        fromWarehouseId: rejectedTransfer.fromWarehouseId,
        toWarehouseId: rejectedTransfer.toWarehouseId,
        status: rejectedTransfer.status.getValue(),
        createdBy: rejectedTransfer.createdBy,
        note: rejectedTransfer.note,
        linesCount: rejectedTransfer.getLines().length,
        orgId: rejectedTransfer.orgId!,
        createdAt: rejectedTransfer.createdAt,
        updatedAt: rejectedTransfer.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
