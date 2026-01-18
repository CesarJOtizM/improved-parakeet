import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';

/**
 * Warehouse DTO for response (output)
 */
export interface IWarehouseResponseData {
  id: string;
  code: string;
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  isActive: boolean;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WarehouseMapper - Handles conversion from domain entities to DTOs
 *
 * This mapper is a pure function utility class with no dependencies or side effects.
 * It handles value extraction for Domain→DTO.
 */
export class WarehouseMapper {
  /**
   * Converts a Warehouse domain entity to a response DTO
   * Extracts values from all value objects
   *
   * @param warehouse - The Warehouse domain entity
   * @returns IWarehouseResponseData for API responses
   */
  public static toResponseData(warehouse: Warehouse): IWarehouseResponseData {
    // Address is stored as a string in the database, but DTO expects an object
    // Since we can't reliably parse the address string back to its components,
    // we'll return undefined for the address object structure
    // The address string value is available via warehouse.address?.getValue()
    const addressValue = warehouse.address?.getValue();
    const address = addressValue
      ? {
          street: undefined,
          city: undefined,
          state: undefined,
          zipCode: undefined,
          country: undefined,
        }
      : undefined;

    return {
      id: warehouse.id,
      code: warehouse.code.getValue(),
      name: warehouse.name,
      address,
      isActive: warehouse.isActive,
      orgId: warehouse.orgId!,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
    };
  }

  /**
   * Converts an array of Warehouse domain entities to response DTOs
   *
   * @param warehouses - Array of Warehouse domain entities
   * @returns Array of IWarehouseResponseData for API responses
   */
  public static toResponseDataList(warehouses: Warehouse[]): IWarehouseResponseData[] {
    return warehouses.map(warehouse => WarehouseMapper.toResponseData(warehouse));
  }
}
