import { Money } from '../valueObjects/money.valueObject';
import { Quantity } from '../valueObjects/quantity.valueObject';

export interface InventoryBalance {
  productId: string;
  warehouseId: string;
  locationId?: string;
  quantity: Quantity;
  averageCost: Money;
  totalValue: Money;
}

export interface MovementCalculation {
  quantity: Quantity;
  unitCost?: Money;
  totalCost?: Money;
}

export class InventoryCalculationService {
  /**
   * Calcula el nuevo costo promedio ponderado móvil (PPM)
   */
  public static calculateAverageCost(
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
   * Calcula el saldo de inventario
   */
  public static calculateBalance(movements: MovementCalculation[]): {
    quantity: Quantity;
    totalCost: Money;
  } {
    let totalQuantity = Quantity.create(0);
    let totalValue = Money.create(0);

    for (const movement of movements) {
      if (movement.quantity) {
        totalQuantity = totalQuantity.add(movement.quantity);
      }

      if (movement.totalCost) {
        totalValue = totalValue.add(movement.totalCost);
      }
    }

    return { quantity: totalQuantity, totalCost: totalValue };
  }

  /**
   * Valida que haya stock suficiente para una salida
   */
  public static validateStockAvailability(
    availableQuantity: Quantity,
    requestedQuantity: Quantity
  ): boolean {
    return availableQuantity.getNumericValue() >= requestedQuantity.getNumericValue();
  }

  /**
   * Calcula el valor total del inventario
   */
  public static calculateInventoryValue(quantity: Quantity, unitCost: Money): Money {
    return unitCost.multiply(quantity.getNumericValue());
  }
}
