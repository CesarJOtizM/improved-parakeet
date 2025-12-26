import { Sale } from '@sale/domain/entities/sale.entity';
import { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SaleValidationService {
  /**
   * Validates stock availability for all lines in a sale
   */
  public static async validateStockAvailability(
    sale: Sale,
    stockRepository: IStockRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    for (const line of sale.getLines()) {
      try {
        const availableStock = await stockRepository.getStockQuantity(
          line.productId,
          sale.warehouseId,
          sale.orgId,
          line.locationId
        );

        if (availableStock.getNumericValue() < line.quantity.getNumericValue()) {
          errors.push(
            `Insufficient stock for product ${line.productId} in location ${line.locationId}. Available: ${availableStock.getNumericValue()}, Requested: ${line.quantity.getNumericValue()}`
          );
        }
      } catch (error) {
        errors.push(
          `Error checking stock for product ${line.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that a sale can be confirmed
   */
  public static validateSaleCanBeConfirmed(sale: Sale): IValidationResult {
    const errors: string[] = [];

    if (!sale.status.canConfirm()) {
      errors.push('Sale cannot be confirmed. Only DRAFT sales can be confirmed.');
    }

    if (sale.getLines().length === 0) {
      errors.push('Sale must have at least one line before confirming');
    }

    for (const line of sale.getLines()) {
      if (!line.quantity.isPositive()) {
        errors.push(`Line with product ${line.productId} must have positive quantity`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that a sale can be cancelled
   */
  public static validateSaleCanBeCancelled(sale: Sale): IValidationResult {
    const errors: string[] = [];

    if (!sale.status.canCancel()) {
      errors.push('Sale cannot be cancelled. Only DRAFT or CONFIRMED sales can be cancelled.');
    }

    if (sale.status.isCancelled()) {
      errors.push('Sale is already cancelled');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
