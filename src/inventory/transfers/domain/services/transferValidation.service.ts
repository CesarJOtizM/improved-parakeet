import { Quantity } from '@inventory/stock';
import { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { ILocationRepository } from '@warehouse/domain/repositories/locationRepository.interface';
import { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ITransferCreationValidation {
  fromWarehouseId: string;
  toWarehouseId: string;
  orgId: string;
}

export interface IStockRepository {
  getStockQuantity(
    productId: string,
    warehouseId: string,
    orgId: string,
    locationId?: string
  ): Promise<Quantity>;
}

export class TransferValidationService {
  /**
   * Validates transfer creation data
   * - From and to warehouses must be different
   * - Both warehouses must exist
   * - Both warehouses must belong to the same organization
   * - Both warehouses must be active
   */
  public static async validateTransferCreation(
    data: ITransferCreationValidation,
    warehouseRepository: IWarehouseRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    // Validate that warehouses are different
    if (data.fromWarehouseId === data.toWarehouseId) {
      errors.push('From warehouse and to warehouse must be different');
    }

    // Validate from warehouse exists
    const fromWarehouse = await warehouseRepository.findById(data.fromWarehouseId, data.orgId);
    if (!fromWarehouse) {
      errors.push(`From warehouse with id ${data.fromWarehouseId} not found`);
    } else {
      // Validate from warehouse is active
      if (!fromWarehouse.isActive) {
        errors.push('From warehouse is not active');
      }
    }

    // Validate to warehouse exists
    const toWarehouse = await warehouseRepository.findById(data.toWarehouseId, data.orgId);
    if (!toWarehouse) {
      errors.push(`To warehouse with id ${data.toWarehouseId} not found`);
    } else {
      // Validate to warehouse is active
      if (!toWarehouse.isActive) {
        errors.push('To warehouse is not active');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates transfer lines
   * - All lines must have positive quantities
   * - All products must exist
   * - All products must be active
   */
  public static async validateTransferLines(
    lines: TransferLine[],
    orgId: string,
    productRepository: IProductRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    if (lines.length === 0) {
      errors.push('Transfer must have at least one line');
    }

    for (const line of lines) {
      // Validate quantity is positive
      if (!line.quantity.isPositive()) {
        errors.push(`Line for product ${line.productId} has invalid quantity`);
      }

      // Validate product exists
      const product = await productRepository.findById(line.productId, orgId);
      if (!product) {
        errors.push(`Product with id ${line.productId} not found`);
      } else {
        // Validate product is active
        if (!product.isActive) {
          errors.push(`Product ${line.productId} is not active`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates stock availability in source warehouse
   * - Stock must be available for all products in the transfer
   * - Stock must be sufficient for the requested quantities
   */
  public static async validateStockAvailability(
    lines: TransferLine[],
    fromWarehouseId: string,
    orgId: string,
    stockRepository: IStockRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    for (const line of lines) {
      const availableStock = await stockRepository.getStockQuantity(
        line.productId,
        fromWarehouseId,
        orgId,
        line.fromLocationId
      );

      if (availableStock.getNumericValue() < line.quantity.getNumericValue()) {
        errors.push(
          `Insufficient stock for product ${line.productId}. Available: ${availableStock.getNumericValue()}, Requested: ${line.quantity.getNumericValue()}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates locations belong to correct warehouses
   * - From location must belong to from warehouse
   * - To location must belong to to warehouse
   */
  public static async validateLocations(
    lines: TransferLine[],
    fromWarehouseId: string,
    toWarehouseId: string,
    orgId: string,
    locationRepository: ILocationRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    for (const line of lines) {
      // Validate from location if provided
      if (line.fromLocationId) {
        const fromLocation = await locationRepository.findById(line.fromLocationId, orgId);
        if (!fromLocation) {
          errors.push(`From location with id ${line.fromLocationId} not found`);
        } else if (fromLocation.warehouseId !== fromWarehouseId) {
          errors.push(
            `From location ${line.fromLocationId} does not belong to from warehouse ${fromWarehouseId}`
          );
        } else if (!fromLocation.isActive) {
          errors.push(`From location ${line.fromLocationId} is not active`);
        }
      }

      // Validate to location if provided
      if (line.toLocationId) {
        const toLocation = await locationRepository.findById(line.toLocationId, orgId);
        if (!toLocation) {
          errors.push(`To location with id ${line.toLocationId} not found`);
        } else if (toLocation.warehouseId !== toWarehouseId) {
          errors.push(
            `To location ${line.toLocationId} does not belong to to warehouse ${toWarehouseId}`
          );
        } else if (!toLocation.isActive) {
          errors.push(`To location ${line.toLocationId} is not active`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
