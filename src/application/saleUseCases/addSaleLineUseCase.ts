import { Inject, Injectable, Logger } from '@nestjs/common';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import {
  BusinessRuleError,
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface IAddSaleLineRequest {
  saleId: string;
  productId: string;
  locationId?: string;
  quantity: number;
  salePrice: number;
  currency?: string;
  orgId: string;
}

export interface ISaleLineData {
  id: string;
  productId: string;
  locationId?: string;
  quantity: number;
  salePrice: number;
  currency: string;
  totalPrice: number;
}

export type IAddSaleLineResponse = IApiResponseSuccess<ISaleLineData>;

@Injectable()
export class AddSaleLineUseCase {
  private readonly logger = new Logger(AddSaleLineUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository
  ) {}

  async execute(request: IAddSaleLineRequest): Promise<Result<IAddSaleLineResponse, DomainError>> {
    this.logger.log('Adding line to sale', { saleId: request.saleId, orgId: request.orgId });

    // Validate product exists
    const product = await this.productRepository.findById(request.productId, request.orgId);
    if (!product) {
      return err(new ValidationError(`Product with ID ${request.productId} not found`));
    }

    // Create sale line
    const quantity = Quantity.create(request.quantity, 6);
    const salePrice = SalePrice.create(request.salePrice, request.currency || 'COP', 2);

    const line = SaleLine.create(
      {
        productId: request.productId,
        locationId: request.locationId,
        quantity,
        salePrice,
      },
      request.orgId
    );

    try {
      // Add line directly to sale using atomic repository method
      // This prevents race conditions when multiple lines are added concurrently
      const savedLine = await this.saleRepository.addLine(request.saleId, line, request.orgId);

      this.logger.log('Line added to sale successfully', {
        saleId: request.saleId,
        lineId: savedLine.id,
      });

      const totalPrice = savedLine.getTotalPrice();

      return ok({
        success: true,
        message: 'Line added to sale successfully',
        data: {
          id: savedLine.id,
          productId: savedLine.productId,
          locationId: savedLine.locationId,
          quantity: savedLine.quantity.getNumericValue(),
          salePrice: savedLine.salePrice.getAmount(),
          currency: savedLine.salePrice.getCurrency(),
          totalPrice: totalPrice.getAmount(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return err(error);
      }
      if (error instanceof BusinessRuleError) {
        return err(error);
      }
      throw error;
    }
  }
}
