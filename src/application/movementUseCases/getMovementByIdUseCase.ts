import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import { MovementMapper, type IProductInfo, type IMovementResponseData } from '@movement/mappers';

export interface IGetMovementByIdRequest {
  movementId: string;
  orgId: string;
}

export type IGetMovementByIdResponse = IApiResponseSuccess<IMovementResponseData>;

@Injectable()
export class GetMovementByIdUseCase {
  private readonly logger = new Logger(GetMovementByIdUseCase.name);

  constructor(
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository
  ) {}

  async execute(
    request: IGetMovementByIdRequest
  ): Promise<Result<IGetMovementByIdResponse, DomainError>> {
    this.logger.log('Getting movement by ID', {
      movementId: request.movementId,
      orgId: request.orgId,
    });

    const movement = await this.movementRepository.findById(request.movementId, request.orgId);

    if (!movement) {
      return err(new NotFoundError('Movement not found', 'MOVEMENT_NOT_FOUND'));
    }

    // Collect product info for all lines
    const productInfoMap = new Map<string, IProductInfo>();
    for (const line of movement.getLines()) {
      try {
        const product = await this.productRepository.findById(line.productId, request.orgId);
        if (product) {
          productInfoMap.set(line.productId, {
            sku: product.sku.getValue(),
            name: product.name.getValue(),
            price: product.price?.getAmount(),
            currency: product.price?.getCurrency(),
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch product info for ${line.productId}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return ok({
      success: true,
      message: 'Movement retrieved successfully',
      data: MovementMapper.toResponseData(movement, productInfoMap),
      timestamp: new Date().toISOString(),
    });
  }
}
