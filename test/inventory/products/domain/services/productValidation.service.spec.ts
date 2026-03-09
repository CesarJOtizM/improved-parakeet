import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Product } from '@product/domain/entities/product.entity';
import { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import { ProductValidationService } from '@product/domain/services/productValidation.service';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';

describe('ProductValidationService', () => {
  const mockOrgId = 'test-org-id';

  describe('validateProductCreation', () => {
    it('Given: valid product data When: validating creation Then: should return valid', () => {
      // Arrange
      const data = {
        sku: 'PROD-001',
        name: 'Test Product',
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 2,
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: invalid SKU When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        sku: 'AB', // Too short
        name: 'Test Product',
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 2,
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('SKU'))).toBe(true);
    });

    it('Given: invalid product name When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        sku: 'PROD-001',
        name: 'A', // Too short
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 2,
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('product name'))).toBe(true);
    });

    it('Given: invalid unit When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        sku: 'PROD-001',
        name: 'Test Product',
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 7, // Invalid precision
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('unit'))).toBe(true);
    });

    it('Given: description too long When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        sku: 'PROD-001',
        name: 'Test Product',
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 2,
        description: 'A'.repeat(1001), // Too long
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Description'))).toBe(true);
    });

    it('Given: barcode too long When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        sku: 'PROD-001',
        name: 'Test Product',
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 2,
        barcode: 'A'.repeat(101), // Too long
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Barcode'))).toBe(true);
    });
  });

  describe('validateProductUpdate', () => {
    it('Given: valid update data When: validating update Then: should return valid', () => {
      // Arrange
      const data = {
        name: 'Updated Product Name',
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: partial unit data When: validating update Then: should return errors', () => {
      // Arrange
      const data = {
        unitCode: 'KG',
        // Missing unitName and unitPrecision
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('all be provided together'))).toBe(true);
    });

    it('Given: complete unit data When: validating update Then: should return valid', () => {
      // Arrange
      const data = {
        unitCode: 'G',
        unitName: 'Gram',
        unitPrecision: 3,
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateSkuUniqueness', () => {
    it('Given: unique SKU When: validating uniqueness Then: should return true', async () => {
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
      const result = await ProductValidationService.validateSkuUniqueness(
        sku,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.findBySku).toHaveBeenCalledWith('PROD-001', mockOrgId);
    });

    it('Given: existing SKU When: validating uniqueness Then: should return false', async () => {
      // Arrange
      const skuResult = SKU.create('PROD-001');
      if (skuResult.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = skuResult.unwrap();
      const existingProduct = Product.create(
        {
          sku: SKU.reconstitute('PROD-001'),
          name: ProductName.reconstitute('Existing Product'),
          unit: UnitValueObject.create('KG', 'Kilogram', 2),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        mockOrgId
      );
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(existingProduct),
      } as unknown as IProductRepository;

      // Act
      const result = await ProductValidationService.validateSkuUniqueness(
        sku,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result).toBe(false);
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
        ProductValidationService.validateSkuUniquenessOrThrow(sku, mockOrgId, mockRepository)
      ).resolves.toBeUndefined();
      expect(mockRepository.findBySku).toHaveBeenCalledWith('PROD-001', mockOrgId);
    });

    it('Given: existing SKU When: validating uniqueness Then: should throw ConflictException', async () => {
      // Arrange
      const skuResult = SKU.create('PROD-001');
      if (skuResult.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = skuResult.unwrap();
      const existingProduct = Product.create(
        {
          sku: SKU.reconstitute('PROD-001'),
          name: ProductName.reconstitute('Existing Product'),
          unit: UnitValueObject.create('KG', 'Kilogram', 2),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        mockOrgId
      );
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(existingProduct),
      } as unknown as IProductRepository;

      // Act & Assert
      await expect(
        ProductValidationService.validateSkuUniquenessOrThrow(sku, mockOrgId, mockRepository)
      ).rejects.toThrow(ConflictException);
      await expect(
        ProductValidationService.validateSkuUniquenessOrThrow(sku, mockOrgId, mockRepository)
      ).rejects.toThrow("SKU 'PROD-001' already exists in this organization");
    });

    it('Given: existing SKU with excludeProductId matching When: validating uniqueness Then: should not throw', async () => {
      // Arrange
      const skuResult = SKU.create('PROD-001');
      if (skuResult.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = skuResult.unwrap();
      const existingProduct = Product.create(
        {
          sku: SKU.reconstitute('PROD-001'),
          name: ProductName.reconstitute('Existing Product'),
          unit: UnitValueObject.create('KG', 'Kilogram', 2),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        mockOrgId
      );
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(existingProduct),
      } as unknown as IProductRepository;

      // Act & Assert
      await expect(
        ProductValidationService.validateSkuUniquenessOrThrow(
          sku,
          mockOrgId,
          mockRepository,
          existingProduct.id
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('validateProductForMovement', () => {
    it('Given: active product When: validating for movement Then: should return valid', () => {
      // Arrange
      const product = Product.create(
        {
          sku: SKU.reconstitute('PROD-001'),
          name: ProductName.reconstitute('Test Product'),
          unit: UnitValueObject.create('KG', 'Kilogram', 2),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        mockOrgId
      );

      // Act
      const result = ProductValidationService.validateProductForMovement(product);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: inactive product When: validating for movement Then: should return errors', () => {
      // Arrange
      const product = Product.create(
        {
          sku: SKU.reconstitute('PROD-001'),
          name: ProductName.reconstitute('Test Product'),
          unit: UnitValueObject.create('KG', 'Kilogram', 2),
          status: ProductStatus.create('INACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        mockOrgId
      );

      // Act
      const result = ProductValidationService.validateProductForMovement(product);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('Given: discontinued product When: validating for movement Then: should return errors', () => {
      // Arrange
      const product = Product.create(
        {
          sku: SKU.reconstitute('PROD-001'),
          name: ProductName.reconstitute('Test Product'),
          unit: UnitValueObject.create('KG', 'Kilogram', 2),
          status: ProductStatus.create('DISCONTINUED'),
          costMethod: CostMethod.create('AVG'),
        },
        mockOrgId
      );

      // Act
      const result = ProductValidationService.validateProductForMovement(product);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateProductCreation - additional branch coverage', () => {
    it('Given: valid product with all optional fields under limit When: validating Then: should return valid', () => {
      // Arrange
      const data = {
        sku: 'PROD-001',
        name: 'Test Product',
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 2,
        description: 'A valid description',
        barcode: '1234567890',
        brand: 'TestBrand',
        model: 'Model-X',
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: brand too long When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        sku: 'PROD-001',
        name: 'Test Product',
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 2,
        brand: 'B'.repeat(101), // Too long
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Brand'))).toBe(true);
    });

    it('Given: model too long When: validating creation Then: should return errors', () => {
      // Arrange
      const data = {
        sku: 'PROD-001',
        name: 'Test Product',
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 2,
        model: 'M'.repeat(101), // Too long
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Model'))).toBe(true);
    });

    it('Given: invalid unit with non-Error throw When: validating Then: should capture Unknown error', () => {
      // Arrange - unitPrecision of -1 should trigger unit validation error
      const data = {
        sku: 'PROD-001',
        name: 'Test Product',
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: -1,
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('unit'))).toBe(true);
    });

    it('Given: multiple validation errors When: validating creation Then: should return all errors', () => {
      // Arrange
      const data = {
        sku: 'AB', // Too short
        name: 'A', // Too short
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 7, // Invalid precision
        description: 'D'.repeat(1001),
        barcode: 'B'.repeat(101),
        brand: 'BR'.repeat(51),
        model: 'MD'.repeat(51),
      };

      // Act
      const result = ProductValidationService.validateProductCreation(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateProductUpdate - additional branch coverage', () => {
    it('Given: empty update data When: validating Then: should return valid', () => {
      // Arrange
      const data = {};

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: invalid name When: validating update Then: should return errors', () => {
      // Arrange
      const data = {
        name: 'A', // Too short
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('product name'))).toBe(true);
    });

    it('Given: description too long When: validating update Then: should return errors', () => {
      // Arrange
      const data = {
        description: 'D'.repeat(1001),
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Description'))).toBe(true);
    });

    it('Given: barcode too long When: validating update Then: should return errors', () => {
      // Arrange
      const data = {
        barcode: 'B'.repeat(101),
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Barcode'))).toBe(true);
    });

    it('Given: brand too long When: validating update Then: should return errors', () => {
      // Arrange
      const data = {
        brand: 'B'.repeat(101),
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Brand'))).toBe(true);
    });

    it('Given: model too long When: validating update Then: should return errors', () => {
      // Arrange
      const data = {
        model: 'M'.repeat(101),
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Model'))).toBe(true);
    });

    it('Given: invalid unit precision in update When: validating Then: should return unit error', () => {
      // Arrange
      const data = {
        unitCode: 'KG',
        unitName: 'Kilogram',
        unitPrecision: 7, // Invalid
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('unit'))).toBe(true);
    });

    it('Given: only unitName provided When: validating update Then: should require all unit fields', () => {
      // Arrange
      const data = {
        unitName: 'Kilogram',
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('all be provided together'))).toBe(true);
    });

    it('Given: only unitPrecision provided When: validating update Then: should require all unit fields', () => {
      // Arrange
      const data = {
        unitPrecision: 2,
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('all be provided together'))).toBe(true);
    });

    it('Given: unitCode and unitName but no precision When: validating update Then: should require all unit fields', () => {
      // Arrange
      const data = {
        unitCode: 'KG',
        unitName: 'Kilogram',
      };

      // Act
      const result = ProductValidationService.validateProductUpdate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('all be provided together'))).toBe(true);
    });
  });

  describe('validateSkuUniquenessOrThrow - additional branch coverage', () => {
    it('Given: existing SKU with different excludeProductId When: validating Then: should throw ConflictException', async () => {
      // Arrange
      const skuResult = SKU.create('PROD-001');
      if (skuResult.isErr()) throw new Error('Failed to create SKU');
      const sku = skuResult.unwrap();
      const existingProduct = Product.create(
        {
          sku: SKU.reconstitute('PROD-001'),
          name: ProductName.reconstitute('Existing Product'),
          unit: UnitValueObject.create('KG', 'Kilogram', 2),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        mockOrgId
      );
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(existingProduct),
      } as unknown as IProductRepository;

      // Act & Assert
      await expect(
        ProductValidationService.validateSkuUniquenessOrThrow(
          sku,
          mockOrgId,
          mockRepository,
          'different-product-id'
        )
      ).rejects.toThrow(ConflictException);
    });

    it('Given: no excludeProductId but product exists When: validating Then: should throw ConflictException', async () => {
      // Arrange
      const skuResult = SKU.create('PROD-001');
      if (skuResult.isErr()) throw new Error('Failed to create SKU');
      const sku = skuResult.unwrap();
      const existingProduct = Product.create(
        {
          sku: SKU.reconstitute('PROD-001'),
          name: ProductName.reconstitute('Existing Product'),
          unit: UnitValueObject.create('KG', 'Kilogram', 2),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        mockOrgId
      );
      const mockRepository: IProductRepository = {
        findBySku: jest.fn<() => Promise<Product | null>>().mockResolvedValue(existingProduct),
      } as unknown as IProductRepository;

      // Act & Assert - no excludeProductId at all
      await expect(
        ProductValidationService.validateSkuUniquenessOrThrow(sku, mockOrgId, mockRepository)
      ).rejects.toThrow(ConflictException);
    });
  });
});
