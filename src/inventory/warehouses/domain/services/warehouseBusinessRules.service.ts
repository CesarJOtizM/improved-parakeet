import { ConflictException } from '@nestjs/common';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface IStockRepository {
  hasStock(warehouseId: string, orgId: string): Promise<boolean>;
  getTotalStock(warehouseId: string, orgId: string): Promise<number>;
  hasActiveStock(warehouseId: string, orgId: string): Promise<boolean>;
}

export interface ILocationRepository {
  findDefaultLocation(warehouseId: string, orgId: string): Promise<{ id: string } | null>;
}

// Export types for use in tests
export type {
  IStockRepository as IWarehouseStockRepository,
  ILocationRepository as IWarehouseLocationRepository,
};

export class WarehouseBusinessRulesService {
  /**
   * Validates warehouse creation rules
   * - Warehouse code must be unique per organization
   */
  public static async validateWarehouseCreationRules(
    code: WarehouseCode,
    orgId: string,
    repository: IWarehouseRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    // Validate code uniqueness
    const existingWarehouse = await repository.findByCode(code.getValue(), orgId);
    if (existingWarehouse !== null) {
      errors.push(`Warehouse code '${code.getValue()}' already exists in this organization`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates warehouse update rules
   * - Warehouse code must be unique per organization (excluding current warehouse)
   */
  public static async validateWarehouseUpdateRules(
    warehouseId: string,
    code: WarehouseCode,
    orgId: string,
    repository: IWarehouseRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    // Validate code uniqueness (excluding current warehouse)
    const existingWarehouse = await repository.findByCode(code.getValue(), orgId);
    if (existingWarehouse !== null && existingWarehouse.id !== warehouseId) {
      errors.push(`Warehouse code '${code.getValue()}' already exists in this organization`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates warehouse code uniqueness and throws ConflictException if not unique
   */
  public static async validateCodeUniquenessOrThrow(
    code: WarehouseCode,
    orgId: string,
    repository: IWarehouseRepository,
    excludeWarehouseId?: string
  ): Promise<void> {
    const existingWarehouse = await repository.findByCode(code.getValue(), orgId);

    if (existingWarehouse !== null) {
      if (excludeWarehouseId && existingWarehouse.id === excludeWarehouseId) {
        return; // Same warehouse, code is valid
      }
      throw new ConflictException(
        `Warehouse code '${code.getValue()}' already exists in this organization`
      );
    }
  }

  /**
   * Validates that warehouse can be deleted
   * - Warehouse cannot be deleted if it has stock
   */
  public static async validateWarehouseDeletion(
    warehouseId: string,
    orgId: string,
    stockRepository: IStockRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    const hasStock = await stockRepository.hasStock(warehouseId, orgId);
    if (hasStock) {
      errors.push('Warehouse cannot be deleted because it has stock');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that warehouse can be deactivated
   * - Warehouse cannot be deactivated if it has active stock
   */
  public static async validateWarehouseDeactivation(
    warehouseId: string,
    orgId: string,
    stockRepository: IStockRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    const hasActiveStock = await stockRepository.hasActiveStock(warehouseId, orgId);
    if (hasActiveStock) {
      errors.push('Warehouse cannot be deactivated because it has active stock');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that warehouse can accept new locations
   * - Warehouse must be active
   */
  public static validateWarehouseForLocation(warehouse: Warehouse): IValidationResult {
    const errors: string[] = [];

    if (!warehouse.isActive) {
      errors.push('Warehouse must be active to accept new locations');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates default location uniqueness
   * - Only one default location per warehouse
   */
  public static async validateDefaultLocationUniqueness(
    warehouseId: string,
    orgId: string,
    locationRepository: ILocationRepository,
    excludeLocationId?: string
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    const defaultLocation = await locationRepository.findDefaultLocation(warehouseId, orgId);

    if (defaultLocation !== null && defaultLocation.id !== excludeLocationId) {
      errors.push('A default location already exists for this warehouse');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
