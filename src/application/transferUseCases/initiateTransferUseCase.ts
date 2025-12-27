import { Quantity } from '@inventory/stock';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleError,
  DomainError,
  err,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { Transfer } from '@transfer/domain/entities/transfer.entity';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { TransferValidationService } from '@transfer/domain/services/transferValidation.service';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';
import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';
import type { ILocationRepository } from '@warehouse/domain/repositories/locationRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface ITransferLineRequest {
  productId: string;
  quantity: number;
  fromLocationId?: string;
  toLocationId?: string;
}

export interface IInitiateTransferRequest {
  fromWarehouseId: string;
  toWarehouseId: string;
  createdBy: string;
  note?: string;
  lines: ITransferLineRequest[];
  orgId: string;
}

export interface ITransferData {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: string;
  createdBy: string;
  note?: string;
  linesCount: number;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IInitiateTransferResponse = IApiResponseSuccess<ITransferData>;

@Injectable()
export class InitiateTransferUseCase {
  private readonly logger = new Logger(InitiateTransferUseCase.name);

  constructor(
    @Inject('TransferRepository')
    private readonly transferRepository: ITransferRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository,
    @Inject('LocationRepository')
    private readonly locationRepository: ILocationRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IInitiateTransferRequest
  ): Promise<Result<IInitiateTransferResponse, DomainError>> {
    this.logger.log('Initiating transfer', {
      fromWarehouseId: request.fromWarehouseId,
      toWarehouseId: request.toWarehouseId,
      orgId: request.orgId,
    });

    // Validate transfer creation
    const creationValidation = await TransferValidationService.validateTransferCreation(
      {
        fromWarehouseId: request.fromWarehouseId,
        toWarehouseId: request.toWarehouseId,
        orgId: request.orgId,
      },
      this.warehouseRepository
    );

    if (!creationValidation.isValid) {
      return err(new ValidationError(creationValidation.errors.join(', ')));
    }

    // Create transfer lines for validation
    const transferLines = request.lines.map(line =>
      TransferLine.create(
        {
          productId: line.productId,
          quantity: Quantity.create(line.quantity),
          fromLocationId: line.fromLocationId,
          toLocationId: line.toLocationId,
        },
        request.orgId
      )
    );

    // Validate transfer lines
    const linesValidation = await TransferValidationService.validateTransferLines(
      transferLines,
      request.orgId,
      this.productRepository
    );

    if (!linesValidation.isValid) {
      return err(new ValidationError(linesValidation.errors.join(', ')));
    }

    // Validate stock availability
    const stockValidation = await TransferValidationService.validateStockAvailability(
      transferLines,
      request.fromWarehouseId,
      request.orgId,
      this.stockRepository
    );

    if (!stockValidation.isValid) {
      return err(new BusinessRuleError(stockValidation.errors.join(', ')));
    }

    // Validate locations if provided
    if (request.lines.some(line => line.fromLocationId || line.toLocationId)) {
      const locationValidation = await TransferValidationService.validateLocations(
        transferLines,
        request.fromWarehouseId,
        request.toWarehouseId,
        request.orgId,
        this.locationRepository
      );

      if (!locationValidation.isValid) {
        return err(new ValidationError(locationValidation.errors.join(', ')));
      }
    }

    // Create transfer entity
    const transfer = Transfer.create(
      {
        fromWarehouseId: request.fromWarehouseId,
        toWarehouseId: request.toWarehouseId,
        status: TransferStatus.create('DRAFT'),
        createdBy: request.createdBy,
        note: request.note,
      },
      request.orgId
    );

    // Add lines to transfer (reuse the validated lines)
    for (const transferLine of transferLines) {
      transfer.addLine(transferLine);
    }

    // Save transfer
    const savedTransfer = await this.transferRepository.save(transfer);

    // Dispatch domain events
    savedTransfer.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(savedTransfer.domainEvents);
    savedTransfer.clearEvents();

    this.logger.log('Transfer initiated successfully', {
      transferId: savedTransfer.id,
      fromWarehouseId: savedTransfer.fromWarehouseId,
      toWarehouseId: savedTransfer.toWarehouseId,
    });

    return ok({
      success: true,
      message: 'Transfer initiated successfully',
      data: {
        id: savedTransfer.id,
        fromWarehouseId: savedTransfer.fromWarehouseId,
        toWarehouseId: savedTransfer.toWarehouseId,
        status: savedTransfer.status.getValue(),
        createdBy: savedTransfer.createdBy,
        note: savedTransfer.note,
        linesCount: savedTransfer.getLines().length,
        orgId: savedTransfer.orgId!,
        createdAt: savedTransfer.createdAt,
        updatedAt: savedTransfer.updatedAt,
      } as ITransferData,
      timestamp: new Date().toISOString(),
    });
  }
}
