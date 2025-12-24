import { ConflictException } from '@nestjs/common';
import { Product } from '@product/domain/entities/product.entity';
import { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';

export interface IProductValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface IProductCreationValidation {
  sku: string;
  name: string;
  unitCode: string;
  unitName: string;
  unitPrecision: number;
  description?: string;
  barcode?: string;
  brand?: string;
  model?: string;
}

export interface IProductUpdateValidation {
  name?: string;
  unitCode?: string;
  unitName?: string;
  unitPrecision?: number;
  description?: string;
  barcode?: string;
  brand?: string;
  model?: string;
}

export class ProductValidationService {
  /**
   * Validates product creation data
   */
  public static validateProductCreation(
    data: IProductCreationValidation
  ): IProductValidationResult {
    const errors: string[] = [];

    // Validate SKU
    try {
      SKU.create(data.sku);
    } catch (error) {
      errors.push(`Invalid SKU: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate product name
    try {
      ProductName.create(data.name);
    } catch (error) {
      errors.push(
        `Invalid product name: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Validate unit
    try {
      UnitValueObject.create(data.unitCode, data.unitName, data.unitPrecision);
    } catch (error) {
      errors.push(`Invalid unit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate description if provided
    if (data.description !== undefined && data.description.trim().length > 1000) {
      errors.push('Description must be at most 1000 characters long');
    }

    // Validate barcode if provided
    if (data.barcode !== undefined && data.barcode.trim().length > 100) {
      errors.push('Barcode must be at most 100 characters long');
    }

    // Validate brand if provided
    if (data.brand !== undefined && data.brand.trim().length > 100) {
      errors.push('Brand must be at most 100 characters long');
    }

    // Validate model if provided
    if (data.model !== undefined && data.model.trim().length > 100) {
      errors.push('Model must be at most 100 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates product update data
   */
  public static validateProductUpdate(data: IProductUpdateValidation): IProductValidationResult {
    const errors: string[] = [];

    // Validate product name if provided
    if (data.name !== undefined) {
      try {
        ProductName.create(data.name);
      } catch (error) {
        errors.push(
          `Invalid product name: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Validate unit if provided (all unit fields must be provided together)
    if (
      data.unitCode !== undefined ||
      data.unitName !== undefined ||
      data.unitPrecision !== undefined
    ) {
      if (
        data.unitCode === undefined ||
        data.unitName === undefined ||
        data.unitPrecision === undefined
      ) {
        errors.push('Unit code, name, and precision must all be provided together');
      } else {
        try {
          UnitValueObject.create(data.unitCode, data.unitName, data.unitPrecision);
        } catch (error) {
          errors.push(`Invalid unit: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Validate description if provided
    if (data.description !== undefined && data.description.trim().length > 1000) {
      errors.push('Description must be at most 1000 characters long');
    }

    // Validate barcode if provided
    if (data.barcode !== undefined && data.barcode.trim().length > 100) {
      errors.push('Barcode must be at most 100 characters long');
    }

    // Validate brand if provided
    if (data.brand !== undefined && data.brand.trim().length > 100) {
      errors.push('Brand must be at most 100 characters long');
    }

    // Validate model if provided
    if (data.model !== undefined && data.model.trim().length > 100) {
      errors.push('Model must be at most 100 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates SKU uniqueness
   */
  public static async validateSkuUniqueness(
    sku: SKU,
    orgId: string,
    repository: IProductRepository
  ): Promise<boolean> {
    const existingProduct = await repository.findBySku(sku.getValue(), orgId);
    return existingProduct === null;
  }

  /**
   * Validates SKU uniqueness and throws ConflictException if not unique
   * This method integrates with ProductBusinessRulesService for consistency
   */
  public static async validateSkuUniquenessOrThrow(
    sku: SKU,
    orgId: string,
    repository: IProductRepository,
    excludeProductId?: string
  ): Promise<void> {
    const existingProduct = await repository.findBySku(sku.getValue(), orgId);

    if (existingProduct !== null) {
      if (excludeProductId && existingProduct.id === excludeProductId) {
        return; // Same product, SKU is valid
      }
      throw new ConflictException(`SKU '${sku.getValue()}' already exists in this organization`);
    }
  }

  /**
   * Validates that a product is valid for movement operations
   */
  public static validateProductForMovement(product: Product): IValidationResult {
    const errors: string[] = [];

    // Product must be active
    if (!product.isActive) {
      errors.push('Product must be active to perform movements');
    }

    // Product must have valid status
    if (!product.status.isActive()) {
      errors.push('Product status must be ACTIVE to perform movements');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
