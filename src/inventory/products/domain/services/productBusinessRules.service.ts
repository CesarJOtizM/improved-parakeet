// Product Business Rules Service - Pure Functions + Async Validations
// Separates pure validation logic from async repository-dependent validations

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

// ============================================================================
// Pure Functions (no side effects, no async operations)
// ============================================================================

/**
 * Validates product status transitions
 * Pure function - no side effects
 * - ACTIVE ↔ INACTIVE transitions are allowed
 * - DISCONTINUED status is final (cannot be changed)
 */
export function validateProductStatusTransition(currentStatus: string): IValidationResult {
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
 * Validates that product is active for operations
 * Pure function - no side effects
 */
export function validateProductIsActivePure(product: Product): IValidationResult {
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

// ============================================================================
// Async Validation Functions (require repository access)
// ============================================================================

/**
 * Validates product creation rules
 * - SKU must be unique per organization
 */
export async function validateProductCreationRules(
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
 */
export async function validateProductUpdateRules(
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
export async function validateSkuUniquenessOrThrow(
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
export async function validateProductDeletion(
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
 * Validates that cost method can be changed
 * - Cost method cannot be changed if product has posted movements
 */
export async function validateCostMethodChange(
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

// ============================================================================
// Legacy Class Export (for backward compatibility)
// ============================================================================

/**
 * Legacy class export for backward compatibility
 * @deprecated Use pure functions and async validation functions instead
 */
export class ProductBusinessRulesService {
  /**
   * @deprecated Use validateProductCreationRules function instead
   */
  public static async validateProductCreationRules(
    sku: SKU,
    orgId: string,
    repository: IProductRepository
  ): Promise<IValidationResult> {
    return validateProductCreationRules(sku, orgId, repository);
  }

  /**
   * @deprecated Use validateProductUpdateRules function instead
   */
  public static async validateProductUpdateRules(
    productId: string,
    sku: SKU,
    orgId: string,
    repository: IProductRepository
  ): Promise<IValidationResult> {
    return validateProductUpdateRules(productId, sku, orgId, repository);
  }

  /**
   * @deprecated Use validateSkuUniquenessOrThrow function instead
   */
  public static async validateSkuUniquenessOrThrow(
    sku: SKU,
    orgId: string,
    repository: IProductRepository,
    excludeProductId?: string
  ): Promise<void> {
    return validateSkuUniquenessOrThrow(sku, orgId, repository, excludeProductId);
  }

  /**
   * @deprecated Use validateProductDeletion function instead
   */
  public static async validateProductDeletion(
    productId: string,
    orgId: string,
    stockRepository: IStockRepository
  ): Promise<IValidationResult> {
    return validateProductDeletion(productId, orgId, stockRepository);
  }

  /**
   * @deprecated Use validateProductStatusTransition function instead
   */
  public static validateStatusTransition(currentStatus: string): IValidationResult {
    return validateProductStatusTransition(currentStatus);
  }

  /**
   * @deprecated Use validateCostMethodChange function instead
   */
  public static async validateCostMethodChange(
    productId: string,
    orgId: string,
    movementRepository: IMovementRepository
  ): Promise<IValidationResult> {
    return validateCostMethodChange(productId, orgId, movementRepository);
  }

  /**
   * @deprecated Use validateProductIsActivePure function instead
   */
  public static validateProductIsActive(product: Product): IValidationResult {
    return validateProductIsActivePure(product);
  }
}
