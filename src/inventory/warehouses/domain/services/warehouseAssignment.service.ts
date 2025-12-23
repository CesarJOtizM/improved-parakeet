import { Location } from '@warehouse/domain/entities/location.entity';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { ILocationRepository } from '@warehouse/domain/repositories/locationRepository.interface';
import { LocationCode } from '@warehouse/domain/valueObjects/locationCode.valueObject';

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ILocationAssignmentValidation {
  code: string;
  warehouseId: string;
  isDefault: boolean;
}

export class WarehouseAssignmentService {
  /**
   * Validates if a warehouse can accept new locations
   */
  public static validateWarehouseForLocation(warehouse: Warehouse): IValidationResult {
    const errors: string[] = [];

    // Warehouse must be active
    if (!warehouse.isActive) {
      errors.push('Warehouse must be active to accept new locations');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates location code uniqueness within a warehouse
   */
  public static async validateLocationCodeUniqueness(
    code: LocationCode,
    warehouseId: string,
    orgId: string,
    repository: ILocationRepository
  ): Promise<boolean> {
    const existingLocation = await repository.findByCode(code.getValue(), warehouseId, orgId);
    return existingLocation === null;
  }

  /**
   * Validates location assignment data
   */
  public static validateLocationAssignment(data: ILocationAssignmentValidation): IValidationResult {
    const errors: string[] = [];

    // Validate location code
    try {
      LocationCode.create(data.code);
    } catch (error) {
      errors.push(
        `Invalid location code: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Validate warehouse ID
    if (!data.warehouseId || data.warehouseId.trim().length === 0) {
      errors.push('Warehouse ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that only one default location exists per warehouse
   */
  public static async validateDefaultLocationUniqueness(
    warehouseId: string,
    orgId: string,
    repository: ILocationRepository,
    excludeLocationId?: string
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    const defaultLocation = await repository.findDefaultLocation(warehouseId, orgId);

    if (defaultLocation && defaultLocation.id !== excludeLocationId) {
      errors.push('A default location already exists for this warehouse');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that a location can be set as default
   */
  public static async canSetAsDefault(
    location: Location,
    repository: ILocationRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    // Location must be active
    if (!location.isActive) {
      errors.push('Location must be active to be set as default');
    }

    // Check if another default location exists
    const defaultLocation = await repository.findDefaultLocation(
      location.warehouseId,
      location.orgId
    );

    if (defaultLocation && defaultLocation.id !== location.id) {
      errors.push('Another default location already exists for this warehouse');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
