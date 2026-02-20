import { MovementMapper } from '@movement/mappers';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleError,
  DomainError,
  NotFoundError,
  Result,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { ICreateMovementLineRequest } from './createMovementUseCase';
import type { IMovementData } from './createMovementUseCase';

export interface IUpdateMovementRequest {
  movementId: string;
  orgId: string;
  reference?: string;
  reason?: string;
  note?: string;
  lines?: ICreateMovementLineRequest[];
}

export type IUpdateMovementResponse = IApiResponseSuccess<IMovementData>;

@Injectable()
export class UpdateMovementUseCase {
  private readonly logger = new Logger(UpdateMovementUseCase.name);

  constructor(
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository
  ) {}

  async execute(
    request: IUpdateMovementRequest
  ): Promise<Result<IUpdateMovementResponse, DomainError>> {
    this.logger.log('Updating movement', {
      movementId: request.movementId,
      orgId: request.orgId,
    });

    try {
      const movement = await this.movementRepository.findById(request.movementId, request.orgId);

      if (!movement) {
        return err(new NotFoundError('Movement not found', 'MOVEMENT_NOT_FOUND'));
      }

      if (!movement.canUpdate()) {
        return err(
          new BusinessRuleError('Only DRAFT movements can be updated', 'MOVEMENT_CANNOT_BE_UPDATED')
        );
      }

      // Update header fields
      const updatedMovement = movement.update({
        reference: request.reference,
        reason: request.reason,
        note: request.note,
      });

      // Replace lines if provided
      if (request.lines !== undefined) {
        // Validate products and collect precisions
        const productPrecisions = new Map<string, number>();
        for (const line of request.lines) {
          const product = await this.productRepository.findById(line.productId, request.orgId);
          if (!product) {
            return err(
              new NotFoundError(`Product not found: ${line.productId}`, 'PRODUCT_NOT_FOUND')
            );
          }
          productPrecisions.set(line.productId, product.unit.getValue().precision);
        }

        // Remove all existing lines
        const existingLines = updatedMovement.getLines();
        for (const line of existingLines) {
          updatedMovement.removeLine(line.id);
        }

        // Add new lines
        for (const lineReq of request.lines) {
          const precision = productPrecisions.get(lineReq.productId) ?? 0;
          const newLine = MovementMapper.createLineEntity(lineReq, precision, request.orgId);
          updatedMovement.addLine(newLine);
        }
      }

      const savedMovement = await this.movementRepository.save(updatedMovement);

      this.logger.log('Movement updated successfully', { movementId: savedMovement.id });

      return ok({
        success: true,
        message: 'Movement updated successfully',
        data: MovementMapper.toResponseData(savedMovement),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error updating movement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        movementId: request.movementId,
      });

      return err(
        new BusinessRuleError(
          error instanceof Error ? error.message : 'Failed to update movement',
          'MOVEMENT_UPDATE_ERROR'
        )
      );
    }
  }
}
