import { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import { Return } from '@returns/domain/entities/return.entity';
import { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ReturnValidationService {
  /**
   * Validates that a return can be confirmed
   */
  public static validateReturnCanBeConfirmed(returnEntity: Return): IValidationResult {
    const errors: string[] = [];

    if (!returnEntity.status.canConfirm()) {
      errors.push('Return cannot be confirmed. Only DRAFT returns can be confirmed.');
    }

    if (returnEntity.getLines().length === 0) {
      errors.push('Return must have at least one line before confirming');
    }

    for (const line of returnEntity.getLines()) {
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
   * Validates that a return can be cancelled
   */
  public static validateReturnCanBeCancelled(returnEntity: Return): IValidationResult {
    const errors: string[] = [];

    if (!returnEntity.status.canCancel()) {
      errors.push('Return cannot be cancelled. Only DRAFT or CONFIRMED returns can be cancelled.');
    }

    if (returnEntity.status.isCancelled()) {
      errors.push('Return is already cancelled');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that customer return quantity doesn't exceed sold quantity
   */
  public static async validateCustomerReturnQuantity(
    returnEntity: Return,
    saleRepository: ISaleRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    if (!returnEntity.type.isCustomerReturn()) {
      return {
        isValid: true,
        errors: [],
      };
    }

    if (!returnEntity.saleId) {
      errors.push('Sale ID is required for customer returns');
      return {
        isValid: false,
        errors,
      };
    }

    try {
      const sale = await saleRepository.findById(returnEntity.saleId, returnEntity.orgId);
      if (!sale) {
        errors.push(`Sale with ID ${returnEntity.saleId} not found`);
        return {
          isValid: false,
          errors,
        };
      }

      const saleLines = sale.getLines();
      const returnLines = returnEntity.getLines();

      // Create a map of productId -> total quantity returned
      const returnedQuantities = new Map<string, number>();
      for (const returnLine of returnLines) {
        const current = returnedQuantities.get(returnLine.productId) || 0;
        returnedQuantities.set(
          returnLine.productId,
          current + returnLine.quantity.getNumericValue()
        );
      }

      // Validate each return line against sale lines
      for (const returnLine of returnLines) {
        const saleLine = saleLines.find(line => line.productId === returnLine.productId);
        if (!saleLine) {
          errors.push(
            `Product ${returnLine.productId} was not sold in sale ${returnEntity.saleId}`
          );
          continue;
        }

        const soldQuantity = saleLine.quantity.getNumericValue();
        const returnedQuantity = returnedQuantities.get(returnLine.productId) || 0;

        if (returnedQuantity > soldQuantity) {
          errors.push(
            `Cannot return ${returnedQuantity} units of product ${returnLine.productId}. Only ${soldQuantity} units were sold.`
          );
        }
      }
    } catch (error) {
      errors.push(
        `Error validating customer return quantity: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that supplier return quantity doesn't exceed purchased quantity
   */
  public static async validateSupplierReturnQuantity(
    returnEntity: Return,
    movementRepository: IMovementRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    if (!returnEntity.type.isSupplierReturn()) {
      return {
        isValid: true,
        errors: [],
      };
    }

    if (!returnEntity.sourceMovementId) {
      errors.push('Source movement ID is required for supplier returns');
      return {
        isValid: false,
        errors,
      };
    }

    try {
      const sourceMovement = await movementRepository.findById(
        returnEntity.sourceMovementId,
        returnEntity.orgId
      );
      if (!sourceMovement) {
        errors.push(`Movement with ID ${returnEntity.sourceMovementId} not found`);
        return {
          isValid: false,
          errors,
        };
      }

      // Validate movement is a purchase (IN type with reason PURCHASE)
      if (sourceMovement.type.getValue() !== 'IN') {
        errors.push('Source movement must be an IN movement for supplier returns');
      }
      if (sourceMovement.reason !== 'PURCHASE') {
        errors.push('Source movement must have reason PURCHASE for supplier returns');
      }

      const movementLines = sourceMovement.getLines();
      const returnLines = returnEntity.getLines();

      // Create a map of productId -> total quantity returned
      const returnedQuantities = new Map<string, number>();
      for (const returnLine of returnLines) {
        const current = returnedQuantities.get(returnLine.productId) || 0;
        returnedQuantities.set(
          returnLine.productId,
          current + returnLine.quantity.getNumericValue()
        );
      }

      // Validate each return line against movement lines
      for (const returnLine of returnLines) {
        const movementLine = movementLines.find(line => line.productId === returnLine.productId);
        if (!movementLine) {
          errors.push(
            `Product ${returnLine.productId} was not purchased in movement ${returnEntity.sourceMovementId}`
          );
          continue;
        }

        const purchasedQuantity = movementLine.quantity.getNumericValue();
        const returnedQuantity = returnedQuantities.get(returnLine.productId) || 0;

        if (returnedQuantity > purchasedQuantity) {
          errors.push(
            `Cannot return ${returnedQuantity} units of product ${returnLine.productId}. Only ${purchasedQuantity} units were purchased.`
          );
        }
      }
    } catch (error) {
      errors.push(
        `Error validating supplier return quantity: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
