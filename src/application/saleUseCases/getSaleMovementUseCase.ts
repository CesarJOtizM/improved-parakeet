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

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface IGetSaleMovementRequest {
  saleId: string;
  orgId: string;
}

export interface IMovementData {
  id: string;
  type: string;
  status: string;
  warehouseId: string;
  reference: string | undefined;
  reason: string | undefined;
  note: string | undefined;
  postedAt: Date | undefined;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IGetSaleMovementResponse = IApiResponseSuccess<IMovementData>;

@Injectable()
export class GetSaleMovementUseCase {
  private readonly logger = new Logger(GetSaleMovementUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository
  ) {}

  async execute(
    request: IGetSaleMovementRequest
  ): Promise<Result<IGetSaleMovementResponse, DomainError>> {
    this.logger.log('Getting movement for sale', { saleId: request.saleId, orgId: request.orgId });

    // Retrieve sale
    const sale = await this.saleRepository.findById(request.saleId, request.orgId);

    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.saleId} not found`));
    }

    if (!sale.movementId) {
      return err(
        new BusinessRuleError('Sale is not confirmed or does not have an associated movement')
      );
    }

    // Retrieve movement
    const movement = await this.movementRepository.findById(sale.movementId, request.orgId);

    if (!movement) {
      return err(new NotFoundError(`Movement with ID ${sale.movementId} not found`));
    }

    return ok({
      success: true,
      message: 'Movement retrieved successfully',
      data: {
        id: movement.id,
        type: movement.type.getValue(),
        status: movement.status.getValue(),
        warehouseId: movement.warehouseId,
        reference: movement.reference,
        reason: movement.reason,
        note: movement.note,
        postedAt: movement.postedAt,
        createdBy: movement.createdBy,
        createdAt: movement.createdAt,
        updatedAt: movement.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
