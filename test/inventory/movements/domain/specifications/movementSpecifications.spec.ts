import { describe, expect, it } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import {
  MovementByDateRangeSpecification,
  MovementByProductSpecification,
  MovementByStatusSpecification,
  MovementByTypeSpecification,
  MovementByWarehouseSpecification,
} from '@movement/domain/specifications/movementSpecifications';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('MovementSpecifications', () => {
  const mockOrgId = 'org-123';
  const mockWarehouseId = 'warehouse-123';

  const createMockMovement = (
    overrides: Partial<{
      id: string;
      status: 'DRAFT' | 'POSTED' | 'VOID';
      type: 'IN' | 'OUT' | 'ADJUST_IN' | 'ADJUST_OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN';
      warehouseId: string;
      createdAt: Date;
    }> = {},
    lines: MovementLine[] = []
  ): Movement => {
    const movement = Movement.reconstitute(
      {
        type: MovementType.create(overrides.type || 'IN'),
        status: MovementStatus.create(overrides.status || 'DRAFT'),
        warehouseId: overrides.warehouseId || mockWarehouseId,
        createdBy: 'user-123',
      },
      overrides.id || 'movement-123',
      mockOrgId,
      lines
    );

    if (overrides.createdAt) {
      Object.defineProperty(movement, 'createdAt', {
        get: () => overrides.createdAt,
      });
    }

    return movement;
  };

  const createMockLine = (productId: string): MovementLine => {
    return MovementLine.reconstitute(
      {
        productId,
        locationId: 'location-123',
        quantity: Quantity.create(10, 2),
        currency: 'USD',
      },
      'line-123',
      mockOrgId
    );
  };

  describe('MovementByStatusSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a DRAFT movement and DRAFT status specification When: checking satisfaction Then: should return true', () => {
        // Arrange
        const movement = createMockMovement({ status: 'DRAFT' });
        const specification = new MovementByStatusSpecification('DRAFT');

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a POSTED movement and DRAFT status specification When: checking satisfaction Then: should return false', () => {
        // Arrange
        const movement = createMockMovement({ status: 'POSTED' });
        const specification = new MovementByStatusSpecification('DRAFT');

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(false);
      });

      it('Given: a VOID movement and VOID status specification When: checking satisfaction Then: should return true', () => {
        // Arrange
        const movement = createMockMovement({ status: 'VOID' });
        const specification = new MovementByStatusSpecification('VOID');

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: DRAFT status specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new MovementByStatusSpecification('DRAFT');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          status: 'DRAFT',
        });
      });

      it('Given: POSTED status specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new MovementByStatusSpecification('POSTED');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          status: 'POSTED',
        });
      });
    });
  });

  describe('MovementByTypeSpecification', () => {
    describe('isSatisfiedBy', () => {
      it.each([
        ['IN'],
        ['OUT'],
        ['ADJUST_IN'],
        ['ADJUST_OUT'],
        ['TRANSFER_IN'],
        ['TRANSFER_OUT'],
      ] as const)(
        'Given: a %s movement and matching type specification When: checking satisfaction Then: should return true',
        type => {
          // Arrange
          const movement = createMockMovement({ type });
          const specification = new MovementByTypeSpecification(type);

          // Act
          const result = specification.isSatisfiedBy(movement);

          // Assert
          expect(result).toBe(true);
        }
      );

      it('Given: an IN movement and OUT type specification When: checking satisfaction Then: should return false', () => {
        // Arrange
        const movement = createMockMovement({ type: 'IN' });
        const specification = new MovementByTypeSpecification('OUT');

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: IN type specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new MovementByTypeSpecification('IN');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          type: 'IN',
        });
      });
    });
  });

  describe('MovementByWarehouseSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a movement in warehouse-123 and warehouse-123 specification When: checking satisfaction Then: should return true', () => {
        // Arrange
        const movement = createMockMovement({ warehouseId: 'warehouse-123' });
        const specification = new MovementByWarehouseSpecification('warehouse-123');

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a movement in warehouse-123 and warehouse-456 specification When: checking satisfaction Then: should return false', () => {
        // Arrange
        const movement = createMockMovement({ warehouseId: 'warehouse-123' });
        const specification = new MovementByWarehouseSpecification('warehouse-456');

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: warehouse specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new MovementByWarehouseSpecification('warehouse-specific');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          warehouseId: 'warehouse-specific',
        });
      });
    });
  });

  describe('MovementByDateRangeSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a movement within date range When: checking satisfaction Then: should return true', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const movementDate = new Date('2024-06-15');

        const movement = createMockMovement({ createdAt: movementDate });
        const specification = new MovementByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a movement before date range When: checking satisfaction Then: should return false', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const movementDate = new Date('2023-12-15');

        const movement = createMockMovement({ createdAt: movementDate });
        const specification = new MovementByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(false);
      });

      it('Given: a movement after date range When: checking satisfaction Then: should return false', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const movementDate = new Date('2025-01-15');

        const movement = createMockMovement({ createdAt: movementDate });
        const specification = new MovementByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(false);
      });

      it('Given: a movement at exact start date When: checking satisfaction Then: should return true', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

        const movement = createMockMovement({ createdAt: startDate });
        const specification = new MovementByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a movement at exact end date When: checking satisfaction Then: should return true', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

        const movement = createMockMovement({ createdAt: endDate });
        const specification = new MovementByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: date range specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const specification = new MovementByDateRangeSpecification(startDate, endDate);

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

  describe('MovementByProductSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a movement with matching product line When: checking satisfaction Then: should return true', () => {
        // Arrange
        const line = createMockLine('product-abc');
        const movement = createMockMovement({}, [line]);
        const specification = new MovementByProductSpecification('product-abc');

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a movement without matching product line When: checking satisfaction Then: should return false', () => {
        // Arrange
        const line = createMockLine('product-abc');
        const movement = createMockMovement({}, [line]);
        const specification = new MovementByProductSpecification('product-xyz');

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(false);
      });

      it('Given: a movement without lines When: checking satisfaction Then: should return false', () => {
        // Arrange
        const movement = createMockMovement({}, []);
        const specification = new MovementByProductSpecification('product-abc');

        // Act
        const result = specification.isSatisfiedBy(movement);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: product specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new MovementByProductSpecification('product-specific');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          lines: {
            some: {
              productId: 'product-specific',
              orgId: mockOrgId,
            },
          },
        });
      });
    });
  });
});
