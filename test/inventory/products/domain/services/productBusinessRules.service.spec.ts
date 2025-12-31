import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Product } from '@product/domain/entities/product.entity';
import { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import {
  ProductBusinessRulesService,
  type IProductMovementRepository,
  type IProductStockRepository,
} from '@product/domain/services/productBusinessRules.service';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';

import { ProductFactory } from '../../factories/product.factory';

describe('ProductBusinessRulesService', () => {
  const mockOrgId = 'test-org-id';

  describe('validateProductCreationRules', () => {
    it('Given: unique SKU When: validating creation rules Then: should return valid', async () => {
      // Arrange
      const skuResult = SKU.create('PROD-001');
      if (skuResult.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = skuResult.unwrap();
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(null),
      } as unknown as IProductRepository;

      // Act
      const result = await ProductBusinessRulesService.validateProductCreationRules(
        sku,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockRepository.findBySku).toHaveBeenCalledWith('PROD-001', mockOrgId);
    });

    it('Given: existing SKU When: validating creation rules Then: should return errors', async () => {
      // Arrange
      const skuResult = SKU.create('PROD-001');
      if (skuResult.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = skuResult.unwrap();
      const existingProduct = ProductFactory.create({ sku }, mockOrgId);
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(existingProduct),
      } as unknown as IProductRepository;

      // Act
      const result = await ProductBusinessRulesService.validateProductCreationRules(
        sku,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("SKU 'PROD-001' already exists");
    });
  });

  describe('validateProductUpdateRules', () => {
    it('Given: unique SKU When: validating update rules Then: should return valid', async () => {
      // Arrange
      const productId = 'product-123';
      const skuResult = SKU.create('PROD-002');
      if (skuResult.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = skuResult.unwrap();
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(null),
      } as unknown as IProductRepository;

      // Act
      const result = await ProductBusinessRulesService.validateProductUpdateRules(
        productId,
        sku,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: existing SKU for different product When: validating update rules Then: should return errors', async () => {
      // Arrange
      const productId = 'product-123';
      const skuResult = SKU.create('PROD-001');
      if (skuResult.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = skuResult.unwrap();
      const existingProduct = ProductFactory.create({ sku }, mockOrgId);
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(existingProduct),
      } as unknown as IProductRepository;

      // Act
      const result = await ProductBusinessRulesService.validateProductUpdateRules(
        productId,
        sku,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('Given: existing SKU for same product When: validating update rules Then: should return valid', async () => {
      // Arrange
      const existingProduct = ProductFactory.create({}, mockOrgId);
      const sku = existingProduct.sku;
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(existingProduct),
      } as unknown as IProductRepository;

      // Act
      const result = await ProductBusinessRulesService.validateProductUpdateRules(
        existingProduct.id,
        sku,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSkuUniquenessOrThrow', () => {
    it('Given: unique SKU When: validating uniqueness Then: should not throw', async () => {
      // Arrange
      const skuResult = SKU.create('PROD-001');
      if (skuResult.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = skuResult.unwrap();
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(null),
      } as unknown as IProductRepository;

      // Act & Assert
      await expect(
        ProductBusinessRulesService.validateSkuUniquenessOrThrow(sku, mockOrgId, mockRepository)
      ).resolves.toBeUndefined();
    });

    it('Given: existing SKU When: validating uniqueness Then: should throw ConflictException', async () => {
      // Arrange
      const skuResult = SKU.create('PROD-001');
      if (skuResult.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = skuResult.unwrap();
      const existingProduct = ProductFactory.create({ sku }, mockOrgId);
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(existingProduct),
      } as unknown as IProductRepository;

      // Act & Assert
      await expect(
        ProductBusinessRulesService.validateSkuUniquenessOrThrow(sku, mockOrgId, mockRepository)
      ).rejects.toThrow(ConflictException);
      await expect(
        ProductBusinessRulesService.validateSkuUniquenessOrThrow(sku, mockOrgId, mockRepository)
      ).rejects.toThrow("SKU 'PROD-001' already exists in this organization");
    });

    it('Given: existing SKU with excludeProductId matching When: validating uniqueness Then: should not throw', async () => {
      // Arrange
      const existingProduct = ProductFactory.create({}, mockOrgId);
      const sku = existingProduct.sku;
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(existingProduct),
      } as unknown as IProductRepository;

      // Act & Assert
      await expect(
        ProductBusinessRulesService.validateSkuUniquenessOrThrow(
          sku,
          mockOrgId,
          mockRepository,
          existingProduct.id
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('validateProductDeletion', () => {
    it('Given: product without stock When: validating deletion Then: should return valid', async () => {
      // Arrange
      const productId = 'product-123';
      const mockStockRepository: IProductStockRepository = {
        hasStock: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
        getTotalStock: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      };

      // Act
      const result = await ProductBusinessRulesService.validateProductDeletion(
        productId,
        mockOrgId,
        mockStockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockStockRepository.hasStock).toHaveBeenCalledWith(productId, mockOrgId);
    });

    it('Given: product with stock When: validating deletion Then: should return errors', async () => {
      // Arrange
      const productId = 'product-123';
      const mockStockRepository: IProductStockRepository = {
        hasStock: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        getTotalStock: jest.fn<() => Promise<number>>().mockResolvedValue(10),
      };

      // Act
      const result = await ProductBusinessRulesService.validateProductDeletion(
        productId,
        mockOrgId,
        mockStockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('cannot be deleted because it has stock');
    });
  });

  describe('validateStatusTransition', () => {
    it('Given: ACTIVE to INACTIVE When: validating transition Then: should return valid', () => {
      // Arrange & Act
      const result = ProductBusinessRulesService.validateStatusTransition('ACTIVE');

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: INACTIVE to ACTIVE When: validating transition Then: should return valid', () => {
      // Arrange & Act
      const result = ProductBusinessRulesService.validateStatusTransition('INACTIVE');

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: DISCONTINUED to ACTIVE When: validating transition Then: should return errors', () => {
      // Arrange & Act
      const result = ProductBusinessRulesService.validateStatusTransition('DISCONTINUED');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Cannot change status of a discontinued product');
    });

    it('Given: DISCONTINUED to INACTIVE When: validating transition Then: should return errors', () => {
      // Arrange & Act
      const result = ProductBusinessRulesService.validateStatusTransition('DISCONTINUED');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateCostMethodChange', () => {
    it('Given: product without posted movements When: validating cost method change Then: should return valid', async () => {
      // Arrange
      const productId = 'product-123';
      const mockMovementRepository: IProductMovementRepository = {
        hasMovements: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
        hasPostedMovements: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      };

      // Act
      const result = await ProductBusinessRulesService.validateCostMethodChange(
        productId,
        mockOrgId,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockMovementRepository.hasPostedMovements).toHaveBeenCalledWith(productId, mockOrgId);
    });

    it('Given: product with posted movements When: validating cost method change Then: should return errors', async () => {
      // Arrange
      const productId = 'product-123';
      const mockMovementRepository: IProductMovementRepository = {
        hasMovements: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        hasPostedMovements: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      };

      // Act
      const result = await ProductBusinessRulesService.validateCostMethodChange(
        productId,
        mockOrgId,
        mockMovementRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain(
        'Cost method cannot be changed because the product has posted movements'
      );
    });
  });

  describe('validateProductIsActive', () => {
    it('Given: active product When: validating is active Then: should return valid', () => {
      // Arrange
      const product = ProductFactory.create({}, mockOrgId);

      // Act
      const result = ProductBusinessRulesService.validateProductIsActive(product);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: inactive product When: validating is active Then: should return errors', () => {
      // Arrange
      const product = ProductFactory.createInactive({}, mockOrgId);

      // Act
      const result = ProductBusinessRulesService.validateProductIsActive(product);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('Given: discontinued product When: validating is active Then: should return errors', () => {
      // Arrange
      const product = ProductFactory.createDiscontinued({}, mockOrgId);

      // Act
      const result = ProductBusinessRulesService.validateProductIsActive(product);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
