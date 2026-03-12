import { describe, expect, it } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import {
  SaleAllSpecification,
  SaleByCustomerSpecification,
  SaleByDateRangeSpecification,
  SaleBySearchSpecification,
  SaleByStatusSpecification,
  SaleByWarehouseSpecification,
} from '@sale/domain/specifications/saleSpecifications';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';

describe('SaleSpecifications', () => {
  const mockOrgId = 'org-123';
  const mockWarehouseId = 'warehouse-123';

  const createMockSale = (
    overrides: Partial<{
      id: string;
      status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
      warehouseId: string;
      customerReference?: string;
      createdAt: Date;
    }> = {}
  ): Sale => {
    const sale = Sale.reconstitute(
      {
        saleNumber: SaleNumber.fromString('SALE-2024-001'),
        status: SaleStatus.create(overrides.status || 'DRAFT'),
        warehouseId: overrides.warehouseId || mockWarehouseId,
        customerReference: overrides.customerReference,
        createdBy: 'user-123',
      },
      overrides.id || 'sale-123',
      mockOrgId
    );

    // Mock createdAt if needed
    if (overrides.createdAt) {
      Object.defineProperty(sale, 'createdAt', {
        get: () => overrides.createdAt,
      });
    }

    return sale;
  };

  describe('SaleAllSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: any sale When: checking satisfaction Then: should always return true', () => {
        // Arrange
        const specification = new SaleAllSpecification();

        // Act
        const result = specification.isSatisfiedBy();

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a CONFIRMED sale When: checking satisfaction Then: should still return true', () => {
        // Arrange
        const specification = new SaleAllSpecification();

        // Act
        const result = specification.isSatisfiedBy();

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: SaleAllSpecification When: converting to Prisma where Then: should return only orgId', () => {
        // Arrange
        const specification = new SaleAllSpecification();

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({ orgId: mockOrgId });
      });
    });
  });

  describe('SaleBySearchSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a sale matching saleNumber When: checking satisfaction Then: should return true', () => {
        // Arrange
        const sale = createMockSale();
        const specification = new SaleBySearchSpecification('SALE-2024-001');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a sale matching customerReference When: checking satisfaction Then: should return true', () => {
        // Arrange
        const sale = createMockSale({ customerReference: 'CUST-REF-ABC' });
        const specification = new SaleBySearchSpecification('cust-ref');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a sale not matching search term When: checking satisfaction Then: should return false', () => {
        // Arrange
        const sale = createMockSale({ customerReference: undefined });
        const specification = new SaleBySearchSpecification('NONEXISTENT');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: search term When: converting to Prisma where Then: should return OR with contains clauses', () => {
        // Arrange
        const specification = new SaleBySearchSpecification('  Test Search  ');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          OR: [
            { saleNumber: { contains: 'test search', mode: 'insensitive' } },
            { customerReference: { contains: 'test search', mode: 'insensitive' } },
            { externalReference: { contains: 'test search', mode: 'insensitive' } },
          ],
        });
      });
    });
  });

  describe('SaleByStatusSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a DRAFT sale and DRAFT status specification When: checking satisfaction Then: should return true', () => {
        // Arrange
        const sale = createMockSale({ status: 'DRAFT' });
        const specification = new SaleByStatusSpecification('DRAFT');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a CONFIRMED sale and DRAFT status specification When: checking satisfaction Then: should return false', () => {
        // Arrange
        const sale = createMockSale({ status: 'CONFIRMED' });
        const specification = new SaleByStatusSpecification('DRAFT');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(false);
      });

      it('Given: a CANCELLED sale and CANCELLED status specification When: checking satisfaction Then: should return true', () => {
        // Arrange
        const sale = createMockSale({ status: 'CANCELLED' });
        const specification = new SaleByStatusSpecification('CANCELLED');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: DRAFT status specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new SaleByStatusSpecification('DRAFT');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          status: 'DRAFT',
        });
      });

      it('Given: CONFIRMED status specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new SaleByStatusSpecification('CONFIRMED');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          status: 'CONFIRMED',
        });
      });

      it('Given: multi-status specification When: converting to Prisma where Then: should return { in: statuses }', () => {
        // Arrange
        const specification = new SaleByStatusSpecification('DRAFT, CONFIRMED');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          status: { in: ['DRAFT', 'CONFIRMED'] },
        });
      });
    });
  });

  describe('SaleByWarehouseSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a sale in warehouse-123 and warehouse-123 specification When: checking satisfaction Then: should return true', () => {
        // Arrange
        const sale = createMockSale({ warehouseId: 'warehouse-123' });
        const specification = new SaleByWarehouseSpecification('warehouse-123');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a sale in warehouse-123 and warehouse-456 specification When: checking satisfaction Then: should return false', () => {
        // Arrange
        const sale = createMockSale({ warehouseId: 'warehouse-123' });
        const specification = new SaleByWarehouseSpecification('warehouse-456');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: warehouse specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new SaleByWarehouseSpecification('warehouse-specific');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          warehouseId: 'warehouse-specific',
        });
      });

      it('Given: multi-warehouse specification When: converting to Prisma where Then: should return { in: warehouseIds }', () => {
        // Arrange
        const specification = new SaleByWarehouseSpecification(
          'warehouse-1, warehouse-2, warehouse-3'
        );

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          warehouseId: { in: ['warehouse-1', 'warehouse-2', 'warehouse-3'] },
        });
      });
    });
  });

  describe('SaleByDateRangeSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a sale within date range When: checking satisfaction Then: should return true', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const saleDate = new Date('2024-06-15');

        const sale = createMockSale({ createdAt: saleDate });
        const specification = new SaleByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a sale before date range When: checking satisfaction Then: should return false', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const saleDate = new Date('2023-12-15');

        const sale = createMockSale({ createdAt: saleDate });
        const specification = new SaleByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(false);
      });

      it('Given: a sale after date range When: checking satisfaction Then: should return false', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const saleDate = new Date('2025-01-15');

        const sale = createMockSale({ createdAt: saleDate });
        const specification = new SaleByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(false);
      });

      it('Given: a sale at exact start date When: checking satisfaction Then: should return true', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

        const sale = createMockSale({ createdAt: startDate });
        const specification = new SaleByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a sale at exact end date When: checking satisfaction Then: should return true', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

        const sale = createMockSale({ createdAt: endDate });
        const specification = new SaleByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: date range specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const specification = new SaleByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        });
      });
    });
  });

  describe('SaleByCustomerSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a sale with matching customer reference When: checking satisfaction Then: should return true', () => {
        // Arrange
        const sale = createMockSale({ customerReference: 'customer-abc' });
        const specification = new SaleByCustomerSpecification('customer-abc');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a sale with different customer reference When: checking satisfaction Then: should return false', () => {
        // Arrange
        const sale = createMockSale({ customerReference: 'customer-abc' });
        const specification = new SaleByCustomerSpecification('customer-xyz');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(false);
      });

      it('Given: a sale without customer reference When: checking satisfaction Then: should return false', () => {
        // Arrange
        const sale = createMockSale({ customerReference: undefined });
        const specification = new SaleByCustomerSpecification('customer-abc');

        // Act
        const result = specification.isSatisfiedBy(sale);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: customer specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new SaleByCustomerSpecification('customer-specific');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          customerReference: 'customer-specific',
        });
      });
    });
  });
});
