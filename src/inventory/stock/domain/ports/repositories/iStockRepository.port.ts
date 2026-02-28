import { Money, Quantity } from '@inventory/stock';

/**
 * Stock data transfer object
 */
export interface IStockData {
  productId: string;
  productName?: string;
  productSku?: string;
  warehouseId: string;
  warehouseName?: string;
  warehouseCode?: string;
  locationId?: string;
  quantity: Quantity;
  averageCost: Money;
  orgId: string;
}

/**
 * Stock query filters
 */
export interface IStockFilters {
  warehouseIds?: string[];
  productId?: string;
  lowStock?: boolean; // Filter products below minimum quantity (from reorder rules)
}

/**
 * Stock repository port interface
 * Output port for stock persistence following Hexagonal Architecture
 */
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

  /**
   * Gets all stock records with optional filters
   */
  findAll(orgId: string, filters?: IStockFilters): Promise<IStockData[]>;
}
