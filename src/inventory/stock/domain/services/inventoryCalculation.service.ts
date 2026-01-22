import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

export interface IInventoryBalance {
  productId: string;
  warehouseId: string;
  locationId?: string;
  quantity: Quantity;
  averageCost: Money;
  totalValue: Money;
}

export interface IMovementCalculation {
  quantity: Quantity;
  unitCost?: Money;
  totalCost?: Money;
}

// Inventory Calculation Service - Pure Functions
// Pure functions for inventory calculations without side effects

/**
 * Calculates the new weighted moving average cost (PPM)
 * Pure function - no side effects
 */
export function calculateAverageCost(
  currentQuantity: Quantity,
  currentAverageCost: Money,
  newQuantity: Quantity,
  newUnitCost: Money
): Money {
  if (newQuantity.isZero()) {
    return currentAverageCost;
  }

  const totalCurrentValue = currentAverageCost.multiply(currentQuantity.getNumericValue());
  const totalNewValue = newUnitCost.multiply(newQuantity.getNumericValue());
  const totalQuantity = currentQuantity.add(newQuantity);

  const newAverageCost = totalCurrentValue
    .add(totalNewValue)
    .divide(totalQuantity.getNumericValue());

  return Money.create(
    newAverageCost.getAmount(),
    newAverageCost.getCurrency(),
    newAverageCost.getPrecision()
  );
}

/**
 * Calculates inventory balance from movements
 * Pure function - no side effects
 */
export function calculateInventoryBalance(movements: IMovementCalculation[]): {
  quantity: Quantity;
  totalCost: Money;
} {
  let totalQuantity = Quantity.create(0);
  let totalValue: Money | null = null;

  for (const movement of movements) {
    if (movement.quantity) {
      totalQuantity = totalQuantity.add(movement.quantity);
    }

    if (movement.totalCost) {
      if (!totalValue) {
        totalValue = Money.create(
          0,
          movement.totalCost.getCurrency(),
          movement.totalCost.getPrecision()
        );
      }
      totalValue = totalValue.add(movement.totalCost);
    }
  }

  return { quantity: totalQuantity, totalCost: totalValue ?? Money.create(0) };
}

/**
 * Validates that there is sufficient stock for an output
 * Pure function - no side effects
 */
export function validateStockAvailability(
  availableQuantity: Quantity,
  requestedQuantity: Quantity
): boolean {
  return availableQuantity.getNumericValue() >= requestedQuantity.getNumericValue();
}

/**
 * Calculates total inventory value
 * Pure function - no side effects
 */
export function calculateInventoryValue(quantity: Quantity, unitCost: Money): Money {
  return unitCost.multiply(quantity.getNumericValue());
}

/**
 * Legacy class export for backward compatibility
 * @deprecated Use pure functions instead
 */
export class InventoryCalculationService {
  /**
   * @deprecated Use calculateAverageCost instead
   */
  public static calculateAverageCost(
    currentQuantity: Quantity,
    currentAverageCost: Money,
    newQuantity: Quantity,
    newUnitCost: Money
  ): Money {
    return calculateAverageCost(currentQuantity, currentAverageCost, newQuantity, newUnitCost);
  }

  /**
   * @deprecated Use calculateInventoryBalance instead
   */
  public static calculateBalance(movements: IMovementCalculation[]): {
    quantity: Quantity;
    totalCost: Money;
  } {
    return calculateInventoryBalance(movements);
  }

  /**
   * @deprecated Use validateStockAvailability instead
   */
  public static validateStockAvailability(
    availableQuantity: Quantity,
    requestedQuantity: Quantity
  ): boolean {
    return validateStockAvailability(availableQuantity, requestedQuantity);
  }

  /**
   * @deprecated Use calculateInventoryValue instead
   */
  public static calculateInventoryValue(quantity: Quantity, unitCost: Money): Money {
    return calculateInventoryValue(quantity, unitCost);
  }
}
