import { Inject, Injectable, Logger } from '@nestjs/common';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { IReturnLineData } from './createReturnUseCase';
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface IAddReturnLineRequest {
  returnId: string;
  productId: string;
  locationId: string;
  quantity: number;
  currency?: string;
  orgId: string;
}

export type IAddReturnLineResponse = IApiResponseSuccess<IReturnLineData>;

@Injectable()
export class AddReturnLineUseCase {
  private readonly logger = new Logger(AddReturnLineUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository,
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository
  ) {}

  async execute(
    request: IAddReturnLineRequest
  ): Promise<Result<IAddReturnLineResponse, DomainError>> {
    this.logger.log('Adding line to return', {
      returnId: request.returnId,
      productId: request.productId,
      orgId: request.orgId,
    });

    // Retrieve return (we need type, saleId, sourceMovementId for validation)
    const returnEntity = await this.returnRepository.findById(request.returnId, request.orgId);

    if (!returnEntity) {
      return err(new NotFoundError(`Return with ID ${request.returnId} not found`));
    }

    // Validate product exists
    const product = await this.productRepository.findById(request.productId, request.orgId);
    if (!product) {
      return err(new ValidationError(`Product with ID ${request.productId} not found`));
    }

    const currency = request.currency || 'COP';
    const quantity = Quantity.create(request.quantity, 6);

    let originalSalePrice: SalePrice | undefined;
    let originalUnitCost: Money | undefined;
    let returnType: ReturnType;

    // Get original price/cost based on return type
    if (returnEntity.type.isCustomerReturn()) {
      returnType = ReturnType.create('RETURN_CUSTOMER');

      if (!returnEntity.saleId) {
        return err(new ValidationError('Sale ID is required for customer returns'));
      }

      const sale = await this.saleRepository.findById(returnEntity.saleId, request.orgId);
      if (!sale) {
        return err(new NotFoundError(`Sale with ID ${returnEntity.saleId} not found`));
      }

      const saleLine = sale.getLines().find(line => line.productId === request.productId);
      if (!saleLine) {
        return err(
          new ValidationError(
            `Product ${request.productId} was not sold in sale ${returnEntity.saleId}`
          )
        );
      }

      // Use the sale price from the sale line
      originalSalePrice = saleLine.salePrice;
    } else {
      // Supplier return
      returnType = ReturnType.create('RETURN_SUPPLIER');

      if (!returnEntity.sourceMovementId) {
        return err(new ValidationError('Source movement ID is required for supplier returns'));
      }

      const sourceMovement = await this.movementRepository.findById(
        returnEntity.sourceMovementId,
        request.orgId
      );
      if (!sourceMovement) {
        return err(
          new NotFoundError(`Movement with ID ${returnEntity.sourceMovementId} not found`)
        );
      }

      const movementLine = sourceMovement
        .getLines()
        .find(line => line.productId === request.productId);
      if (!movementLine) {
        return err(
          new ValidationError(
            `Product ${request.productId} was not purchased in movement ${returnEntity.sourceMovementId}`
          )
        );
      }

      // Use unit cost from movement line, or create a default if not available
      if (movementLine.unitCost) {
        originalUnitCost = movementLine.unitCost;
      } else {
        // If no unit cost in movement, we need to get it from stock or use a default
        // For now, return an error as we need unit cost for supplier returns
        return err(
          new ValidationError(
            `Unit cost is required for supplier returns. Movement line for product ${request.productId} does not have unit cost.`
          )
        );
      }
    }

    // Create return line
    const line = ReturnLine.create(
      {
        productId: request.productId,
        locationId: request.locationId,
        quantity,
        originalSalePrice,
        originalUnitCost,
        currency,
      },
      request.orgId,
      returnType
    );

    try {
      // Add line directly to return using atomic repository method
      // This prevents race conditions when multiple lines are added concurrently
      const savedLine = await this.returnRepository.addLine(request.returnId, line, request.orgId);

      this.logger.log('Line added to return successfully', {
        returnId: request.returnId,
        lineId: savedLine.id,
      });

      const totalPrice = savedLine.getTotalPrice();

      return ok({
        success: true,
        message: 'Line added to return successfully',
        data: {
          id: savedLine.id,
          productId: savedLine.productId,
          locationId: savedLine.locationId,
          quantity: savedLine.quantity.getNumericValue(),
          originalSalePrice: savedLine.originalSalePrice?.getAmount(),
          originalUnitCost: savedLine.originalUnitCost?.getAmount(),
          currency: savedLine.currency,
          totalPrice: totalPrice?.getAmount() || 0,
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
