import { PrismaReturnRepository } from '@infrastructure/database/repositories/return.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('PrismaReturnRepository', () => {
  let repository: PrismaReturnRepository;

  let mockPrismaService: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return: Record<string, jest.Mock<any>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    returnLine: Record<string, jest.Mock<any>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: jest.Mock<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $queryRaw: jest.Mock<any>;
  };

  const mockReturnData = {
    id: 'return-123',
    returnNumber: 'RETURN-2026-000001',
    status: 'DRAFT',
    type: 'RETURN_CUSTOMER',
    reason: 'Defective product',
    warehouseId: 'wh-123',
    saleId: 'sale-456',
    sourceMovementId: null,
    returnMovementId: null,
    note: 'Customer reported defect',
    confirmedAt: null,
    cancelledAt: null,
    createdBy: 'user-789',
    orgId: 'org-123',
    createdAt: new Date('2026-02-20T10:00:00Z'),
    updatedAt: new Date('2026-02-20T10:00:00Z'),
    warehouse: { id: 'wh-123', name: 'Main Warehouse' },
    sale: { id: 'sale-456', saleNumber: 'SALE-2026-000001' },
    lines: [
      {
        id: 'line-1',
        productId: 'product-001',
        locationId: null,
        quantity: 2,
        originalSalePrice: 29.99,
        originalUnitCost: null,
        currency: 'USD',
        extra: null,
        orgId: 'org-123',
        product: { id: 'product-001', name: 'Widget', sku: 'WDG-001' },
      },
    ],
  };

  beforeEach(() => {
    mockPrismaService = {
      return: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      returnLine: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaReturnRepository(mockPrismaService as any);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return return entity', async () => {
      // Arrange
      mockPrismaService.return.findUnique.mockResolvedValue(mockReturnData);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('return-123');
      expect(result?.returnNumber.getValue()).toBe('RETURN-2026-000001');
      expect(result?.status.getValue()).toBe('DRAFT');
      expect(result?.type.getValue()).toBe('RETURN_CUSTOMER');
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.return.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: wrong orgId When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.return.findUnique.mockResolvedValue(mockReturnData);

      // Act
      const result = await repository.findById('return-123', 'wrong-org');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: prisma throws error When: finding by id Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findUnique.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findById('return-123', 'org-123')).rejects.toThrow('DB Error');
    });
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return returns', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('return-123');
    });

    it('Given: no returns When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findAllPaginated', () => {
    it('Given: pagination options When: finding paginated Then: should return paginated result', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);
      mockPrismaService.return.count.mockResolvedValue(1);

      // Act
      const result = await repository.findAllPaginated('org-123', { skip: 0, take: 20 });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('Given: more records than take When: finding paginated Then: hasMore should be true', async () => {
      // Arrange
      const manyReturns = Array.from({ length: 21 }, (_, i) => ({
        ...mockReturnData,
        id: `return-${i + 1}`,
        returnNumber: `RETURN-2026-${String(i + 1).padStart(6, '0')}`,
      }));
      mockPrismaService.return.findMany.mockResolvedValue(manyReturns);
      mockPrismaService.return.count.mockResolvedValue(25);

      // Act
      const result = await repository.findAllPaginated('org-123', { skip: 0, take: 20 });

      // Assert
      expect(result.data).toHaveLength(20);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('exists', () => {
    it('Given: existing return When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.return.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('return-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-existent return When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.return.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('Given: valid id and orgId When: deleting Then: should delete return', async () => {
      // Arrange
      mockPrismaService.return.delete.mockResolvedValue(mockReturnData);

      // Act
      await repository.delete('return-123', 'org-123');

      // Assert
      expect(mockPrismaService.return.delete).toHaveBeenCalledWith({
        where: { id: 'return-123', orgId: 'org-123' },
      });
    });
  });

  describe('findByReturnNumber', () => {
    it('Given: valid return number When: finding Then: should return entity', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockResolvedValue(mockReturnData);

      // Act
      const result = await repository.findByReturnNumber('RETURN-2026-000001', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.returnNumber.getValue()).toBe('RETURN-2026-000001');
      expect(mockPrismaService.return.findFirst).toHaveBeenCalledWith({
        where: { returnNumber: 'RETURN-2026-000001', orgId: 'org-123' },
        include: expect.any(Object),
      });
    });

    it('Given: non-existent return number When: finding Then: should return null', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByReturnNumber('RETURN-2026-999999', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('Given: single status When: finding by status Then: should return matching returns', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);

      // Act
      const result = await repository.findByStatus('DRAFT', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status.getValue()).toBe('DRAFT');
    });

    it('Given: comma-separated statuses When: finding by status Then: should use IN query', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([]);

      // Act
      await repository.findByStatus('DRAFT,CONFIRMED', 'org-123');

      // Assert
      expect(mockPrismaService.return.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['DRAFT', 'CONFIRMED'] },
          }),
        })
      );
    });
  });

  describe('findByType', () => {
    it('Given: valid type When: finding by type Then: should return matching returns', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);

      // Act
      const result = await repository.findByType('RETURN_CUSTOMER', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.return.findMany).toHaveBeenCalledWith({
        where: { type: 'RETURN_CUSTOMER', orgId: 'org-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findBySaleId', () => {
    it('Given: valid saleId When: finding by sale Then: should return matching returns', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);

      // Act
      const result = await repository.findBySaleId('sale-456', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.return.findMany).toHaveBeenCalledWith({
        where: { saleId: 'sale-456', orgId: 'org-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByDateRange', () => {
    it('Given: valid date range When: finding by date range Then: should return matching returns', async () => {
      // Arrange
      const startDate = new Date('2026-02-01T00:00:00Z');
      const endDate = new Date('2026-02-28T23:59:59Z');
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);

      // Act
      const result = await repository.findByDateRange(startDate, endDate, 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.return.findMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          createdAt: { gte: startDate, lte: endDate },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: no returns in range When: finding by date range Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByDateRange(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
        'org-123'
      );

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('getLastReturnNumberForYear', () => {
    it('Given: returns exist for year When: getting last number Then: should return number', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockResolvedValue({
        returnNumber: 'RETURN-2026-000005',
      });

      // Act
      const result = await repository.getLastReturnNumberForYear(2026, 'org-123');

      // Assert
      expect(result).toBe('RETURN-2026-000005');
      expect(mockPrismaService.return.findFirst).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          returnNumber: { startsWith: 'RETURN-2026-' },
        },
        orderBy: { returnNumber: 'desc' },
        select: { returnNumber: true },
      });
    });

    it('Given: no returns for year When: getting last number Then: should return null', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.getLastReturnNumberForYear(2026, 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByReturnMovementId', () => {
    it('Given: valid movementId When: finding Then: should return return entity', async () => {
      // Arrange
      const dataWithMovement = { ...mockReturnData, returnMovementId: 'mov-123' };
      mockPrismaService.return.findFirst.mockResolvedValue(dataWithMovement);

      // Act
      const result = await repository.findByReturnMovementId('mov-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.return.findFirst).toHaveBeenCalledWith({
        where: { returnMovementId: 'mov-123', orgId: 'org-123' },
        include: expect.any(Object),
      });
    });

    it('Given: non-existent movementId When: finding Then: should return null', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByReturnMovementId('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findBySourceMovementId', () => {
    it('Given: valid source movementId When: finding Then: should return returns', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);

      // Act
      const result = await repository.findBySourceMovementId('mov-source', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.return.findMany).toHaveBeenCalledWith({
        where: { sourceMovementId: 'mov-source', orgId: 'org-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findBySpecification', () => {
    it('Given: specification with pagination When: finding Then: should return paginated result', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123', status: 'DRAFT' }),
      };
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);
      mockPrismaService.return.count.mockResolvedValue(1);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123', {
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('Given: specification without pagination When: finding Then: hasMore should be false', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);
      mockPrismaService.return.count.mockResolvedValue(1);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('Given: specification with take and fewer results When: finding Then: hasMore should be false', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123', status: 'DRAFT' }),
      };
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);
      mockPrismaService.return.count.mockResolvedValue(1);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123', {
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('Given: specification with take equal to results count When: finding Then: hasMore should be true and nextCursor set', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      const twoReturns = [
        { ...mockReturnData, id: 'return-1', returnNumber: 'RETURN-2026-000001' },
        { ...mockReturnData, id: 'return-2', returnNumber: 'RETURN-2026-000002' },
      ];
      mockPrismaService.return.findMany.mockResolvedValue(twoReturns);
      mockPrismaService.return.count.mockResolvedValue(5);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123', {
        skip: 0,
        take: 2,
      });

      // Assert
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('return-2');
    });

    it('Given: prisma throws error When: finding by specification Then: should propagate error', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.return.findMany.mockRejectedValue(new Error('Spec query failed'));

      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(repository.findBySpecification(mockSpec as any, 'org-123')).rejects.toThrow(
        'Spec query failed'
      );
    });

    it('Given: prisma throws non-Error When: finding by specification Then: should propagate error', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.return.findMany.mockRejectedValue('string error');

      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(repository.findBySpecification(mockSpec as any, 'org-123')).rejects.toBe(
        'string error'
      );
    });
  });

  // =====================================================================
  // NEW TEST BLOCKS: Coverage extension from ~50% to 70%+
  // =====================================================================

  describe('save', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockTx: Record<string, Record<string, jest.Mock<any>>>;

    beforeEach(() => {
      mockTx = {
        return: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        returnLine: {
          createMany: jest.fn(),
          deleteMany: jest.fn(),
        },
      };
      // $transaction executes the callback with the transaction proxy
      mockPrismaService.$transaction.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (cb: (tx: any) => Promise<any>) => cb(mockTx)
      );
    });

    it('Given: return entity with existing id and found in DB When: saving Then: should update and recreate lines', async () => {
      // Arrange
      const line = ReturnLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(2, 6),
          originalSalePrice: SalePrice.create(29.99, 'USD', 2),
          currency: 'USD',
        },
        'line-1',
        'org-123'
      );

      const entity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2026-000001'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective product'),
          warehouseId: 'wh-123',
          saleId: 'sale-456',
          note: 'Customer reported defect',
          createdBy: 'user-789',
        },
        'return-123',
        'org-123',
        [line]
      );

      mockTx.return.findUnique
        .mockResolvedValueOnce({ id: 'return-123' }) // existingReturn check
        .mockResolvedValueOnce(mockReturnData); // completeReturn fetch
      mockTx.return.update.mockResolvedValue({ id: 'return-123' });
      mockTx.returnLine.deleteMany.mockResolvedValue({ count: 1 });
      mockTx.returnLine.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await repository.save(entity);

      // Assert
      expect(result).not.toBeNull();
      expect(result.id).toBe('return-123');
      expect(mockTx.return.update).toHaveBeenCalled();
      expect(mockTx.returnLine.deleteMany).toHaveBeenCalledWith({
        where: { returnId: 'return-123' },
      });
      expect(mockTx.returnLine.createMany).toHaveBeenCalled();
    });

    it('Given: return entity with id not found in DB When: saving Then: should create with provided id', async () => {
      // Arrange
      const entity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2026-000001'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: 'wh-123',
          saleId: 'sale-456',
          createdBy: 'user-789',
        },
        'return-new-id',
        'org-123',
        [] // no lines
      );

      mockTx.return.findUnique
        .mockResolvedValueOnce(null) // existingReturn not found
        .mockResolvedValueOnce({ ...mockReturnData, id: 'return-new-id', lines: [] }); // completeReturn fetch
      mockTx.return.create.mockResolvedValue({ id: 'return-new-id' });

      // Act
      const result = await repository.save(entity);

      // Assert
      expect(result).not.toBeNull();
      expect(mockTx.return.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: 'return-new-id' }),
        })
      );
      // No lines to create so createMany should not be called
      expect(mockTx.returnLine.createMany).not.toHaveBeenCalled();
    });

    it('Given: save transaction fails to retrieve saved return When: saving Then: should throw error', async () => {
      // Arrange
      const entity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2026-000001'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: 'wh-123',
          saleId: 'sale-456',
          createdBy: 'user-789',
        },
        'return-123',
        'org-123',
        []
      );

      mockTx.return.findUnique
        .mockResolvedValueOnce({ id: 'return-123' }) // existing return found
        .mockResolvedValueOnce(null); // completeReturn is null
      mockTx.return.update.mockResolvedValue({ id: 'return-123' });
      mockTx.returnLine.deleteMany.mockResolvedValue({ count: 0 });

      // Act & Assert
      await expect(repository.save(entity)).rejects.toThrow('Failed to retrieve saved return');
    });

    it('Given: save with supplier return lines containing optional fields When: saving Then: should map all line fields correctly', async () => {
      // Arrange
      const line = ReturnLine.reconstitute(
        {
          productId: 'product-002',
          locationId: 'loc-1',
          quantity: Quantity.create(5, 6),
          originalUnitCost: Money.create(15.5, 'USD', 2),
          currency: 'USD',
          extra: { batchNumber: 'B001' },
        },
        'line-2',
        'org-123'
      );

      const entity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2026-000003'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_SUPPLIER'),
          reason: ReturnReason.create('Wrong shipment'),
          warehouseId: 'wh-123',
          sourceMovementId: 'mov-src-1',
          createdBy: 'user-789',
        },
        'return-456',
        'org-123',
        [line]
      );

      const supplierReturnData = {
        ...mockReturnData,
        id: 'return-456',
        returnNumber: 'RETURN-2026-000003',
        type: 'RETURN_SUPPLIER',
        saleId: null,
        sourceMovementId: 'mov-src-1',
        sale: null,
        lines: [
          {
            id: 'line-2',
            productId: 'product-002',
            locationId: 'loc-1',
            quantity: 5,
            originalSalePrice: null,
            originalUnitCost: 15.5,
            currency: 'USD',
            extra: { batchNumber: 'B001' },
            orgId: 'org-123',
            product: { id: 'product-002', name: 'Gadget', sku: 'GDG-002' },
          },
        ],
      };

      mockTx.return.findUnique
        .mockResolvedValueOnce({ id: 'return-456' })
        .mockResolvedValueOnce(supplierReturnData);
      mockTx.return.update.mockResolvedValue({ id: 'return-456' });
      mockTx.returnLine.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.returnLine.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await repository.save(entity);

      // Assert
      expect(result).not.toBeNull();
      expect(result.type.getValue()).toBe('RETURN_SUPPLIER');
      expect(result.getLines()).toHaveLength(1);
      const savedLine = result.getLines()[0];
      expect(savedLine.productId).toBe('product-002');
      expect(savedLine.originalUnitCost).toBeDefined();
    });

    it('Given: prisma throws error during save When: saving Then: should propagate error', async () => {
      // Arrange
      const entity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2026-000001'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: 'wh-123',
          saleId: 'sale-456',
          createdBy: 'user-789',
        },
        'return-123',
        'org-123',
        []
      );

      mockPrismaService.$transaction.mockRejectedValue(new Error('Transaction failed'));

      // Act & Assert
      await expect(repository.save(entity)).rejects.toThrow('Transaction failed');
    });

    it('Given: prisma throws non-Error during save When: saving Then: should propagate error', async () => {
      // Arrange
      const entity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2026-000001'),
          status: ReturnStatus.create('DRAFT'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: 'wh-123',
          saleId: 'sale-456',
          createdBy: 'user-789',
        },
        'return-123',
        'org-123',
        []
      );

      mockPrismaService.$transaction.mockRejectedValue('string error in save');

      // Act & Assert
      await expect(repository.save(entity)).rejects.toBe('string error in save');
    });

    it('Given: return entity with confirmedAt and returnMovementId When: saving Then: should pass dates to prisma', async () => {
      // Arrange
      const confirmedDate = new Date('2026-02-25T12:00:00Z');
      const entity = Return.reconstitute(
        {
          returnNumber: ReturnNumber.fromString('RETURN-2026-000001'),
          status: ReturnStatus.create('CONFIRMED'),
          type: ReturnType.create('RETURN_CUSTOMER'),
          reason: ReturnReason.create('Defective'),
          warehouseId: 'wh-123',
          saleId: 'sale-456',
          returnMovementId: 'mov-ret-1',
          confirmedAt: confirmedDate,
          createdBy: 'user-789',
        },
        'return-confirmed',
        'org-123',
        []
      );

      const confirmedData = {
        ...mockReturnData,
        id: 'return-confirmed',
        status: 'CONFIRMED',
        confirmedAt: confirmedDate,
        returnMovementId: 'mov-ret-1',
        lines: [],
      };

      mockTx.return.findUnique
        .mockResolvedValueOnce({ id: 'return-confirmed' })
        .mockResolvedValueOnce(confirmedData);
      mockTx.return.update.mockResolvedValue({ id: 'return-confirmed' });
      mockTx.returnLine.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await repository.save(entity);

      // Assert
      expect(result).not.toBeNull();
      expect(mockTx.return.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confirmedAt: confirmedDate,
            returnMovementId: 'mov-ret-1',
          }),
        })
      );
    });
  });

  describe('addLine', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockTx: Record<string, Record<string, jest.Mock<any>>>;

    beforeEach(() => {
      mockTx = {
        return: {
          findUnique: jest.fn(),
        },
        returnLine: {
          create: jest.fn(),
        },
      };
      mockPrismaService.$transaction.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (cb: (tx: any) => Promise<any>) => cb(mockTx)
      );
    });

    it('Given: valid DRAFT return and customer line When: adding line Then: should create line and return domain entity', async () => {
      // Arrange
      const line = ReturnLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(3, 6),
          originalSalePrice: SalePrice.create(19.99, 'USD', 2),
          currency: 'USD',
        },
        'new-line-1',
        'org-123'
      );

      mockTx.return.findUnique.mockResolvedValue({
        id: 'return-123',
        status: 'DRAFT',
        type: 'RETURN_CUSTOMER',
        orgId: 'org-123',
      });
      mockTx.returnLine.create.mockResolvedValue({
        id: 'new-line-1',
        productId: 'product-001',
        locationId: null,
        quantity: 3,
        originalSalePrice: 19.99,
        originalUnitCost: null,
        currency: 'USD',
        extra: null,
        orgId: 'org-123',
      });

      // Act
      const result = await repository.addLine('return-123', line, 'org-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.productId).toBe('product-001');
      expect(result.quantity.getNumericValue()).toBe(3);
      expect(mockTx.returnLine.create).toHaveBeenCalled();
    });

    it('Given: return not found When: adding line Then: should throw NotFoundError', async () => {
      // Arrange
      const line = ReturnLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(1, 6),
          originalSalePrice: SalePrice.create(10, 'USD', 2),
          currency: 'USD',
        },
        'line-x',
        'org-123'
      );

      mockTx.return.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.addLine('non-existent', line, 'org-123')).rejects.toThrow(
        'Return with ID non-existent not found'
      );
    });

    it('Given: return with wrong orgId When: adding line Then: should throw NotFoundError', async () => {
      // Arrange
      const line = ReturnLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(1, 6),
          originalSalePrice: SalePrice.create(10, 'USD', 2),
          currency: 'USD',
        },
        'line-x',
        'org-123'
      );

      mockTx.return.findUnique.mockResolvedValue({
        id: 'return-123',
        status: 'DRAFT',
        type: 'RETURN_CUSTOMER',
        orgId: 'different-org',
      });

      // Act & Assert
      await expect(repository.addLine('return-123', line, 'org-123')).rejects.toThrow(
        'Return with ID return-123 not found'
      );
    });

    it('Given: return in CONFIRMED status When: adding line Then: should throw BusinessRuleError', async () => {
      // Arrange
      const line = ReturnLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(1, 6),
          originalSalePrice: SalePrice.create(10, 'USD', 2),
          currency: 'USD',
        },
        'line-x',
        'org-123'
      );

      mockTx.return.findUnique.mockResolvedValue({
        id: 'return-123',
        status: 'CONFIRMED',
        type: 'RETURN_CUSTOMER',
        orgId: 'org-123',
      });

      // Act & Assert
      await expect(repository.addLine('return-123', line, 'org-123')).rejects.toThrow(
        'Cannot add lines to return in CONFIRMED status'
      );
    });

    it('Given: return in CANCELLED status When: adding line Then: should throw BusinessRuleError', async () => {
      // Arrange
      const line = ReturnLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(1, 6),
          originalSalePrice: SalePrice.create(10, 'USD', 2),
          currency: 'USD',
        },
        'line-x',
        'org-123'
      );

      mockTx.return.findUnique.mockResolvedValue({
        id: 'return-123',
        status: 'CANCELLED',
        type: 'RETURN_CUSTOMER',
        orgId: 'org-123',
      });

      // Act & Assert
      await expect(repository.addLine('return-123', line, 'org-123')).rejects.toThrow(
        'Cannot add lines to return in CANCELLED status'
      );
    });

    it('Given: supplier return with line containing extra When: adding line Then: should serialize extra to JSON', async () => {
      // Arrange
      const line = ReturnLine.reconstitute(
        {
          productId: 'product-002',
          locationId: 'loc-5',
          quantity: Quantity.create(10, 6),
          originalUnitCost: Money.create(25.0, 'USD', 2),
          currency: 'USD',
          extra: { lotNumber: 'LOT-123', reason: 'damaged' },
        },
        'line-extra',
        'org-123'
      );

      mockTx.return.findUnique.mockResolvedValue({
        id: 'return-123',
        status: 'DRAFT',
        type: 'RETURN_SUPPLIER',
        orgId: 'org-123',
      });
      mockTx.returnLine.create.mockResolvedValue({
        id: 'line-extra',
        productId: 'product-002',
        locationId: 'loc-5',
        quantity: 10,
        originalSalePrice: null,
        originalUnitCost: 25.0,
        currency: 'USD',
        extra: { lotNumber: 'LOT-123', reason: 'damaged' },
        orgId: 'org-123',
      });

      // Act
      const result = await repository.addLine('return-123', line, 'org-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.productId).toBe('product-002');
      expect(mockTx.returnLine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            extra: { lotNumber: 'LOT-123', reason: 'damaged' },
          }),
        })
      );
    });

    it('Given: prisma throws generic error during addLine When: adding line Then: should propagate error', async () => {
      // Arrange
      const line = ReturnLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(1, 6),
          originalSalePrice: SalePrice.create(10, 'USD', 2),
          currency: 'USD',
        },
        'line-x',
        'org-123'
      );

      mockPrismaService.$transaction.mockRejectedValue(new Error('DB connection lost'));

      // Act & Assert
      await expect(repository.addLine('return-123', line, 'org-123')).rejects.toThrow(
        'DB connection lost'
      );
    });

    it('Given: prisma throws non-Error during addLine When: adding line Then: should propagate error', async () => {
      // Arrange
      const line = ReturnLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(1, 6),
          originalSalePrice: SalePrice.create(10, 'USD', 2),
          currency: 'USD',
        },
        'line-x',
        'org-123'
      );

      mockPrismaService.$transaction.mockRejectedValue('non-error string');

      // Act & Assert
      await expect(repository.addLine('return-123', line, 'org-123')).rejects.toBe(
        'non-error string'
      );
    });
  });

  describe('getNextReturnNumber', () => {
    it('Given: valid orgId and year When: getting next return number Then: should return formatted number', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([
        { get_next_return_number: 'RETURN-2026-000006' },
      ]);

      // Act
      const result = await repository.getNextReturnNumber('org-123', 2026);

      // Assert
      expect(result).toBe('RETURN-2026-000006');
    });

    it('Given: prisma throws error When: getting next return number Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Function not found'));

      // Act & Assert
      await expect(repository.getNextReturnNumber('org-123', 2026)).rejects.toThrow(
        'Function not found'
      );
    });

    it('Given: prisma throws non-Error When: getting next return number Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue('raw query error');

      // Act & Assert
      await expect(repository.getNextReturnNumber('org-123', 2026)).rejects.toBe('raw query error');
    });
  });

  describe('findAllPaginated - additional branches', () => {
    it('Given: no pagination options When: finding paginated Then: should use defaults skip=0 take=20', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);
      mockPrismaService.return.count.mockResolvedValue(1);

      // Act
      const result = await repository.findAllPaginated('org-123');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaService.return.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 21, // take + 1
        })
      );
    });

    it('Given: empty result set When: finding paginated Then: nextCursor should be undefined', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([]);
      mockPrismaService.return.count.mockResolvedValue(0);

      // Act
      const result = await repository.findAllPaginated('org-123', { skip: 0, take: 20 });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('Given: hasMore is true When: finding paginated Then: nextCursor should be last item id', async () => {
      // Arrange
      const manyReturns = Array.from({ length: 6 }, (_, i) => ({
        ...mockReturnData,
        id: `return-${i + 1}`,
        returnNumber: `RETURN-2026-${String(i + 1).padStart(6, '0')}`,
      }));
      mockPrismaService.return.findMany.mockResolvedValue(manyReturns);
      mockPrismaService.return.count.mockResolvedValue(10);

      // Act
      const result = await repository.findAllPaginated('org-123', { skip: 0, take: 5 });

      // Assert
      expect(result.data).toHaveLength(5);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('return-5');
    });

    it('Given: prisma throws error When: finding paginated Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue(new Error('Paginated query failed'));

      // Act & Assert
      await expect(repository.findAllPaginated('org-123', { skip: 0, take: 20 })).rejects.toThrow(
        'Paginated query failed'
      );
    });

    it('Given: prisma throws non-Error When: finding paginated Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue('non-error paginated');

      // Act & Assert
      await expect(repository.findAllPaginated('org-123')).rejects.toBe('non-error paginated');
    });
  });

  describe('mapToEntity - additional branches (via findById)', () => {
    it('Given: supplier return with originalUnitCost When: mapping Then: should create Money value object for unit cost', async () => {
      // Arrange
      const supplierReturnData = {
        ...mockReturnData,
        type: 'RETURN_SUPPLIER',
        saleId: null,
        sourceMovementId: 'mov-src-1',
        sale: null,
        lines: [
          {
            id: 'line-sup-1',
            productId: 'product-002',
            locationId: 'loc-1',
            quantity: 5,
            originalSalePrice: null,
            originalUnitCost: 12.5,
            currency: 'USD',
            extra: null,
            orgId: 'org-123',
            product: { id: 'product-002', name: 'Part A', sku: 'PRT-001' },
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(supplierReturnData);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.type.getValue()).toBe('RETURN_SUPPLIER');
      const lines = result!.getLines();
      expect(lines).toHaveLength(1);
      expect(lines[0].originalUnitCost).toBeDefined();
      expect(lines[0].originalSalePrice).toBeUndefined();
    });

    it('Given: return with quantity as toNumber object When: mapping Then: should call toNumber()', async () => {
      // Arrange
      const dataWithToNumber = {
        ...mockReturnData,
        lines: [
          {
            ...mockReturnData.lines[0],
            quantity: { toNumber: () => 3 },
            originalSalePrice: { toNumber: () => 29.99 },
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(dataWithToNumber);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      const lines = result!.getLines();
      expect(lines[0].quantity.getNumericValue()).toBe(3);
    });

    it('Given: supplier return with originalUnitCost as toNumber object When: mapping Then: should call toNumber()', async () => {
      // Arrange
      const supplierData = {
        ...mockReturnData,
        type: 'RETURN_SUPPLIER',
        saleId: null,
        sourceMovementId: 'mov-src-1',
        sale: null,
        lines: [
          {
            id: 'line-sup-1',
            productId: 'product-002',
            locationId: null,
            quantity: { toNumber: () => 7 },
            originalSalePrice: null,
            originalUnitCost: { toNumber: () => 8.25 },
            currency: 'USD',
            extra: null,
            orgId: 'org-123',
            product: { id: 'product-002', name: 'Part B', sku: 'PRT-002' },
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(supplierData);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      const lines = result!.getLines();
      expect(lines[0].originalUnitCost).toBeDefined();
      expect(lines[0].quantity.getNumericValue()).toBe(7);
    });

    it('Given: return with quantity as string When: mapping Then: should convert to number', async () => {
      // Arrange
      const dataWithStringQuantity = {
        ...mockReturnData,
        lines: [
          {
            ...mockReturnData.lines[0],
            quantity: '4',
            originalSalePrice: '15.50',
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(dataWithStringQuantity);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      const lines = result!.getLines();
      expect(lines[0].quantity.getNumericValue()).toBe(4);
    });

    it('Given: return without warehouse or sale relations When: mapping Then: should set metadata with undefined names', async () => {
      // Arrange
      const noRelationsData = {
        ...mockReturnData,
        warehouse: null,
        sale: null,
      };
      mockPrismaService.return.findUnique.mockResolvedValue(noRelationsData);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.readMetadata?.warehouseName).toBeUndefined();
      expect(result!.readMetadata?.saleNumber).toBeUndefined();
    });

    it('Given: return lines without product relation When: mapping Then: lineProducts should not include that line', async () => {
      // Arrange
      const noProductData = {
        ...mockReturnData,
        lines: [
          {
            id: 'line-no-prod',
            productId: 'product-ghost',
            locationId: null,
            quantity: 1,
            originalSalePrice: 10,
            originalUnitCost: null,
            currency: 'USD',
            extra: null,
            orgId: 'org-123',
            product: null,
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(noProductData);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.readMetadata?.lineProducts).toBeDefined();
      expect(result!.readMetadata!.lineProducts!['product-ghost']).toBeUndefined();
    });

    it('Given: return with no lines When: mapping Then: should create entity with empty lines', async () => {
      // Arrange
      const noLinesData = {
        ...mockReturnData,
        lines: [],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(noLinesData);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.getLines()).toHaveLength(0);
    });

    it('Given: return with all optional fields null When: mapping Then: should create entity with undefined optionals', async () => {
      // Arrange
      const minimalData = {
        ...mockReturnData,
        reason: null,
        saleId: null,
        sourceMovementId: null,
        returnMovementId: null,
        note: null,
        confirmedAt: null,
        cancelledAt: null,
        warehouse: null,
        sale: null,
        lines: [],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(minimalData);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.saleId).toBeUndefined();
      expect(result!.sourceMovementId).toBeUndefined();
      expect(result!.returnMovementId).toBeUndefined();
      expect(result!.note).toBeUndefined();
      expect(result!.confirmedAt).toBeUndefined();
      expect(result!.cancelledAt).toBeUndefined();
    });

    it('Given: return with line having extra data When: mapping Then: should preserve extra as Record', async () => {
      // Arrange
      const dataWithExtra = {
        ...mockReturnData,
        lines: [
          {
            ...mockReturnData.lines[0],
            extra: { serialNumber: 'SN-12345', condition: 'damaged' },
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(dataWithExtra);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      const lines = result!.getLines();
      expect(lines[0].extra).toEqual({ serialNumber: 'SN-12345', condition: 'damaged' });
    });

    it('Given: return with line having locationId When: mapping Then: should set locationId on line', async () => {
      // Arrange
      const dataWithLocation = {
        ...mockReturnData,
        lines: [
          {
            ...mockReturnData.lines[0],
            locationId: 'loc-42',
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(dataWithLocation);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      const lines = result!.getLines();
      expect(lines[0].locationId).toBe('loc-42');
    });

    it('Given: return with multiple lines and products When: mapping Then: lineProducts map should have all entries', async () => {
      // Arrange
      const multiLineData = {
        ...mockReturnData,
        lines: [
          {
            id: 'line-1',
            productId: 'product-001',
            locationId: null,
            quantity: 2,
            originalSalePrice: 29.99,
            originalUnitCost: null,
            currency: 'USD',
            extra: null,
            orgId: 'org-123',
            product: { id: 'product-001', name: 'Widget', sku: 'WDG-001' },
          },
          {
            id: 'line-2',
            productId: 'product-002',
            locationId: null,
            quantity: 1,
            originalSalePrice: 49.99,
            originalUnitCost: null,
            currency: 'USD',
            extra: null,
            orgId: 'org-123',
            product: { id: 'product-002', name: 'Gadget', sku: 'GDG-002' },
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(multiLineData);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.readMetadata?.lineProducts).toEqual({
        'product-001': { name: 'Widget', sku: 'WDG-001' },
        'product-002': { name: 'Gadget', sku: 'GDG-002' },
      });
    });
  });

  describe('error handling - non-Error branches', () => {
    it('Given: findById throws non-Error When: finding by id Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.findUnique.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findById('return-123', 'org-123')).rejects.toBe('string error');
    });

    it('Given: findAll throws non-Error When: finding all Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue(42);

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe(42);
    });

    it('Given: findAll throws Error When: finding all Then: should propagate Error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue(new Error('findAll DB error'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('findAll DB error');
    });

    it('Given: exists throws Error When: checking existence Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.count.mockRejectedValue(new Error('exists error'));

      // Act & Assert
      await expect(repository.exists('return-123', 'org-123')).rejects.toThrow('exists error');
    });

    it('Given: exists throws non-Error When: checking existence Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.count.mockRejectedValue('exists non-error');

      // Act & Assert
      await expect(repository.exists('return-123', 'org-123')).rejects.toBe('exists non-error');
    });

    it('Given: delete throws Error When: deleting Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.delete.mockRejectedValue(new Error('delete error'));

      // Act & Assert
      await expect(repository.delete('return-123', 'org-123')).rejects.toThrow('delete error');
    });

    it('Given: delete throws non-Error When: deleting Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.delete.mockRejectedValue('delete non-error');

      // Act & Assert
      await expect(repository.delete('return-123', 'org-123')).rejects.toBe('delete non-error');
    });

    it('Given: findByReturnNumber throws Error When: finding Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockRejectedValue(new Error('findByNumber error'));

      // Act & Assert
      await expect(repository.findByReturnNumber('RETURN-2026-000001', 'org-123')).rejects.toThrow(
        'findByNumber error'
      );
    });

    it('Given: findByReturnNumber throws non-Error When: finding Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockRejectedValue('findByNumber non-error');

      // Act & Assert
      await expect(repository.findByReturnNumber('RETURN-2026-000001', 'org-123')).rejects.toBe(
        'findByNumber non-error'
      );
    });

    it('Given: findByStatus throws Error When: finding Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue(new Error('findByStatus error'));

      // Act & Assert
      await expect(repository.findByStatus('DRAFT', 'org-123')).rejects.toThrow(
        'findByStatus error'
      );
    });

    it('Given: findByStatus throws non-Error When: finding Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue('findByStatus non-error');

      // Act & Assert
      await expect(repository.findByStatus('DRAFT', 'org-123')).rejects.toBe(
        'findByStatus non-error'
      );
    });

    it('Given: findByType throws Error When: finding Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue(new Error('findByType error'));

      // Act & Assert
      await expect(repository.findByType('RETURN_CUSTOMER', 'org-123')).rejects.toThrow(
        'findByType error'
      );
    });

    it('Given: findByType throws non-Error When: finding Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue('findByType non-error');

      // Act & Assert
      await expect(repository.findByType('RETURN_CUSTOMER', 'org-123')).rejects.toBe(
        'findByType non-error'
      );
    });

    it('Given: findBySaleId throws Error When: finding Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue(new Error('findBySaleId error'));

      // Act & Assert
      await expect(repository.findBySaleId('sale-456', 'org-123')).rejects.toThrow(
        'findBySaleId error'
      );
    });

    it('Given: findBySaleId throws non-Error When: finding Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue('findBySaleId non-error');

      // Act & Assert
      await expect(repository.findBySaleId('sale-456', 'org-123')).rejects.toBe(
        'findBySaleId non-error'
      );
    });

    it('Given: findBySourceMovementId throws Error When: finding Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue(
        new Error('findBySourceMovementId error')
      );

      // Act & Assert
      await expect(repository.findBySourceMovementId('mov-1', 'org-123')).rejects.toThrow(
        'findBySourceMovementId error'
      );
    });

    it('Given: findBySourceMovementId throws non-Error When: finding Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue('findBySourceMovementId non-error');

      // Act & Assert
      await expect(repository.findBySourceMovementId('mov-1', 'org-123')).rejects.toBe(
        'findBySourceMovementId non-error'
      );
    });

    it('Given: findByDateRange throws Error When: finding Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue(new Error('dateRange error'));

      // Act & Assert
      await expect(repository.findByDateRange(new Date(), new Date(), 'org-123')).rejects.toThrow(
        'dateRange error'
      );
    });

    it('Given: findByDateRange throws non-Error When: finding Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockRejectedValue('dateRange non-error');

      // Act & Assert
      await expect(repository.findByDateRange(new Date(), new Date(), 'org-123')).rejects.toBe(
        'dateRange non-error'
      );
    });

    it('Given: getLastReturnNumberForYear throws Error When: getting Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockRejectedValue(new Error('lastNumber error'));

      // Act & Assert
      await expect(repository.getLastReturnNumberForYear(2026, 'org-123')).rejects.toThrow(
        'lastNumber error'
      );
    });

    it('Given: getLastReturnNumberForYear throws non-Error When: getting Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockRejectedValue('lastNumber non-error');

      // Act & Assert
      await expect(repository.getLastReturnNumberForYear(2026, 'org-123')).rejects.toBe(
        'lastNumber non-error'
      );
    });

    it('Given: findByReturnMovementId throws Error When: finding Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockRejectedValue(
        new Error('findByReturnMovementId error')
      );

      // Act & Assert
      await expect(repository.findByReturnMovementId('mov-1', 'org-123')).rejects.toThrow(
        'findByReturnMovementId error'
      );
    });

    it('Given: findByReturnMovementId throws non-Error When: finding Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.return.findFirst.mockRejectedValue('findByReturnMovementId non-error');

      // Act & Assert
      await expect(repository.findByReturnMovementId('mov-1', 'org-123')).rejects.toBe(
        'findByReturnMovementId non-error'
      );
    });
  });

  describe('findByType - additional cases', () => {
    it('Given: no returns of type When: finding by type Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByType('RETURN_SUPPLIER', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findBySaleId - additional cases', () => {
    it('Given: no returns for sale When: finding by saleId Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findBySaleId('sale-nonexistent', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findBySourceMovementId - additional cases', () => {
    it('Given: no returns for source movement When: finding Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findBySourceMovementId('mov-nonexistent', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('mapToEntity - supplier return line mapping', () => {
    it('Given: supplier return with unit cost lines When: mapping to entity Then: should create supplier lines', async () => {
      // Arrange
      const supplierReturnData = {
        ...mockReturnData,
        type: 'RETURN_SUPPLIER',
        saleId: null,
        sourceMovementId: 'mov-001',
        warehouse: { id: 'wh-123', name: 'Main Warehouse' },
        sale: null,
        lines: [
          {
            id: 'line-1',
            productId: 'product-001',
            locationId: null,
            quantity: 3,
            originalSalePrice: null,
            originalUnitCost: 50.0,
            currency: 'COP',
            extra: null,
            orgId: 'org-123',
            product: { id: 'product-001', name: 'Widget', sku: 'WDG-001' },
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(supplierReturnData);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.type.getValue()).toBe('RETURN_SUPPLIER');
      expect(result?.getLines()).toHaveLength(1);
    });
  });

  describe('mapToEntity - Decimal-like objects', () => {
    it('Given: return lines with Decimal-like objects When: mapping Then: should use toNumber()', async () => {
      // Arrange
      const returnDataWithDecimals = {
        ...mockReturnData,
        lines: [
          {
            id: 'line-1',
            productId: 'product-001',
            locationId: null,
            quantity: { toNumber: () => 5 },
            originalSalePrice: { toNumber: () => 29.99 },
            originalUnitCost: null,
            currency: 'USD',
            extra: null,
            orgId: 'org-123',
            product: { id: 'product-001', name: 'Widget', sku: 'WDG-001' },
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(returnDataWithDecimals);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.getLines()).toHaveLength(1);
    });

    it('Given: supplier return lines with Decimal-like unit cost When: mapping Then: should use toNumber()', async () => {
      // Arrange
      const supplierReturnWithDecimals = {
        ...mockReturnData,
        type: 'RETURN_SUPPLIER',
        saleId: null,
        sourceMovementId: 'mov-001',
        sale: null,
        lines: [
          {
            id: 'line-1',
            productId: 'product-001',
            locationId: null,
            quantity: { toNumber: () => 3 },
            originalSalePrice: null,
            originalUnitCost: { toNumber: () => 75.0 },
            currency: 'COP',
            extra: null,
            orgId: 'org-123',
            product: { id: 'product-001', name: 'Widget', sku: 'WDG-001' },
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(supplierReturnWithDecimals);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.getLines()).toHaveLength(1);
    });
  });

  describe('mapToEntity - read metadata', () => {
    it('Given: return data without warehouse relation When: mapping Then: warehouseName should be undefined', async () => {
      // Arrange
      const returnNoWarehouse = {
        ...mockReturnData,
        warehouse: null,
        sale: null,
      };
      mockPrismaService.return.findUnique.mockResolvedValue(returnNoWarehouse);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.readMetadata?.warehouseName).toBeUndefined();
      expect(result?.readMetadata?.saleNumber).toBeUndefined();
    });

    it('Given: return data with product info on lines When: mapping Then: should include lineProducts metadata', async () => {
      // Arrange
      const returnWithProducts = {
        ...mockReturnData,
        lines: [
          {
            id: 'line-1',
            productId: 'product-001',
            locationId: null,
            quantity: 2,
            originalSalePrice: 29.99,
            originalUnitCost: null,
            currency: 'USD',
            extra: null,
            orgId: 'org-123',
            product: { id: 'product-001', name: 'Widget', sku: 'WDG-001' },
          },
          {
            id: 'line-2',
            productId: 'product-002',
            locationId: null,
            quantity: 1,
            originalSalePrice: 15.0,
            originalUnitCost: null,
            currency: 'USD',
            extra: null,
            orgId: 'org-123',
            product: null, // No product relation
          },
        ],
      };
      mockPrismaService.return.findUnique.mockResolvedValue(returnWithProducts);

      // Act
      const result = await repository.findById('return-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.readMetadata?.lineProducts?.['product-001']).toEqual({
        name: 'Widget',
        sku: 'WDG-001',
      });
      // product-002 should not be in lineProducts since product is null
      expect(result?.readMetadata?.lineProducts?.['product-002']).toBeUndefined();
    });
  });

  describe('findByStatus - comma-separated statuses', () => {
    it('Given: comma-separated statuses When: finding Then: should use IN filter', async () => {
      // Arrange
      mockPrismaService.return.findMany.mockResolvedValue([mockReturnData]);

      // Act
      const result = await repository.findByStatus('DRAFT, CONFIRMED', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.return.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['DRAFT', 'CONFIRMED'] },
          }),
        })
      );
    });
  });

  describe('findById - error handling non-Error object', () => {
    it('Given: non-Error thrown When: finding by id Then: should log and rethrow', async () => {
      // Arrange
      mockPrismaService.return.findUnique.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findById('return-123', 'org-123')).rejects.toBe('string error');
    });
  });
});
