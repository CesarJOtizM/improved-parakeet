import {
  ProductByCategorySpecification,
  ProductByDateRangeSpecification,
  ProductByStatusSpecification,
  ProductByWarehouseSpecification,
  ProductLowStockSpecification,
} from '@inventory/products/domain/specifications/productSpecifications';
import { ProductStatus } from '@inventory/products/domain/valueObjects/productStatus.valueObject';
import { describe, expect, it } from '@jest/globals';

import { ProductFactory } from '../../factories/product.factory';

describe('Product Specifications', () => {
  const orgId = 'org-123';

  describe('ProductByStatusSpecification', () => {
    it('Given: active status When: checking product Then: should match status', () => {
      // Arrange
      const product = ProductFactory.create({ status: ProductStatus.create('ACTIVE') }, orgId);
      const spec = new ProductByStatusSpecification('ACTIVE');

      // Act
      const result = spec.isSatisfiedBy(product);
      const where = spec.toPrismaWhere(orgId);

      // Assert
      expect(result).toBe(true);
      expect(where).toEqual({ orgId, isActive: true });
    });
  });

  describe('ProductByWarehouseSpecification', () => {
    it('Given: warehouse id When: building prisma where Then: should include stock join', () => {
      // Arrange
      const spec = new ProductByWarehouseSpecification('warehouse-1');

      // Act
      const where = spec.toPrismaWhere(orgId);

      // Assert
      expect(where).toEqual({
        orgId,
        stock: {
          some: {
            warehouseId: 'warehouse-1',
            orgId,
          },
        },
      });
    });
  });

  describe('ProductLowStockSpecification', () => {
    it('Given: threshold When: building prisma where Then: should return org filter', () => {
      // Arrange
      const spec = new ProductLowStockSpecification(5);

      // Act
      const where = spec.toPrismaWhere(orgId);

      // Assert
      expect(where).toEqual({ orgId });
    });
  });

  describe('ProductByDateRangeSpecification', () => {
    it('Given: date range When: checking product Then: should match range', () => {
      // Arrange
      const now = Date.now();
      const start = new Date(now - 1000);
      const end = new Date(now + 1000);
      const spec = new ProductByDateRangeSpecification(start, end);
      const product = ProductFactory.create({}, orgId);

      // Act
      const result = spec.isSatisfiedBy(product);
      const where = spec.toPrismaWhere(orgId);

      // Assert
      expect(result).toBe(true);
      expect(where).toEqual({
        orgId,
        createdAt: {
          gte: start,
          lte: end,
        },
      });
    });
  });

  describe('ProductByCategorySpecification', () => {
    it('Given: category When: building prisma where Then: should include category filter', () => {
      // Arrange
      const spec = new ProductByCategorySpecification('category-1');

      // Act
      const where = spec.toPrismaWhere(orgId);

      // Assert
      expect(where).toEqual({ orgId, category: 'category-1' });
    });
  });
});
