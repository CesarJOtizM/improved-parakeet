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
  statusChangedBy?: string | null;
  statusChangedAt?: Date | null;
}

/**
 * WarehouseMapper - Handles conversion from domain entities to DTOs
 *
 * This mapper is a pure function utility class with no dependencies or side effects.
 * It handles value extraction for Domain→DTO.
 */
export class WarehouseMapper {
  /**
   * Parses an address string back to structured address object.
   * Supports JSON format (new) and comma-separated fallback (legacy data).
   */
  private static parseAddress(addressValue: string): IWarehouseResponseData['address'] {
    // Try JSON parse first (new format)
    try {
      const parsed = JSON.parse(addressValue);
      if (parsed && typeof parsed === 'object') {
        return {
          street: parsed.street || undefined,
          city: parsed.city || undefined,
          state: parsed.state || undefined,
          zipCode: parsed.zipCode || undefined,
          country: parsed.country || undefined,
        };
      }
    } catch {
      // Not JSON — fallback for legacy comma-separated strings
    }

    // Fallback: put the raw string in the street field
    return { street: addressValue };
  }

  /**
   * Converts a Warehouse domain entity to a response DTO
   * Extracts values from all value objects
   *
   * @param warehouse - The Warehouse domain entity
   * @returns IWarehouseResponseData for API responses
   */
  public static toResponseData(warehouse: Warehouse): IWarehouseResponseData {
    const addressValue = warehouse.address?.getValue();
    const address = addressValue ? WarehouseMapper.parseAddress(addressValue) : undefined;

    return {
      id: warehouse.id,
      code: warehouse.code.getValue(),
      name: warehouse.name,
      description: warehouse.description,
      address,
      isActive: warehouse.isActive,
      orgId: warehouse.orgId!,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
      statusChangedBy: warehouse.statusChangedBy ?? null,
      statusChangedAt: warehouse.statusChangedAt ?? null,
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
