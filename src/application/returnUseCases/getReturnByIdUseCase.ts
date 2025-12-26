import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnData } from './createReturnUseCase';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

export interface IGetReturnByIdRequest {
  id: string;
  orgId: string;
}

export type IGetReturnByIdResponse = IApiResponseSuccess<IReturnData>;

@Injectable()
export class GetReturnByIdUseCase {
  private readonly logger = new Logger(GetReturnByIdUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository
  ) {}

  async execute(request: IGetReturnByIdRequest): Promise<IGetReturnByIdResponse> {
    this.logger.log('Getting return by ID', { returnId: request.id, orgId: request.orgId });

    const returnEntity = await this.returnRepository.findById(request.id, request.orgId);

    if (!returnEntity) {
      throw new BadRequestException(`Return with ID ${request.id} not found`);
    }

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
      success: true,
      message: 'Return retrieved successfully',
      data: {
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
      },
      timestamp: new Date().toISOString(),
    };
  }
}
