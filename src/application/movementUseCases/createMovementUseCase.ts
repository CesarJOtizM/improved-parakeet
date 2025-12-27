import { Money, Quantity } from '@inventory/stock';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface ICreateMovementLineRequest {
  productId: string;
  locationId: string;
  quantity: number;
  unitCost?: number;
  currency?: string;
  extra?: Record<string, unknown>;
}

export interface ICreateMovementRequest {
  type: 'IN' | 'OUT' | 'ADJUST_IN' | 'ADJUST_OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN';
  warehouseId: string;
  reference?: string;
  reason?: string;
  note?: string;
  lines: ICreateMovementLineRequest[];
  createdBy: string;
  orgId: string;
}

export interface IMovementLineData {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  unitCost?: number;
  currency: string;
  extra?: Record<string, unknown>;
}

export interface IMovementData {
  id: string;
  type: string;
  status: string;
  warehouseId: string;
  reference?: string;
  reason?: string;
  note?: string;
  lines: IMovementLineData[];
  createdBy: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ICreateMovementResponse = IApiResponseSuccess<IMovementData>;

@Injectable()
export class CreateMovementUseCase {
  private readonly logger = new Logger(CreateMovementUseCase.name);

  constructor(
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: ICreateMovementRequest
  ): Promise<Result<ICreateMovementResponse, DomainError>> {
    this.logger.log('Creating movement', {
      type: request.type,
      warehouseId: request.warehouseId,
      orgId: request.orgId,
      linesCount: request.lines.length,
    });

    try {
      // Validate warehouse exists
      const warehouse = await this.warehouseRepository.findById(request.warehouseId, request.orgId);
      if (!warehouse) {
        return err(
          new NotFoundError('Warehouse not found', 'WAREHOUSE_NOT_FOUND', {
            warehouseId: request.warehouseId,
            orgId: request.orgId,
          })
        );
      }

      // Validate products exist and get unit precision
      const productPrecisions: Map<string, number> = new Map();
      for (const line of request.lines) {
        const product = await this.productRepository.findById(line.productId, request.orgId);
        if (!product) {
          return err(
            new NotFoundError(`Product not found: ${line.productId}`, 'PRODUCT_NOT_FOUND', {
              productId: line.productId,
              orgId: request.orgId,
            })
          );
        }
        productPrecisions.set(line.productId, product.unit.getValue().precision);
      }

      // Create movement entity
      const movement = Movement.create(
        {
          type: MovementType.create(request.type),
          status: MovementStatus.create('DRAFT'),
          warehouseId: request.warehouseId,
          reference: request.reference,
          reason: request.reason,
          note: request.note,
          createdBy: request.createdBy,
        },
        request.orgId
      );

      // Add lines to movement
      for (const lineRequest of request.lines) {
        const precision = productPrecisions.get(lineRequest.productId) || 0;
        const quantity = Quantity.create(lineRequest.quantity, precision);

        const unitCost = lineRequest.unitCost
          ? Money.create(lineRequest.unitCost, lineRequest.currency || 'COP', 2)
          : undefined;

        const currency = lineRequest.currency || 'COP';

        const line = MovementLine.create(
          {
            productId: lineRequest.productId,
            locationId: lineRequest.locationId,
            quantity,
            unitCost,
            currency,
            extra: lineRequest.extra,
          },
          request.orgId
        );

        movement.addLine(line);
      }

      // Save movement
      const savedMovement = await this.movementRepository.save(movement);

      // Dispatch domain events
      savedMovement.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(savedMovement.domainEvents);
      savedMovement.clearEvents();

      this.logger.log('Movement created successfully', {
        movementId: savedMovement.id,
        type: savedMovement.type.getValue(),
      });

      const response: ICreateMovementResponse = {
        success: true,
        message: 'Movement created successfully',
        data: {
          id: savedMovement.id,
          type: savedMovement.type.getValue(),
          status: savedMovement.status.getValue(),
          warehouseId: savedMovement.warehouseId,
          reference: savedMovement.reference,
          reason: savedMovement.reason,
          note: savedMovement.note,
          lines: savedMovement.getLines().map(line => ({
            id: line.id,
            productId: line.productId,
            locationId: line.locationId,
            quantity: line.quantity.getNumericValue(),
            unitCost: line.unitCost?.getAmount(),
            currency: line.currency,
            extra: line.extra,
          })),
          createdBy: savedMovement.createdBy,
          orgId: savedMovement.orgId!,
          createdAt: savedMovement.createdAt,
          updatedAt: savedMovement.updatedAt,
        } as IMovementData,
        timestamp: new Date().toISOString(),
      };

      return ok(response);
    } catch (error) {
      this.logger.error('Error creating movement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: request.type,
        warehouseId: request.warehouseId,
        orgId: request.orgId,
      });

      if (error instanceof Error) {
        return err(new ValidationError(error.message, 'MOVEMENT_CREATION_ERROR'));
      }

      return err(new ValidationError('Failed to create movement', 'MOVEMENT_CREATION_ERROR'));
    }
  }
}
