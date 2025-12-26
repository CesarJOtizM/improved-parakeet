import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface IAddSaleLineRequest {
  saleId: string;
  productId: string;
  locationId: string;
  quantity: number;
  salePrice: number;
  currency?: string;
  orgId: string;
}

export interface ISaleLineData {
  id: string;
  productId: string;
  locationId: string;
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
    private readonly productRepository: IProductRepository,
    private readonly eventDispatcher: DomainEventDispatcher
  ) {}

  async execute(request: IAddSaleLineRequest): Promise<IAddSaleLineResponse> {
    this.logger.log('Adding line to sale', { saleId: request.saleId, orgId: request.orgId });

    // Retrieve sale
    const sale = await this.saleRepository.findById(request.saleId, request.orgId);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${request.saleId} not found`);
    }

    // Validate product exists
    const product = await this.productRepository.findById(request.productId, request.orgId);
    if (!product) {
      throw new BadRequestException(`Product with ID ${request.productId} not found`);
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

    // Add line to sale
    sale.addLine(line);

    // Save sale
    const updatedSale = await this.saleRepository.save(sale);

    // Dispatch domain events
    updatedSale.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(updatedSale.domainEvents);
    updatedSale.clearEvents();

    this.logger.log('Line added to sale successfully', {
      saleId: updatedSale.id,
      lineId: line.id,
    });

    const totalPrice = line.getTotalPrice();

    return {
      success: true,
      message: 'Line added to sale successfully',
      data: {
        id: line.id,
        productId: line.productId,
        locationId: line.locationId,
        quantity: line.quantity.getNumericValue(),
        salePrice: line.salePrice.getAmount(),
        currency: line.salePrice.getCurrency(),
        totalPrice: totalPrice.getAmount(),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
