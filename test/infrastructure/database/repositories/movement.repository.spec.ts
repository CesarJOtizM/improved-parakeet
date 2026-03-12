import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaMovementRepository } from '@infrastructure/database/repositories/movement.repository';
import { Money } from '@inventory/stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';

describe('PrismaMovementRepository', () => {
  let repository: PrismaMovementRepository;

  type MockFn = jest.Mock<any>;

  let mockPrismaService: {
    movement: Record<string, MockFn>;
    movementLine: Record<string, MockFn>;
    $transaction: MockFn;
  };

  const mockLineData = {
    id: 'line-123',
    movementId: 'movement-123',
    productId: 'product-123',
    locationId: 'location-123',
    quantity: 10,
    unitCost: 25.5,
    currency: 'COP',
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMovementData = {
    id: 'movement-123',
    type: 'IN',
    status: 'DRAFT',
    warehouseId: 'warehouse-123',
    reference: 'REF-001',
    reason: 'Purchase',
    notes: 'Test movement',
    postedAt: null,
    createdBy: 'user-123',
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    lines: [mockLineData],
  };

  beforeEach(() => {
    mockPrismaService = {
      movement: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      movementLine: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrismaService)
      ),
    };

    repository = new PrismaMovementRepository(mockPrismaService as unknown as PrismaService);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return movement with lines', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue(mockMovementData);

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('movement-123');
      expect(result?.type.getValue()).toBe('IN');
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: wrong orgId When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        orgId: 'different-org',
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by id Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(repository.findById('movement-123', 'org-123')).rejects.toThrow(
        'Database error'
      );
    });

    it('Given: non-Error thrown When: finding by id Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findById('movement-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findByIdWithoutLines', () => {
    it('Given: valid id When: finding without lines Then: should return movement', async () => {
      // Arrange
      const movementWithoutLines = { ...mockMovementData, lines: undefined };
      delete movementWithoutLines.lines;
      mockPrismaService.movement.findUnique.mockResolvedValue(movementWithoutLines);

      // Act
      const result = await repository.findByIdWithoutLines('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('movement-123');
    });

    it('Given: non-existent id When: finding without lines Then: should return null', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findByIdWithoutLines('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding without lines Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockRejectedValue(new Error('Query failed'));

      // Act & Assert
      await expect(repository.findByIdWithoutLines('movement-123', 'org-123')).rejects.toThrow(
        'Query failed'
      );
    });
  });

  describe('loadLines', () => {
    it('Given: movement has lines When: loading lines Then: should return lines', async () => {
      // Arrange
      mockPrismaService.movementLine.findMany.mockResolvedValue([mockLineData]);

      // Act
      const result = await repository.loadLines('movement-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('product-123');
    });

    it('Given: line with null unitCost When: loading lines Then: should handle null cost', async () => {
      // Arrange
      mockPrismaService.movementLine.findMany.mockResolvedValue([
        { ...mockLineData, unitCost: null },
      ]);

      // Act
      const result = await repository.loadLines('movement-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].unitCost).toBeUndefined();
    });

    it('Given: line with Decimal unitCost When: loading lines Then: should convert', async () => {
      // Arrange
      mockPrismaService.movementLine.findMany.mockResolvedValue([
        { ...mockLineData, unitCost: { toNumber: () => 30.5 } },
      ]);

      // Act
      const result = await repository.loadLines('movement-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].unitCost?.getAmount()).toBe(30.5);
    });

    it('Given: database error When: loading lines Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movementLine.findMany.mockRejectedValue(new Error('Lines query failed'));

      // Act & Assert
      await expect(repository.loadLines('movement-123', 'org-123')).rejects.toThrow(
        'Lines query failed'
      );
    });
  });

  describe('findAllWithoutLines', () => {
    it('Given: movements exist When: finding all without lines Then: should return paginated results', async () => {
      // Arrange
      const movementWithoutLines = { ...mockMovementData, lines: undefined };
      delete movementWithoutLines.lines;
      mockPrismaService.movement.findMany.mockResolvedValue([movementWithoutLines]);
      mockPrismaService.movement.count.mockResolvedValue(1);

      // Act
      const result = await repository.findAllWithoutLines('org-123', { skip: 0, take: 20 });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('Given: more movements than page size When: finding Then: should indicate hasMore', async () => {
      // Arrange
      const movements = Array(21).fill({ ...mockMovementData, lines: undefined });
      mockPrismaService.movement.findMany.mockResolvedValue(movements);
      mockPrismaService.movement.count.mockResolvedValue(25);

      // Act
      const result = await repository.findAllWithoutLines('org-123', { skip: 0, take: 20 });

      // Assert
      expect(result.hasMore).toBe(true);
      expect(result.data).toHaveLength(20);
    });

    it('Given: database error When: finding all without lines Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('Pagination failed'));

      // Act & Assert
      await expect(repository.findAllWithoutLines('org-123')).rejects.toThrow('Pagination failed');
    });
  });

  describe('findAll', () => {
    it('Given: movements exist When: finding all Then: should return all movements', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockResolvedValue([mockMovementData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding all Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('FindAll failed'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('FindAll failed');
    });
  });

  describe('exists', () => {
    it('Given: movement exists When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.movement.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('movement-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: movement does not exist When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.movement.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.count.mockRejectedValue(new Error('Count failed'));

      // Act & Assert
      await expect(repository.exists('movement-123', 'org-123')).rejects.toThrow('Count failed');
    });
  });

  describe('save', () => {
    it('Given: existing movement When: saving Then: should update movement', async () => {
      // Arrange
      const line = MovementLine.reconstitute(
        {
          productId: 'product-123',
          locationId: 'location-123',
          quantity: Quantity.create(10, 0),
          unitCost: Money.create(25.5, 'COP', 2),
          currency: 'COP',
        },
        'line-123',
        'org-123'
      );
      const movement = Movement.reconstitute(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: 'warehouse-123',
          reference: 'REF-001',
          createdBy: 'user-123',
        },
        'movement-123',
        'org-123'
      );
      movement.addLine(line);

      mockPrismaService.movement.findUnique.mockResolvedValueOnce(mockMovementData);
      mockPrismaService.movement.update.mockResolvedValue(mockMovementData);
      mockPrismaService.movementLine.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.movementLine.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.movement.findUnique.mockResolvedValueOnce(mockMovementData);

      // Act
      const result = await repository.save(movement);

      // Assert
      expect(result).not.toBeNull();
    });

    it('Given: new movement When: saving Then: should create movement', async () => {
      // Arrange
      const movement = Movement.create(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        'org-123'
      );

      // First findUnique call returns null (movement doesn't exist)
      // Second findUnique call returns the created movement with lines
      mockPrismaService.movement.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockMovementData);
      mockPrismaService.movement.create.mockResolvedValue(mockMovementData);
      mockPrismaService.movementLine.createMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await repository.save(movement);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.movement.create).toHaveBeenCalled();
    });

    it('Given: database error When: saving Then: should throw error', async () => {
      // Arrange
      const movement = Movement.reconstitute(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        'movement-123',
        'org-123'
      );

      mockPrismaService.$transaction.mockRejectedValue(new Error('Transaction failed'));

      // Act & Assert
      await expect(repository.save(movement)).rejects.toThrow('Transaction failed');
    });
  });

  describe('delete', () => {
    it('Given: existing movement When: deleting Then: should delete movement and lines', async () => {
      // Arrange
      mockPrismaService.movementLine.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.movement.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await repository.delete('movement-123', 'org-123');

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('Given: database error When: deleting Then: should throw error', async () => {
      // Arrange
      mockPrismaService.$transaction.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('movement-123', 'org-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('findByWarehouse', () => {
    it('Given: movements in warehouse When: finding Then: should return them', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockResolvedValue([mockMovementData]);

      // Act
      const result = await repository.findByWarehouse('warehouse-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding by warehouse Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('Warehouse query failed'));

      // Act & Assert
      await expect(repository.findByWarehouse('warehouse-123', 'org-123')).rejects.toThrow(
        'Warehouse query failed'
      );
    });
  });

  describe('findByStatus', () => {
    it('Given: movements with status When: finding Then: should return them', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockResolvedValue([mockMovementData]);

      // Act
      const result = await repository.findByStatus('DRAFT', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding by status Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('Status query failed'));

      // Act & Assert
      await expect(repository.findByStatus('DRAFT', 'org-123')).rejects.toThrow(
        'Status query failed'
      );
    });
  });

  describe('findByType', () => {
    it('Given: movements with type When: finding Then: should return them', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockResolvedValue([mockMovementData]);

      // Act
      const result = await repository.findByType('IN', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding by type Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('Type query failed'));

      // Act & Assert
      await expect(repository.findByType('IN', 'org-123')).rejects.toThrow('Type query failed');
    });
  });

  describe('findByDateRange', () => {
    it('Given: movements in date range When: finding Then: should return them', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      mockPrismaService.movement.findMany.mockResolvedValue([mockMovementData]);

      // Act
      const result = await repository.findByDateRange(startDate, endDate, 'org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding by date range Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('Date range query failed'));

      // Act & Assert
      await expect(repository.findByDateRange(new Date(), new Date(), 'org-123')).rejects.toThrow(
        'Date range query failed'
      );
    });
  });

  describe('findByProduct', () => {
    it('Given: movements with product When: finding Then: should return them', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockResolvedValue([mockMovementData]);

      // Act
      const result = await repository.findByProduct('product-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding by product Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('Product query failed'));

      // Act & Assert
      await expect(repository.findByProduct('product-123', 'org-123')).rejects.toThrow(
        'Product query failed'
      );
    });
  });

  describe('findDraftMovements', () => {
    it('Given: draft movements exist When: finding drafts Then: should return them', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockResolvedValue([mockMovementData]);

      // Act
      const result = await repository.findDraftMovements('org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding drafts Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('Draft query failed'));

      // Act & Assert
      await expect(repository.findDraftMovements('org-123')).rejects.toThrow('Draft query failed');
    });
  });

  describe('findPostedMovements', () => {
    it('Given: posted movements exist When: finding posted Then: should return them', async () => {
      // Arrange
      const postedMovement = { ...mockMovementData, status: 'POSTED' };
      mockPrismaService.movement.findMany.mockResolvedValue([postedMovement]);

      // Act
      const result = await repository.findPostedMovements('org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding posted Then: should throw error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('Posted query failed'));

      // Act & Assert
      await expect(repository.findPostedMovements('org-123')).rejects.toThrow(
        'Posted query failed'
      );
    });
  });

  describe('findBySpecification', () => {
    it('Given: specification matches When: finding by spec Then: should return results', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.movement.findMany.mockResolvedValue([mockMovementData]);
      mockPrismaService.movement.count.mockResolvedValue(1);

      // Act
      const result = await repository.findBySpecification(mockSpec as any, 'org-123', {
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('Given: database error When: finding by spec Then: should throw error', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({}),
      };
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('Spec query failed'));

      // Act & Assert
      await expect(repository.findBySpecification(mockSpec as any, 'org-123')).rejects.toThrow(
        'Spec query failed'
      );
    });

    it('Given: no pagination options When: finding by spec Then: should return hasMore false', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.movement.findMany.mockResolvedValue([mockMovementData]);
      mockPrismaService.movement.count.mockResolvedValue(1);

      // Act
      const result = await repository.findBySpecification(mockSpec as any, 'org-123');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('Given: skip + take < total When: finding by spec Then: should return hasMore true', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.movement.findMany.mockResolvedValue([mockMovementData]);
      mockPrismaService.movement.count.mockResolvedValue(20);

      // Act
      const result = await repository.findBySpecification(mockSpec as any, 'org-123', {
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.hasMore).toBe(true);
    });

    it('Given: non-Error thrown When: finding by spec Then: should propagate non-Error', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({}),
      };
      mockPrismaService.movement.findMany.mockRejectedValue('spec-error');

      // Act & Assert
      await expect(repository.findBySpecification(mockSpec as any, 'org-123')).rejects.toBe(
        'spec-error'
      );
    });
  });

  describe('line mapping with optional fields null', () => {
    it('Given: line with null locationId When: mapping Then: should map locationId to undefined', async () => {
      // Arrange
      const lineWithNullLocation = { ...mockLineData, locationId: null };
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        lines: [lineWithNullLocation],
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      const lines = result!.getLines();
      expect(lines).toHaveLength(1);
      expect(lines[0].locationId).toBeUndefined();
    });

    it('Given: movement with null contactId When: mapping Then: should map contactId to undefined', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        contactId: null,
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.contactId).toBeUndefined();
    });

    it('Given: movement with contactId When: mapping Then: should map contactId', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        contactId: 'contact-123',
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.contactId).toBe('contact-123');
    });

    it('Given: movement with null notes When: mapping Then: should map note to undefined', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        notes: null,
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.note).toBeUndefined();
    });

    it('Given: movement with null reason When: mapping Then: should map reason to undefined', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        reason: null,
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.reason).toBeUndefined();
    });

    it('Given: movement with null reference When: mapping Then: should map reference to undefined', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        reference: null,
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.reference).toBeUndefined();
    });
  });

  describe('Decimal conversion in lines', () => {
    it('Given: line with Decimal unitCost object When: mapping Then: should call toNumber', async () => {
      // Arrange
      const decimalCost = { toNumber: () => 42.5 };
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        lines: [{ ...mockLineData, unitCost: decimalCost }],
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      const lines = result!.getLines();
      expect(lines[0].unitCost?.getAmount()).toBe(42.5);
    });

    it('Given: line with string unitCost When: mapping Then: should convert to number', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        lines: [{ ...mockLineData, unitCost: '99.99' }],
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      const lines = result!.getLines();
      expect(lines[0].unitCost?.getAmount()).toBe(99.99);
    });

    it('Given: line with null unitCost When: mapping Then: should set unitCost to undefined', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        lines: [{ ...mockLineData, unitCost: null }],
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      const lines = result!.getLines();
      expect(lines[0].unitCost).toBeUndefined();
    });

    it('Given: line with zero unitCost When: mapping Then: should set unitCost to undefined', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        lines: [{ ...mockLineData, unitCost: 0 }],
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      const lines = result!.getLines();
      expect(lines[0].unitCost).toBeUndefined();
    });
  });

  describe('movement status mapping', () => {
    it('Given: POSTED movement When: mapping Then: should restore POSTED status', async () => {
      // Arrange
      const postedDate = new Date('2024-06-15');
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        status: 'POSTED',
        postedAt: postedDate,
        postedBy: 'user-456',
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.status.getValue()).toBe('POSTED');
    });

    it('Given: VOID movement When: mapping Then: should restore VOID status', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        status: 'VOID',
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.status.getValue()).toBe('VOID');
    });

    it('Given: RETURNED movement When: mapping Then: should restore RETURNED status', async () => {
      // Arrange
      const returnDate = new Date('2024-07-01');
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        status: 'RETURNED',
        returnedAt: returnDate,
        returnedBy: 'user-789',
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.status.getValue()).toBe('RETURNED');
    });
  });

  describe('legacy type normalization', () => {
    it('Given: ADJUSTMENT type When: mapping Then: should normalize to ADJUST_IN', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        type: 'ADJUSTMENT',
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.type.getValue()).toBe('ADJUST_IN');
    });

    it('Given: ADJUSTMENT type in mapToEntityWithoutLines When: mapping Then: should normalize to ADJUST_IN', async () => {
      // Arrange
      const movementWithoutLines = { ...mockMovementData, type: 'ADJUSTMENT' };
      delete (movementWithoutLines as Record<string, unknown>).lines;
      mockPrismaService.movement.findUnique.mockResolvedValue(movementWithoutLines);

      // Act
      const result = await repository.findByIdWithoutLines('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.type.getValue()).toBe('ADJUST_IN');
    });
  });

  describe('findByIdWithoutLines mapping', () => {
    it('Given: movement with null optional fields When: finding without lines Then: should map to undefined', async () => {
      // Arrange
      const movementNulls = {
        ...mockMovementData,
        contactId: null,
        reference: null,
        reason: null,
        notes: null,
        postedAt: null,
      };
      delete (movementNulls as Record<string, unknown>).lines;
      mockPrismaService.movement.findUnique.mockResolvedValue(movementNulls);

      // Act
      const result = await repository.findByIdWithoutLines('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.contactId).toBeUndefined();
      expect(result?.reference).toBeUndefined();
      expect(result?.reason).toBeUndefined();
      expect(result?.note).toBeUndefined();
    });

    it('Given: wrong orgId When: finding without lines Then: should return null', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        orgId: 'different-org',
      });

      // Act
      const result = await repository.findByIdWithoutLines('movement-123', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: non-Error thrown When: finding without lines Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findUnique.mockRejectedValue('without-lines-error');

      // Act & Assert
      await expect(repository.findByIdWithoutLines('movement-123', 'org-123')).rejects.toBe(
        'without-lines-error'
      );
    });
  });

  describe('loadLines with string unitCost', () => {
    it('Given: line with string unitCost When: loading lines Then: should convert to number', async () => {
      // Arrange
      mockPrismaService.movementLine.findMany.mockResolvedValue([
        { ...mockLineData, unitCost: '55.5' },
      ]);

      // Act
      const result = await repository.loadLines('movement-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].unitCost?.getAmount()).toBe(55.5);
    });

    it('Given: non-Error thrown When: loading lines Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movementLine.findMany.mockRejectedValue('lines-error');

      // Act & Assert
      await expect(repository.loadLines('movement-123', 'org-123')).rejects.toBe('lines-error');
    });

    it('Given: line with null locationId When: loading lines Then: should map locationId to undefined', async () => {
      // Arrange
      mockPrismaService.movementLine.findMany.mockResolvedValue([
        { ...mockLineData, locationId: null },
      ]);

      // Act
      const result = await repository.loadLines('movement-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].locationId).toBeUndefined();
    });
  });

  describe('findAllWithoutLines edge cases', () => {
    it('Given: no pagination provided When: finding all without lines Then: should use defaults', async () => {
      // Arrange
      const movementWithoutLines = { ...mockMovementData };
      delete (movementWithoutLines as Record<string, unknown>).lines;
      mockPrismaService.movement.findMany.mockResolvedValue([movementWithoutLines]);
      mockPrismaService.movement.count.mockResolvedValue(1);

      // Act
      const result = await repository.findAllWithoutLines('org-123');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('Given: empty results When: finding all without lines Then: nextCursor should be undefined', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockResolvedValue([]);
      mockPrismaService.movement.count.mockResolvedValue(0);

      // Act
      const result = await repository.findAllWithoutLines('org-123', { skip: 0, take: 20 });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('Given: non-Error thrown When: finding all without lines Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue('pagination-error');

      // Act & Assert
      await expect(repository.findAllWithoutLines('org-123')).rejects.toBe('pagination-error');
    });
  });

  describe('non-Error throws for remaining methods', () => {
    it('Given: non-Error thrown When: findAll Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue('findall-error');

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe('findall-error');
    });

    it('Given: non-Error thrown When: exists Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.count.mockRejectedValue('exists-error');

      // Act & Assert
      await expect(repository.exists('movement-123', 'org-123')).rejects.toBe('exists-error');
    });

    it('Given: non-Error thrown When: delete Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.$transaction.mockRejectedValue('delete-error');

      // Act & Assert
      await expect(repository.delete('movement-123', 'org-123')).rejects.toBe('delete-error');
    });

    it('Given: non-Error thrown When: findByWarehouse Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue('warehouse-error');

      // Act & Assert
      await expect(repository.findByWarehouse('warehouse-123', 'org-123')).rejects.toBe(
        'warehouse-error'
      );
    });

    it('Given: non-Error thrown When: findByStatus Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue('status-error');

      // Act & Assert
      await expect(repository.findByStatus('DRAFT', 'org-123')).rejects.toBe('status-error');
    });

    it('Given: non-Error thrown When: findByType Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue('type-error');

      // Act & Assert
      await expect(repository.findByType('IN', 'org-123')).rejects.toBe('type-error');
    });

    it('Given: non-Error thrown When: findByDateRange Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue('date-error');

      // Act & Assert
      await expect(repository.findByDateRange(new Date(), new Date(), 'org-123')).rejects.toBe(
        'date-error'
      );
    });

    it('Given: non-Error thrown When: findByProduct Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue('product-error');

      // Act & Assert
      await expect(repository.findByProduct('product-123', 'org-123')).rejects.toBe(
        'product-error'
      );
    });

    it('Given: non-Error thrown When: findDraftMovements Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue('draft-error');

      // Act & Assert
      await expect(repository.findDraftMovements('org-123')).rejects.toBe('draft-error');
    });

    it('Given: non-Error thrown When: findPostedMovements Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockRejectedValue('posted-error');

      // Act & Assert
      await expect(repository.findPostedMovements('org-123')).rejects.toBe('posted-error');
    });
  });

  describe('save edge cases', () => {
    it('Given: movement with no lines When: saving new Then: should not call createMany', async () => {
      // Arrange
      const movement = Movement.create(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        'org-123'
      );

      mockPrismaService.movement.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockMovementData, lines: [] });
      mockPrismaService.movement.create.mockResolvedValue({ ...mockMovementData, lines: [] });

      // Act
      const result = await repository.save(movement);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.movementLine.createMany).not.toHaveBeenCalled();
    });

    it('Given: movement with line without id When: saving Then: should not set id on line data', async () => {
      // Arrange
      const line = MovementLine.reconstitute(
        {
          productId: 'product-123',
          quantity: Quantity.create(5, 0),
          currency: 'COP',
        },
        undefined as unknown as string,
        'org-123'
      );
      const movement = Movement.reconstitute(
        {
          type: MovementType.create('OUT'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        'movement-456',
        'org-123'
      );
      movement.addLine(line);

      mockPrismaService.movement.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockMovementData, lines: [mockLineData] });
      mockPrismaService.movement.create.mockResolvedValue(mockMovementData);
      mockPrismaService.movementLine.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await repository.save(movement);

      // Assert
      expect(result).not.toBeNull();
    });

    it('Given: movement with null contactId and notes When: saving Then: should persist null values', async () => {
      // Arrange
      const movement = Movement.reconstitute(
        {
          type: MovementType.create('IN'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
          contactId: undefined,
          note: undefined,
          reason: undefined,
        },
        'movement-789',
        'org-123'
      );

      mockPrismaService.movement.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockMovementData, lines: [] });
      mockPrismaService.movement.create.mockResolvedValue({ ...mockMovementData, lines: [] });

      // Act
      const result = await repository.save(movement);

      // Assert
      expect(result).not.toBeNull();
    });
  });

  describe('movement with all optional fields populated', () => {
    it('Given: fully populated movement When: mapping Then: should preserve all fields', async () => {
      // Arrange
      const postedDate = new Date('2024-06-15');
      const returnDate = new Date('2024-07-01');
      mockPrismaService.movement.findUnique.mockResolvedValue({
        ...mockMovementData,
        contactId: 'contact-123',
        reference: 'REF-001',
        reason: 'Purchase',
        notes: 'Test notes',
        postedAt: postedDate,
        postedBy: 'user-456',
        returnedAt: returnDate,
        returnedBy: 'user-789',
        status: 'POSTED',
      });

      // Act
      const result = await repository.findById('movement-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.contactId).toBe('contact-123');
      expect(result?.reference).toBe('REF-001');
      expect(result?.reason).toBe('Purchase');
      expect(result?.note).toBe('Test notes');
      expect(result?.status.getValue()).toBe('POSTED');
    });
  });

  describe('multiple movement types', () => {
    it('Given: TRANSFER_OUT movement When: mapping Then: should set correct type', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockResolvedValue([
        { ...mockMovementData, type: 'TRANSFER_OUT' },
      ]);

      // Act
      const result = await repository.findByType('TRANSFER_OUT', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type.getValue()).toBe('TRANSFER_OUT');
    });

    it('Given: ADJUST_OUT movement When: mapping Then: should set correct type', async () => {
      // Arrange
      mockPrismaService.movement.findMany.mockResolvedValue([
        { ...mockMovementData, type: 'ADJUST_OUT' },
      ]);

      // Act
      const result = await repository.findByType('ADJUST_OUT', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type.getValue()).toBe('ADJUST_OUT');
    });
  });
});
