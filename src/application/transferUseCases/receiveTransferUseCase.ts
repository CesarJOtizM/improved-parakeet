import { Movement } from '@inventory/movements/domain/entities/movement.entity';
import { MovementLine } from '@inventory/movements/domain/entities/movementLine.entity';
import { MovementStatus } from '@inventory/movements/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@inventory/movements/domain/valueObjects/movementType.valueObject';
import { Quantity } from '@inventory/stock';
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
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';

export interface IReceiveTransferRequest {
  transferId: string;
  orgId: string;
  receivedBy?: string;
}

export type IReceiveTransferResponse = IApiResponseSuccess<
  ITransferData & { inMovementId: string }
>;

@Injectable()
export class ReceiveTransferUseCase {
  private readonly logger = new Logger(ReceiveTransferUseCase.name);

  constructor(
    @Inject('TransferRepository')
    private readonly transferRepository: ITransferRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IReceiveTransferRequest
  ): Promise<Result<IReceiveTransferResponse, DomainError>> {
    this.logger.log('Receiving transfer', {
      transferId: request.transferId,
      orgId: request.orgId,
    });

    // Retrieve transfer
    const transfer = await this.transferRepository.findById(request.transferId, request.orgId);

    if (!transfer) {
      return err(new NotFoundError(`Transfer with ID ${request.transferId} not found`));
    }

    // Validate transfer can be received
    if (!transfer.status.canReceive()) {
      return err(
        new BusinessRuleError(
          `Transfer cannot be received. Current status: ${transfer.status.getValue()}. Must be IN_TRANSIT or PARTIAL.`
        )
      );
    }

    // Create IN movement for destination warehouse
    const inMovement = this.createInMovement(transfer);

    // Save the movement in DRAFT state
    const savedMovement = await this.movementRepository.save(inMovement);

    // Post the movement (returns new instance with events attached)
    const postedMovementInstance = savedMovement.post();
    const postedMovement = await this.movementRepository.save(postedMovementInstance);

    // Dispatch movement domain events to update stock via MovementPostedEventHandler
    await this.eventDispatcher.markAndDispatch(postedMovementInstance.domainEvents);

    // Receive the transfer (changes status to RECEIVED)
    transfer.receive(request.receivedBy);

    // Save transfer
    const receivedTransfer = await this.transferRepository.save(transfer);

    // Dispatch transfer domain events
    await this.eventDispatcher.markAndDispatch(receivedTransfer.domainEvents);
    receivedTransfer.clearEvents();

    this.logger.log('Transfer received successfully', {
      transferId: receivedTransfer.id,
      inMovementId: postedMovement.id,
      status: receivedTransfer.status.getValue(),
    });

    return ok({
      success: true,
      message: 'Transfer received successfully. Stock has been added to destination warehouse.',
      data: {
        id: receivedTransfer.id,
        fromWarehouseId: receivedTransfer.fromWarehouseId,
        toWarehouseId: receivedTransfer.toWarehouseId,
        status: receivedTransfer.status.getValue(),
        createdBy: receivedTransfer.createdBy,
        receivedBy: receivedTransfer.receivedBy,
        note: receivedTransfer.note,
        linesCount: receivedTransfer.getLines().length,
        orgId: receivedTransfer.orgId!,
        createdAt: receivedTransfer.createdAt,
        updatedAt: receivedTransfer.updatedAt,
        inMovementId: postedMovement.id,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private createInMovement(
    transfer: ReturnType<typeof this.transferRepository.findById> extends Promise<infer T>
      ? NonNullable<T>
      : never
  ): Movement {
    const movement = Movement.create(
      {
        type: MovementType.create('TRANSFER_IN'),
        status: MovementStatus.create('DRAFT'),
        warehouseId: transfer.toWarehouseId,
        reference: `TRANSFER-${transfer.id}`,
        reason: 'TRANSFER_IN',
        note: transfer.note || `Transfer from warehouse`,
        createdBy: transfer.createdBy,
      },
      transfer.orgId!
    );

    // Add lines from transfer to movement
    for (const transferLine of transfer.getLines()) {
      const movementLine = MovementLine.create(
        {
          productId: transferLine.productId,
          locationId: transferLine.toLocationId,
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
