import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnData } from './createReturnUseCase';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface IGetReturnsBySaleRequest {
  saleId: string;
  orgId: string;
}

export type IGetReturnsBySaleResponse = IApiResponseSuccess<IReturnData[]>;

@Injectable()
export class GetReturnsBySaleUseCase {
  private readonly logger = new Logger(GetReturnsBySaleUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository,
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository
  ) {}

  async execute(
    request: IGetReturnsBySaleRequest
  ): Promise<Result<IGetReturnsBySaleResponse, DomainError>> {
    this.logger.log('Getting returns by sale', { saleId: request.saleId, orgId: request.orgId });

    // Validate sale exists
    const sale = await this.saleRepository.findById(request.saleId, request.orgId);
    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.saleId} not found`));
    }

    // Find returns by sale ID
    const returns = await this.returnRepository.findBySaleId(request.saleId, request.orgId);

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

    return ok({
      success: true,
      message: 'Returns retrieved successfully',
      data: returnData,
      timestamp: new Date().toISOString(),
    });
  }
}
