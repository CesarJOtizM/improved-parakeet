import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
}

export class NoNegativeStockRule {
  /**
   * Validates that stock cannot go negative
   * @param currentStock Current stock quantity
   * @param requestedQuantity Quantity being requested (for output movements, this is positive)
   * @returns Validation result
   */
  public static validateNoNegativeStock(
    currentStock: Quantity,
    requestedQuantity: Quantity
  ): IValidationResult {
    const errors: string[] = [];

    const result = currentStock.getNumericValue() - requestedQuantity.getNumericValue();

    if (result < 0) {
      errors.push(
        `Stock cannot be negative. Current: ${currentStock.getNumericValue()}, Requested: ${requestedQuantity.getNumericValue()}, Result: ${result}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that stock cannot go negative and throws if invalid
   * @param currentStock Current stock quantity
   * @param requestedQuantity Quantity being requested
   * @throws Error if stock would go negative
   */
  public static validateNoNegativeStockOrThrow(
    currentStock: Quantity,
    requestedQuantity: Quantity
  ): void {
    const validation = this.validateNoNegativeStock(currentStock, requestedQuantity);

    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
  }

  /**
   * Checks if stock would be negative after operation
   * @param currentStock Current stock quantity
   * @param requestedQuantity Quantity being requested
   * @returns True if stock would be negative
   */
  public static wouldBeNegative(currentStock: Quantity, requestedQuantity: Quantity): boolean {
    return currentStock.getNumericValue() - requestedQuantity.getNumericValue() < 0;
  }
}
