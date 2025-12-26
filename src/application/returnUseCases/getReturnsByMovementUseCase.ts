import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnData } from './createReturnUseCase';
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

export interface IGetReturnsByMovementRequest {
  movementId: string;
  orgId: string;
}

export type IGetReturnsByMovementResponse = IApiResponseSuccess<IReturnData[]>;

@Injectable()
export class GetReturnsByMovementUseCase {
  private readonly logger = new Logger(GetReturnsByMovementUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository
  ) {}

  async execute(request: IGetReturnsByMovementRequest): Promise<IGetReturnsByMovementResponse> {
    this.logger.log('Getting returns by movement', {
      movementId: request.movementId,
      orgId: request.orgId,
    });

    // Validate movement exists
    const movement = await this.movementRepository.findById(request.movementId, request.orgId);
    if (!movement) {
      throw new NotFoundException(`Movement with ID ${request.movementId} not found`);
    }

    // Find returns by source movement ID
    const returns = await this.returnRepository.findBySourceMovementId(
      request.movementId,
      request.orgId
    );

    const returnData = returns.map(returnEntity => {
      const totalAmount = returnEntity.getTotalAmount();
      const lines = returnEntity.getLines().map(line => {
        const lineTotal = line.getTotalPrice();
        return {
          id: line.id,
          productId: line.productId,
          locationId: line.locationId,
          quantity: line.quantity.getNumericValue(),
          originalSalePrice: line.originalSalePrice?.getAmount(),
          originalUnitCost: line.originalUnitCost?.getAmount(),
          currency: line.currency,
          totalPrice: lineTotal?.getAmount() || 0,
        };
      });

      return {
        id: returnEntity.id,
        returnNumber: returnEntity.returnNumber.getValue(),
        status: returnEntity.status.getValue(),
        type: returnEntity.type.getValue(),
        reason: returnEntity.reason.getValue(),
        warehouseId: returnEntity.warehouseId,
        saleId: returnEntity.saleId,
        sourceMovementId: returnEntity.sourceMovementId,
        returnMovementId: returnEntity.returnMovementId,
        note: returnEntity.note,
        confirmedAt: returnEntity.confirmedAt,
        cancelledAt: returnEntity.cancelledAt,
        createdBy: returnEntity.createdBy,
        orgId: returnEntity.orgId,
        createdAt: returnEntity.createdAt,
        updatedAt: returnEntity.updatedAt,
        totalAmount: totalAmount?.getAmount(),
        currency: totalAmount?.getCurrency(),
        lines,
      };
    });

    return {
      success: true,
      message: 'Returns retrieved successfully',
      data: returnData,
      timestamp: new Date().toISOString(),
    };
  }
}
