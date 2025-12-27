import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISaleData } from './createSaleUseCase';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface IGetSaleByIdRequest {
  id: string;
  orgId: string;
}

export type IGetSaleByIdResponse = IApiResponseSuccess<ISaleData>;

@Injectable()
export class GetSaleByIdUseCase {
  private readonly logger = new Logger(GetSaleByIdUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository
  ) {}

  async execute(request: IGetSaleByIdRequest): Promise<Result<IGetSaleByIdResponse, DomainError>> {
    this.logger.log('Getting sale by ID', { saleId: request.id, orgId: request.orgId });

    const sale = await this.saleRepository.findById(request.id, request.orgId);

    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.id} not found`));
    }

    const totalAmount = sale.getTotalAmount();

    return ok({
      success: true,
      message: 'Sale retrieved successfully',
      data: {
        id: sale.id,
        saleNumber: sale.saleNumber.getValue(),
        status: sale.status.getValue(),
        warehouseId: sale.warehouseId,
        customerReference: sale.customerReference,
        externalReference: sale.externalReference,
        note: sale.note,
        confirmedAt: sale.confirmedAt,
        cancelledAt: sale.cancelledAt,
        movementId: sale.movementId,
        createdBy: sale.createdBy,
        orgId: sale.orgId,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        totalAmount: totalAmount.getAmount(),
        currency: totalAmount.getCurrency(),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
