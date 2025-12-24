import { ConflictException } from '@nestjs/common';
import { Product } from '@product/domain/entities/product.entity';
import { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface IStockRepository {
  hasStock(productId: string, orgId: string): Promise<boolean>;
  getTotalStock(productId: string, orgId: string): Promise<number>;
}

export interface IMovementRepository {
  hasMovements(productId: string, orgId: string): Promise<boolean>;
  hasPostedMovements(productId: string, orgId: string): Promise<boolean>;
}

// Export types for use in tests
export type {
  IMovementRepository as IProductMovementRepository,
  IStockRepository as IProductStockRepository,
};

export class ProductBusinessRulesService {
  /**
   * Validates product creation rules
   * - SKU must be unique per organization
   */
  public static async validateProductCreationRules(
    sku: SKU,
    orgId: string,
    repository: IProductRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    // Validate SKU uniqueness
    const existingProduct = await repository.findBySku(sku.getValue(), orgId);
    if (existingProduct !== null) {
      errors.push(`SKU '${sku.getValue()}' already exists in this organization`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates product update rules
   * - SKU must be unique per organization (excluding current product)
   * - Cost method cannot be changed if product has movements
   */
  public static async validateProductUpdateRules(
    productId: string,
    sku: SKU,
    orgId: string,
    repository: IProductRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    // Validate SKU uniqueness (excluding current product)
    const existingProduct = await repository.findBySku(sku.getValue(), orgId);
    if (existingProduct !== null && existingProduct.id !== productId) {
      errors.push(`SKU '${sku.getValue()}' already exists in this organization`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates SKU uniqueness and throws ConflictException if not unique
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
   * Validates that product can be deleted
   * - Product cannot be deleted if it has stock
   */
  public static async validateProductDeletion(
    productId: string,
    orgId: string,
    stockRepository: IStockRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    const hasStock = await stockRepository.hasStock(productId, orgId);
    if (hasStock) {
      errors.push('Product cannot be deleted because it has stock');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates product status transitions
   * - ACTIVE ↔ INACTIVE transitions are allowed
   * - DISCONTINUED status is final (cannot be changed)
   */
  public static validateStatusTransition(currentStatus: string): IValidationResult {
    const errors: string[] = [];

    // DISCONTINUED status is final
    if (currentStatus === 'DISCONTINUED') {
      errors.push('Cannot change status of a discontinued product');
      return {
        isValid: false,
        errors,
      };
    }

    // All other transitions are allowed
    return {
      isValid: true,
      errors: [],
    };
  }

  /**
   * Validates that cost method can be changed
   * - Cost method cannot be changed if product has posted movements
   */
  public static async validateCostMethodChange(
    productId: string,
    orgId: string,
    movementRepository: IMovementRepository
  ): Promise<IValidationResult> {
    const errors: string[] = [];

    const hasPostedMovements = await movementRepository.hasPostedMovements(productId, orgId);
    if (hasPostedMovements) {
      errors.push('Cost method cannot be changed because the product has posted movements');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that product is active for operations
   */
  public static validateProductIsActive(product: Product): IValidationResult {
    const errors: string[] = [];

    if (!product.isActive) {
      errors.push('Product must be active to perform this operation');
    }

    if (!product.status.isActive()) {
      errors.push('Product status must be ACTIVE to perform this operation');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
