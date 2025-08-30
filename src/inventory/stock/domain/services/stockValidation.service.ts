import { Movement } from '@inventory/movements/domain/entities/movement.entity';
import { Product } from '@inventory/products/domain/entities/product.entity';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

export interface IStockValidationResult {
  isValid: boolean;
  availableQuantity: Quantity;
  requestedQuantity: Quantity;
  errors: string[];
}

export class StockValidationService {
  /**
   * Valida que haya stock suficiente para un movimiento de salida
   */
  public static validateStockForOutput(
    productId: string,
    locationId: string,
    requestedQuantity: Quantity,
    currentStock: Quantity,
    pendingMovements: Movement[]
  ): IStockValidationResult {
    const errors: string[] = [];

    // Calcular stock disponible considerando movimientos pendientes
    let availableStock = currentStock;

    for (const movement of pendingMovements) {
      if (movement.status.getValue() === 'POSTED') {
        for (const line of movement.getLines()) {
          if (line.productId === productId && line.locationId === locationId) {
            if (movement.type.getValue().includes('OUT')) {
              availableStock = availableStock.subtract(line.quantity);
            } else if (movement.type.getValue().includes('IN')) {
              availableStock = availableStock.add(line.quantity);
            }
          }
        }
      }
    }

    // Validar que haya stock suficiente
    if (availableStock.getNumericValue() < requestedQuantity.getNumericValue()) {
      errors.push(
        `Insufficient stock. Available: ${availableStock.getNumericValue()}, Requested: ${requestedQuantity.getNumericValue()}`
      );
    }

    // Validar que la cantidad sea positiva
    if (requestedQuantity.getNumericValue() <= 0) {
      errors.push('Quantity must be positive');
    }

    return {
      isValid: errors.length === 0,
      availableQuantity: availableStock,
      requestedQuantity,
      errors,
    };
  }

  /**
   * Valida que un producto esté activo para movimientos
   */
  public static validateProductForMovement(product: Product): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!product.isActive) {
      errors.push('Product is not active');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida que una bodega esté activa para movimientos
   */
  public static validateWarehouseForMovement(warehouse: { isActive: boolean }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!warehouse.isActive) {
      errors.push('Warehouse is not active');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida que una ubicación esté activa para movimientos
   */
  public static validateLocationForMovement(location: { isActive: boolean }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!location.isActive) {
      errors.push('Location is not active');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
