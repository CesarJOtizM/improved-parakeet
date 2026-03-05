import { Movement } from '@inventory/movements/domain/entities/movement.entity';
import { MovementLine } from '@inventory/movements/domain/entities/movementLine.entity';
import { MovementStatus } from '@inventory/movements/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@inventory/movements/domain/valueObjects/movementType.valueObject';
import { Quantity } from '@inventory/stock';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { TRANSFER_CANNOT_CONFIRM, TRANSFER_NOT_FOUND } from '@shared/constants/error-codes';
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
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';

export interface IConfirmTransferRequest {
  transferId: string;
  orgId: string;
}

export type IConfirmTransferResponse = IApiResponseSuccess<
  ITransferData & { outMovementId: string }
>;

@Injectable()
export class ConfirmTransferUseCase {
  private readonly logger = new Logger(ConfirmTransferUseCase.name);

  constructor(
    @Inject('TransferRepository')
    private readonly transferRepository: ITransferRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IConfirmTransferRequest
  ): Promise<Result<IConfirmTransferResponse, DomainError>> {
    this.logger.log('Confirming transfer', {
      transferId: request.transferId,
      orgId: request.orgId,
    });

    // Retrieve transfer
    const transfer = await this.transferRepository.findById(request.transferId, request.orgId);

    if (!transfer) {
      return err(
        new NotFoundError(`Transfer with ID ${request.transferId} not found`, TRANSFER_NOT_FOUND)
      );
    }

    // Validate transfer can be confirmed
    if (!transfer.canConfirm()) {
      return err(
        new BusinessRuleError(
          'Transfer cannot be confirmed. It must be in DRAFT status with at least one line.',
          TRANSFER_CANNOT_CONFIRM
        )
      );
    }

    // Create OUT movement for origin warehouse
    const outMovement = this.createOutMovement(transfer);

    // Save the movement in DRAFT state
    const savedMovement = await this.movementRepository.save(outMovement);

    // Post the movement (returns new instance with events attached)
    const postedMovementInstance = savedMovement.post();
    const postedMovement = await this.movementRepository.save(postedMovementInstance);

    // Dispatch movement domain events to update stock via MovementPostedEventHandler
    await this.eventDispatcher.markAndDispatch(postedMovementInstance.domainEvents);

    // Confirm the transfer (changes status to IN_TRANSIT)
    transfer.confirm();

    // Save transfer
    const confirmedTransfer = await this.transferRepository.save(transfer);

    // Dispatch transfer domain events
    await this.eventDispatcher.markAndDispatch(confirmedTransfer.domainEvents);
    confirmedTransfer.clearEvents();

    this.logger.log('Transfer confirmed successfully', {
      transferId: confirmedTransfer.id,
      outMovementId: postedMovement.id,
      status: confirmedTransfer.status.getValue(),
    });

    return ok({
      success: true,
      message: 'Transfer confirmed successfully. Stock has been deducted from origin warehouse.',
      data: {
        id: confirmedTransfer.id,
        fromWarehouseId: confirmedTransfer.fromWarehouseId,
        toWarehouseId: confirmedTransfer.toWarehouseId,
        status: confirmedTransfer.status.getValue(),
        createdBy: confirmedTransfer.createdBy,
        note: confirmedTransfer.note,
        linesCount: confirmedTransfer.getLines().length,
        orgId: confirmedTransfer.orgId!,
        createdAt: confirmedTransfer.createdAt,
        updatedAt: confirmedTransfer.updatedAt,
        outMovementId: postedMovement.id,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private createOutMovement(
    transfer: ReturnType<typeof this.transferRepository.findById> extends Promise<infer T>
      ? NonNullable<T>
      : never
  ): Movement {
    const movement = Movement.create(
      {
        type: MovementType.create('TRANSFER_OUT'),
        status: MovementStatus.create('DRAFT'),
        warehouseId: transfer.fromWarehouseId,
        reference: `TRANSFER-${transfer.id}`,
        reason: 'TRANSFER_OUT',
        note: transfer.note || `Transfer to warehouse`,
        createdBy: transfer.createdBy,
      },
      transfer.orgId!
    );

    // Add lines from transfer to movement
    for (const transferLine of transfer.getLines()) {
      const movementLine = MovementLine.create(
        {
          productId: transferLine.productId,
          locationId: transferLine.fromLocationId,
          quantity: Quantity.create(transferLine.quantity.getNumericValue()),
          currency: 'COP',
        },
        transfer.orgId!
      );
      movement.addLine(movementLine);
    }

    return movement;
  }
}
