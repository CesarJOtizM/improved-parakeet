import { Money, Quantity } from '@inventory/stock';

export interface IStockData {
  productId: string;
  warehouseId: string;
  locationId?: string;
  quantity: Quantity;
  averageCost: Money;
  orgId: string;
}

export interface IStockRepository {
  /**
   * Gets stock quantity for a product in a warehouse/location
   */
  getStockQuantity(
    productId: string,
    warehouseId: string,
    orgId: string,
    locationId?: string
  ): Promise<Quantity>;

  /**
   * Gets stock with cost information
   */
  getStockWithCost(
    productId: string,
    warehouseId: string,
    orgId: string,
    locationId?: string
  ): Promise<{ quantity: Quantity; averageCost: Money } | null>;

  /**
   * Updates stock quantity and average cost
   */
  updateStock(
    productId: string,
    warehouseId: string,
    orgId: string,
    quantity: Quantity,
    averageCost: Money,
    locationId?: string
  ): Promise<void>;

  /**
   * Increments stock quantity (for input movements)
   */
  incrementStock(
    productId: string,
    warehouseId: string,
    orgId: string,
    quantity: Quantity,
    locationId?: string
  ): Promise<void>;

  /**
   * Decrements stock quantity (for output movements)
   */
  decrementStock(
    productId: string,
    warehouseId: string,
    orgId: string,
    quantity: Quantity,
    locationId?: string
  ): Promise<void>;
}
