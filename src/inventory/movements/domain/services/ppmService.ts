import { Money, Quantity } from '@inventory/stock';
import { InventoryCalculationService } from '@stock/domain/services/inventoryCalculation.service';

export interface IPPMCalculationResult {
  newAverageCost: Money;
  totalQuantity: Quantity;
  totalValue: Money;
}

export class PPMService {
  /**
   * Calculates the new Promedio Ponderado Móvil (Weighted Average Cost) after a movement
   */
  public static calculatePPM(
    currentQuantity: Quantity,
    currentPPM: Money,
    newQuantity: Quantity,
    newUnitCost: Money
  ): IPPMCalculationResult {
    if (newQuantity.isZero()) {
      return {
        newAverageCost: currentPPM,
        totalQuantity: currentQuantity,
        totalValue: InventoryCalculationService.calculateInventoryValue(
          currentQuantity,
          currentPPM
        ),
      };
    }

    const newAverageCost = InventoryCalculationService.calculateAverageCost(
      currentQuantity,
      currentPPM,
      newQuantity,
      newUnitCost
    );

    const totalQuantity = currentQuantity.add(newQuantity);
    const totalValue = InventoryCalculationService.calculateInventoryValue(
      totalQuantity,
      newAverageCost
    );

    return {
      newAverageCost,
      totalQuantity,
      totalValue,
    };
  }

  /**
   * Recalculates PPM for a product/warehouse based on all movements
   * This method is used when recalculating historical data
   */
  public static recalculatePPM(
    movements: Array<{
      quantity: Quantity;
      unitCost?: Money;
    }>,
    initialQuantity: Quantity = Quantity.create(0),
    initialPPM: Money = Money.create(0)
  ): IPPMCalculationResult {
    let currentQuantity = initialQuantity;
    let currentPPM = initialPPM;

    for (const movement of movements) {
      if (movement.unitCost && movement.quantity.isPositive()) {
        const result = this.calculatePPM(
          currentQuantity,
          currentPPM,
          movement.quantity,
          movement.unitCost
        );
        currentQuantity = result.totalQuantity;
        currentPPM = result.newAverageCost;
      } else if (movement.quantity.isPositive()) {
        // Output movement without cost - doesn't affect PPM, only quantity
        currentQuantity = currentQuantity.add(movement.quantity);
      }
    }

    const totalValue = InventoryCalculationService.calculateInventoryValue(
      currentQuantity,
      currentPPM
    );

    return {
      newAverageCost: currentPPM,
      totalQuantity: currentQuantity,
      totalValue,
    };
  }

  /**
   * Gets the current PPM for a product/warehouse
   * This is a placeholder that should be implemented by the application layer
   * using the stock repository or stock aggregate
   */
  public static getCurrentPPM(
    _productId: string,
    _warehouseId: string,
    _orgId: string
  ): Promise<{ quantity: Quantity; averageCost: Money } | null> {
    // This method should be implemented by the application layer
    // It should query the stock repository or stock aggregate
    throw new Error(
      'getCurrentPPM must be implemented by the application layer using stock repository'
    );
  }
}
