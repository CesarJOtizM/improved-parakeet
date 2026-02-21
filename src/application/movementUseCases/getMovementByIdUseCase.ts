import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import { MovementMapper, type IProductInfo, type IMovementResponseData } from '@movement/mappers';
import { PrismaService } from '@infrastructure/database/prisma.service';

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
    private readonly productRepository: IProductRepository,
    private readonly prisma: PrismaService
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

    // Resolve warehouse name
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: movement.warehouseId },
      select: { name: true, code: true },
    });

    // Resolve user names (createdBy and postedBy)
    const userIds = [movement.createdBy, movement.postedBy].filter(Boolean) as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    return ok({
      success: true,
      message: 'Movement retrieved successfully',
      data: MovementMapper.toResponseData(movement, productInfoMap, {
        warehouseName: warehouse?.name,
        warehouseCode: warehouse?.code,
        createdByName: userMap.get(movement.createdBy),
        postedByName: movement.postedBy ? userMap.get(movement.postedBy) : undefined,
      }),
      timestamp: new Date().toISOString(),
    });
  }
}
