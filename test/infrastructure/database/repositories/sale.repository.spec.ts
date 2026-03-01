import { PrismaSaleRepository } from '@infrastructure/database/repositories/sale.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('PrismaSaleRepository', () => {
  let repository: PrismaSaleRepository;

  let mockPrismaService: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sale: Record<string, jest.Mock<any>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saleLine: Record<string, jest.Mock<any>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: jest.Mock<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $queryRaw: jest.Mock<any>;
  };

  const mockSaleData = {
    id: 'sale-123',
    saleNumber: 'SALE-2026-000001',
    status: 'DRAFT',
    warehouseId: 'wh-123',
    customerReference: 'CUST-REF-001',
    externalReference: null,
    note: 'Test sale',
    confirmedAt: null,
    confirmedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    pickedAt: null,
    pickedBy: null,
    shippedAt: null,
    shippedBy: null,
    trackingNumber: null,
    shippingCarrier: null,
    shippingNotes: null,
    completedAt: null,
    completedBy: null,
    returnedAt: null,
    returnedBy: null,
    movementId: null,
    createdBy: 'user-789',
    orgId: 'org-123',
    createdAt: new Date('2026-02-20T10:00:00Z'),
    updatedAt: new Date('2026-02-20T10:00:00Z'),
    lines: [
      {
        id: 'line-1',
        productId: 'product-001',
        locationId: null,
        quantity: 5,
        salePrice: 19.99,
        currency: 'USD',
        extra: null,
        orgId: 'org-123',
      },
    ],
  };

  const mockSaleDataWithoutLines = {
    id: 'sale-123',
    saleNumber: 'SALE-2026-000001',
    status: 'DRAFT',
    warehouseId: 'wh-123',
    customerReference: 'CUST-REF-001',
    externalReference: null,
    note: 'Test sale',
    confirmedAt: null,
    confirmedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    pickedAt: null,
    pickedBy: null,
    shippedAt: null,
    shippedBy: null,
    trackingNumber: null,
    shippingCarrier: null,
    shippingNotes: null,
    completedAt: null,
    completedBy: null,
    returnedAt: null,
    returnedBy: null,
    movementId: null,
    createdBy: 'user-789',
    orgId: 'org-123',
    createdAt: new Date('2026-02-20T10:00:00Z'),
    updatedAt: new Date('2026-02-20T10:00:00Z'),
  };

  beforeEach(() => {
    mockPrismaService = {
      sale: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      saleLine: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaSaleRepository(mockPrismaService as any);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return sale', async () => {
      // Arrange
      mockPrismaService.sale.findUnique.mockResolvedValue(mockSaleData);

      // Act
      const result = await repository.findById('sale-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('sale-123');
      expect(result?.saleNumber.getValue()).toBe('SALE-2026-000001');
      expect(result?.status.getValue()).toBe('DRAFT');
      expect(result?.warehouseId).toBe('wh-123');
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.sale.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: wrong orgId When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.sale.findUnique.mockResolvedValue(mockSaleData);

      // Act
      const result = await repository.findById('sale-123', 'wrong-org');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: prisma throws error When: finding by id Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.findUnique.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findById('sale-123', 'org-123')).rejects.toThrow('DB Error');
    });
  });

  describe('findByIdWithoutLines', () => {
    it('Given: valid id and orgId When: finding without lines Then: should return sale without lines', async () => {
      // Arrange
      mockPrismaService.sale.findUnique.mockResolvedValue(mockSaleDataWithoutLines);

      // Act
      const result = await repository.findByIdWithoutLines('sale-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('sale-123');
      expect(result?.getLines()).toHaveLength(0);
    });

    it('Given: wrong orgId When: finding without lines Then: should return null', async () => {
      // Arrange
      mockPrismaService.sale.findUnique.mockResolvedValue(mockSaleDataWithoutLines);

      // Act
      const result = await repository.findByIdWithoutLines('sale-123', 'wrong-org');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('loadLines', () => {
    it('Given: valid saleId When: loading lines Then: should return sale lines', async () => {
      // Arrange
      mockPrismaService.saleLine.findMany.mockResolvedValue([
        {
          id: 'line-1',
          saleId: 'sale-123',
          productId: 'product-001',
          locationId: null,
          quantity: 5,
          salePrice: 19.99,
          currency: 'USD',
          extra: null,
          orgId: 'org-123',
        },
      ]);

      // Act
      const result = await repository.loadLines('sale-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('product-001');
    });
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return sales', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sale-123');
    });

    it('Given: no sales When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findAllWithoutLines', () => {
    it('Given: pagination options When: finding all without lines Then: should return paginated result', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleDataWithoutLines]);
      mockPrismaService.sale.count.mockResolvedValue(1);

      // Act
      const result = await repository.findAllWithoutLines('org-123', { skip: 0, take: 20 });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('Given: more records than take When: finding paginated Then: hasMore should be true', async () => {
      // Arrange
      const manySales = Array.from({ length: 21 }, (_, i) => ({
        ...mockSaleDataWithoutLines,
        id: `sale-${i + 1}`,
        saleNumber: `SALE-2026-${String(i + 1).padStart(6, '0')}`,
      }));
      mockPrismaService.sale.findMany.mockResolvedValue(manySales);
      mockPrismaService.sale.count.mockResolvedValue(25);

      // Act
      const result = await repository.findAllWithoutLines('org-123', { skip: 0, take: 20 });

      // Assert
      expect(result.data).toHaveLength(20);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('exists', () => {
    it('Given: existing sale When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.sale.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('sale-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-existent sale When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.sale.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('Given: valid id and orgId When: deleting Then: should delete sale', async () => {
      // Arrange
      mockPrismaService.sale.delete.mockResolvedValue(mockSaleData);

      // Act
      await repository.delete('sale-123', 'org-123');

      // Assert
      expect(mockPrismaService.sale.delete).toHaveBeenCalledWith({
        where: { id: 'sale-123', orgId: 'org-123' },
      });
    });
  });

  describe('findBySaleNumber', () => {
    it('Given: valid sale number When: finding Then: should return sale', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockResolvedValue(mockSaleData);

      // Act
      const result = await repository.findBySaleNumber('SALE-2026-000001', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.saleNumber.getValue()).toBe('SALE-2026-000001');
      expect(mockPrismaService.sale.findFirst).toHaveBeenCalledWith({
        where: { saleNumber: 'SALE-2026-000001', orgId: 'org-123' },
        include: { lines: true },
      });
    });

    it('Given: non-existent sale number When: finding Then: should return null', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findBySaleNumber('SALE-2026-999999', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('Given: valid status When: finding by status Then: should return matching sales', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleData]);

      // Act
      const result = await repository.findByStatus('DRAFT', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status.getValue()).toBe('DRAFT');
      expect(mockPrismaService.sale.findMany).toHaveBeenCalledWith({
        where: { status: 'DRAFT', orgId: 'org-123' },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByWarehouse', () => {
    it('Given: valid warehouseId When: finding by warehouse Then: should return sales', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleData]);

      // Act
      const result = await repository.findByWarehouse('wh-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.sale.findMany).toHaveBeenCalledWith({
        where: { warehouseId: 'wh-123', orgId: 'org-123' },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByDateRange', () => {
    it('Given: valid date range When: finding by date range Then: should return matching sales', async () => {
      // Arrange
      const startDate = new Date('2026-02-01T00:00:00Z');
      const endDate = new Date('2026-02-28T23:59:59Z');
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleData]);

      // Act
      const result = await repository.findByDateRange(startDate, endDate, 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.sale.findMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          createdAt: { gte: startDate, lte: endDate },
        },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: no sales in range When: finding by date range Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockResolvedValue([]);

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

  describe('getLastSaleNumberForYear', () => {
    it('Given: sales exist for year When: getting last number Then: should return number', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockResolvedValue({
        saleNumber: 'SALE-2026-000010',
      });

      // Act
      const result = await repository.getLastSaleNumberForYear(2026, 'org-123');

      // Assert
      expect(result).toBe('SALE-2026-000010');
      expect(mockPrismaService.sale.findFirst).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          saleNumber: { startsWith: 'SALE-2026-' },
        },
        orderBy: { saleNumber: 'desc' },
        select: { saleNumber: true },
      });
    });

    it('Given: no sales for year When: getting last number Then: should return null', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.getLastSaleNumberForYear(2026, 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByMovementId', () => {
    it('Given: valid movementId When: finding Then: should return sale', async () => {
      // Arrange
      const saleWithMovement = { ...mockSaleData, movementId: 'mov-123' };
      mockPrismaService.sale.findFirst.mockResolvedValue(saleWithMovement);

      // Act
      const result = await repository.findByMovementId('mov-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.sale.findFirst).toHaveBeenCalledWith({
        where: { movementId: 'mov-123', orgId: 'org-123' },
        include: { lines: true },
      });
    });

    it('Given: non-existent movementId When: finding Then: should return null', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByMovementId('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findBySpecification', () => {
    it('Given: specification with pagination When: finding Then: should return paginated result', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123', status: 'DRAFT' }),
      };
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleData]);
      mockPrismaService.sale.count.mockResolvedValue(1);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123', {
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('Given: specification without pagination When: finding Then: should return all results', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleData]);
      mockPrismaService.sale.count.mockResolvedValue(1);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('Given: specification with skip+take less than total When: finding Then: hasMore should be true', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123', status: 'DRAFT' }),
      };
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleData]);
      mockPrismaService.sale.count.mockResolvedValue(50);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123', {
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(50);
    });

    it('Given: prisma throws error When: finding by specification Then: should propagate error', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.sale.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(repository.findBySpecification(mockSpec as any, 'org-123')).rejects.toThrow(
        'DB Error'
      );
    });

    it('Given: prisma throws non-Error object When: finding by specification Then: should propagate it', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.sale.findMany.mockRejectedValue('string error');

      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(repository.findBySpecification(mockSpec as any, 'org-123')).rejects.toBe(
        'string error'
      );
    });
  });

  // =========================================================================
  // NEW TESTS - Coverage extension
  // =========================================================================

  describe('save', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockTx: Record<string, any>;

    beforeEach(() => {
      mockTx = {
        sale: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        saleLine: {
          createMany: jest.fn(),
          deleteMany: jest.fn(),
        },
      };

      // Make $transaction execute the callback with the mock tx
      mockPrismaService.$transaction.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (cb: (tx: any) => Promise<any>) => cb(mockTx)
      );
    });

    it('Given: a new sale without id When: saving Then: should create a new sale', async () => {
      // Arrange
      // Uses statically imported Sale, SaleNumber, SaleStatus

      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2026-001'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: 'wh-123',
          createdBy: 'user-789',
        },
        '', // empty id triggers the else branch (no id)
        'org-123'
      );
      // Override id to be falsy to hit the else branch
      Object.defineProperty(sale, 'id', { get: () => '' });

      const createdSaleData = { ...mockSaleData, id: 'new-sale-id' };
      mockTx.sale.create.mockResolvedValue(createdSaleData);
      mockTx.sale.findUnique.mockResolvedValue({
        ...createdSaleData,
        lines: [],
      });

      // Act
      const result = await repository.save(sale);

      // Assert
      expect(result).not.toBeNull();
      expect(mockTx.sale.create).toHaveBeenCalled();
    });

    it('Given: an existing sale with id When: saving Then: should update the sale', async () => {
      // Arrange
      // Uses statically imported Sale, SaleNumber, SaleStatus
      // Uses statically imported SaleLine, Quantity, SalePrice

      const line = SaleLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(3, 6),
          salePrice: SalePrice.create(25.0, 'USD'),
        },
        'line-1',
        'org-123'
      );

      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2026-001'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: 'wh-123',
          customerReference: 'CUST-001',
          externalReference: 'EXT-001',
          note: 'A note',
          createdBy: 'user-789',
          movementId: 'mov-123',
        },
        'sale-123',
        'org-123',
        [line]
      );

      // existingSale found => update branch
      mockTx.sale.findUnique
        .mockResolvedValueOnce({ id: 'sale-123' }) // first call: check existence
        .mockResolvedValueOnce({
          ...mockSaleData,
          id: 'sale-123',
          lines: [
            {
              id: 'line-1',
              productId: 'product-001',
              locationId: null,
              quantity: 3,
              salePrice: 25.0,
              currency: 'USD',
              extra: null,
              orgId: 'org-123',
            },
          ],
        }); // second call: fetch complete sale
      mockTx.sale.update.mockResolvedValue({ ...mockSaleData, id: 'sale-123' });
      mockTx.saleLine.deleteMany.mockResolvedValue({ count: 1 });
      mockTx.saleLine.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await repository.save(sale);

      // Assert
      expect(result).not.toBeNull();
      expect(mockTx.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sale-123' },
        })
      );
      expect(mockTx.saleLine.deleteMany).toHaveBeenCalledWith({
        where: { saleId: 'sale-123' },
      });
      expect(mockTx.saleLine.createMany).toHaveBeenCalled();
    });

    it('Given: sale with id but not in DB When: saving Then: should create with provided id', async () => {
      // Arrange
      // Uses statically imported Sale, SaleNumber, SaleStatus

      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2026-001'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: 'wh-123',
          createdBy: 'user-789',
        },
        'sale-new-id',
        'org-123'
      );

      // existingSale NOT found => create with provided ID
      mockTx.sale.findUnique
        .mockResolvedValueOnce(null) // first call: not found
        .mockResolvedValueOnce({
          ...mockSaleData,
          id: 'sale-new-id',
          lines: [],
        }); // second call: fetch complete
      mockTx.sale.create.mockResolvedValue({ ...mockSaleData, id: 'sale-new-id' });

      // Act
      const result = await repository.save(sale);

      // Assert
      expect(result).not.toBeNull();
      expect(mockTx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: 'sale-new-id' }),
        })
      );
    });

    it('Given: save completes but refetch returns null When: saving Then: should throw error', async () => {
      // Arrange
      // Uses statically imported Sale, SaleNumber, SaleStatus

      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2026-001'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: 'wh-123',
          createdBy: 'user-789',
        },
        '', // no id
        'org-123'
      );
      Object.defineProperty(sale, 'id', { get: () => '' });

      mockTx.sale.create.mockResolvedValue({ ...mockSaleData, id: 'new-sale' });
      mockTx.sale.findUnique.mockResolvedValue(null); // refetch fails

      // Act & Assert
      await expect(repository.save(sale)).rejects.toThrow('Failed to retrieve saved sale');
    });

    it('Given: save with no lines When: saving Then: should not call createMany', async () => {
      // Arrange
      // Uses statically imported Sale, SaleNumber, SaleStatus

      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2026-001'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: 'wh-123',
          createdBy: 'user-789',
        },
        '', // no id
        'org-123',
        [] // empty lines
      );
      Object.defineProperty(sale, 'id', { get: () => '' });

      mockTx.sale.create.mockResolvedValue({ ...mockSaleData, id: 'new-id' });
      mockTx.sale.findUnique.mockResolvedValue({
        ...mockSaleData,
        id: 'new-id',
        lines: [],
      });

      // Act
      await repository.save(sale);

      // Assert
      expect(mockTx.saleLine.createMany).not.toHaveBeenCalled();
    });

    it('Given: transaction throws error When: saving Then: should propagate error', async () => {
      // Arrange
      // Uses statically imported Sale, SaleNumber, SaleStatus

      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2026-001'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: 'wh-123',
          createdBy: 'user-789',
        },
        '',
        'org-123'
      );
      Object.defineProperty(sale, 'id', { get: () => '' });

      mockPrismaService.$transaction.mockRejectedValue(new Error('Transaction failed'));

      // Act & Assert
      await expect(repository.save(sale)).rejects.toThrow('Transaction failed');
    });

    it('Given: transaction throws non-Error object When: saving Then: should propagate it', async () => {
      // Arrange
      // Uses statically imported Sale, SaleNumber, SaleStatus

      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2026-001'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: 'wh-123',
          createdBy: 'user-789',
        },
        '',
        'org-123'
      );
      Object.defineProperty(sale, 'id', { get: () => '' });

      mockPrismaService.$transaction.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.save(sale)).rejects.toBe('string error');
    });

    it('Given: sale with all optional fields populated When: saving Then: should pass all fields to prisma', async () => {
      // Arrange
      // Uses statically imported Sale, SaleNumber, SaleStatus

      const confirmedAt = new Date('2026-02-21T10:00:00Z');
      const cancelledAt = new Date('2026-02-22T10:00:00Z');
      const pickedAt = new Date('2026-02-23T10:00:00Z');
      const shippedAt = new Date('2026-02-24T10:00:00Z');
      const completedAt = new Date('2026-02-25T10:00:00Z');
      const returnedAt = new Date('2026-02-26T10:00:00Z');

      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2026-001'),
          status: SaleStatus.create('COMPLETED'),
          warehouseId: 'wh-123',
          customerReference: 'CUST-001',
          externalReference: 'EXT-001',
          note: 'Test note',
          confirmedAt,
          confirmedBy: 'user-1',
          cancelledAt,
          cancelledBy: 'user-2',
          pickedAt,
          pickedBy: 'user-3',
          shippedAt,
          shippedBy: 'user-4',
          trackingNumber: 'TRACK-001',
          shippingCarrier: 'FedEx',
          shippingNotes: 'Handle with care',
          completedAt,
          completedBy: 'user-5',
          returnedAt,
          returnedBy: 'user-6',
          createdBy: 'user-789',
          movementId: 'mov-001',
        },
        '',
        'org-123'
      );
      Object.defineProperty(sale, 'id', { get: () => '' });

      const fullSaleData = {
        ...mockSaleData,
        id: 'new-full-sale',
        status: 'COMPLETED',
        customerReference: 'CUST-001',
        externalReference: 'EXT-001',
        note: 'Test note',
        confirmedAt,
        confirmedBy: 'user-1',
        cancelledAt,
        cancelledBy: 'user-2',
        pickedAt,
        pickedBy: 'user-3',
        shippedAt,
        shippedBy: 'user-4',
        trackingNumber: 'TRACK-001',
        shippingCarrier: 'FedEx',
        shippingNotes: 'Handle with care',
        completedAt,
        completedBy: 'user-5',
        returnedAt,
        returnedBy: 'user-6',
        movementId: 'mov-001',
        lines: [],
      };

      mockTx.sale.create.mockResolvedValue(fullSaleData);
      mockTx.sale.findUnique.mockResolvedValue(fullSaleData);

      // Act
      const result = await repository.save(sale);

      // Assert
      expect(result).not.toBeNull();
      expect(mockTx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerReference: 'CUST-001',
            externalReference: 'EXT-001',
            note: 'Test note',
            trackingNumber: 'TRACK-001',
            shippingCarrier: 'FedEx',
            shippingNotes: 'Handle with care',
            movementId: 'mov-001',
          }),
        })
      );
    });
  });

  describe('addLine', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockTx: Record<string, any>;

    beforeEach(() => {
      mockTx = {
        sale: {
          findUnique: jest.fn(),
        },
        saleLine: {
          create: jest.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (cb: (tx: any) => Promise<any>) => cb(mockTx)
      );
    });

    it('Given: valid sale in DRAFT status When: adding line Then: should create line and return it', async () => {
      // Arrange
      // Uses statically imported SaleLine, Quantity, SalePrice

      const line = SaleLine.reconstitute(
        {
          productId: 'product-001',
          locationId: 'loc-001',
          quantity: Quantity.create(5, 6),
          salePrice: SalePrice.create(19.99, 'USD'),
          extra: { color: 'red' },
        },
        'line-new',
        'org-123'
      );

      mockTx.sale.findUnique.mockResolvedValue({
        id: 'sale-123',
        status: 'DRAFT',
        orgId: 'org-123',
      });

      mockTx.saleLine.create.mockResolvedValue({
        id: 'line-new',
        productId: 'product-001',
        locationId: 'loc-001',
        quantity: 5,
        salePrice: 19.99,
        currency: 'USD',
        extra: { color: 'red' },
        orgId: 'org-123',
      });

      // Act
      const result = await repository.addLine('sale-123', line, 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result.productId).toBe('product-001');
      expect(result.locationId).toBe('loc-001');
      expect(mockTx.saleLine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            saleId: 'sale-123',
            productId: 'product-001',
            locationId: 'loc-001',
            orgId: 'org-123',
          }),
        })
      );
    });

    it('Given: sale not found When: adding line Then: should throw NotFoundError', async () => {
      // Arrange
      // Uses statically imported SaleLine, Quantity, SalePrice

      const line = SaleLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(5, 6),
          salePrice: SalePrice.create(19.99, 'USD'),
        },
        'line-new',
        'org-123'
      );

      mockTx.sale.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.addLine('sale-123', line, 'org-123')).rejects.toThrow(
        'Sale with ID sale-123 not found'
      );
    });

    it('Given: sale belongs to different org When: adding line Then: should throw NotFoundError', async () => {
      // Arrange
      // Uses statically imported SaleLine, Quantity, SalePrice

      const line = SaleLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(5, 6),
          salePrice: SalePrice.create(19.99, 'USD'),
        },
        'line-new',
        'org-123'
      );

      mockTx.sale.findUnique.mockResolvedValue({
        id: 'sale-123',
        status: 'DRAFT',
        orgId: 'different-org',
      });

      // Act & Assert
      await expect(repository.addLine('sale-123', line, 'org-123')).rejects.toThrow(
        'Sale with ID sale-123 not found'
      );
    });

    it('Given: sale not in DRAFT status When: adding line Then: should throw BusinessRuleError', async () => {
      // Arrange
      // Uses statically imported SaleLine, Quantity, SalePrice

      const line = SaleLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(5, 6),
          salePrice: SalePrice.create(19.99, 'USD'),
        },
        'line-new',
        'org-123'
      );

      mockTx.sale.findUnique.mockResolvedValue({
        id: 'sale-123',
        status: 'CONFIRMED',
        orgId: 'org-123',
      });

      // Act & Assert
      await expect(repository.addLine('sale-123', line, 'org-123')).rejects.toThrow(
        'Cannot add lines to sale in CONFIRMED status'
      );
    });

    it('Given: line without extra When: adding line Then: should pass undefined for extra', async () => {
      // Arrange
      // Uses statically imported SaleLine, Quantity, SalePrice

      const line = SaleLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(5, 6),
          salePrice: SalePrice.create(19.99, 'USD'),
        },
        'line-new',
        'org-123'
      );

      mockTx.sale.findUnique.mockResolvedValue({
        id: 'sale-123',
        status: 'DRAFT',
        orgId: 'org-123',
      });

      mockTx.saleLine.create.mockResolvedValue({
        id: 'line-new',
        productId: 'product-001',
        locationId: null,
        quantity: 5,
        salePrice: 19.99,
        currency: 'USD',
        extra: null,
        orgId: 'org-123',
      });

      // Act
      const result = await repository.addLine('sale-123', line, 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result.extra).toBeUndefined();
    });

    it('Given: generic error in transaction When: adding line Then: should propagate error', async () => {
      // Arrange
      // Uses statically imported SaleLine, Quantity, SalePrice

      const line = SaleLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(5, 6),
          salePrice: SalePrice.create(19.99, 'USD'),
        },
        'line-new',
        'org-123'
      );

      mockPrismaService.$transaction.mockRejectedValue(new Error('DB connection lost'));

      // Act & Assert
      await expect(repository.addLine('sale-123', line, 'org-123')).rejects.toThrow(
        'DB connection lost'
      );
    });

    it('Given: non-Error object thrown in transaction When: adding line Then: should propagate it', async () => {
      // Arrange
      // Uses statically imported SaleLine, Quantity, SalePrice

      const line = SaleLine.reconstitute(
        {
          productId: 'product-001',
          quantity: Quantity.create(5, 6),
          salePrice: SalePrice.create(19.99, 'USD'),
        },
        'line-new',
        'org-123'
      );

      mockPrismaService.$transaction.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.addLine('sale-123', line, 'org-123')).rejects.toBe('string error');
    });
  });

  describe('getNextSaleNumber', () => {
    it('Given: valid orgId and year When: getting next sale number Then: should return the number from DB function', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ get_next_sale_number: 'SALE-2026-001' }]);

      // Act
      const result = await repository.getNextSaleNumber('org-123', 2026);

      // Assert
      expect(result).toBe('SALE-2026-001');
    });

    it('Given: prisma throws error When: getting next sale number Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Function not found'));

      // Act & Assert
      await expect(repository.getNextSaleNumber('org-123', 2026)).rejects.toThrow(
        'Function not found'
      );
    });

    it('Given: prisma throws non-Error object When: getting next sale number Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue('raw error');

      // Act & Assert
      await expect(repository.getNextSaleNumber('org-123', 2026)).rejects.toBe('raw error');
    });
  });

  describe('findByIdWithoutLines - error handling', () => {
    it('Given: prisma throws error When: finding by id without lines Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.findUnique.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByIdWithoutLines('sale-123', 'org-123')).rejects.toThrow(
        'DB Error'
      );
    });

    it('Given: prisma throws non-Error object When: finding by id without lines Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.findUnique.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findByIdWithoutLines('sale-123', 'org-123')).rejects.toBe(
        'string error'
      );
    });

    it('Given: null result When: finding by id without lines Then: should return null', async () => {
      // Arrange
      mockPrismaService.sale.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findByIdWithoutLines('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findById - non-Error error handling', () => {
    it('Given: prisma throws non-Error object When: finding by id Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.findUnique.mockRejectedValue(42);

      // Act & Assert
      await expect(repository.findById('sale-123', 'org-123')).rejects.toBe(42);
    });
  });

  describe('loadLines - additional coverage', () => {
    it('Given: prisma throws error When: loading lines Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.saleLine.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.loadLines('sale-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error object When: loading lines Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.saleLine.findMany.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.loadLines('sale-123', 'org-123')).rejects.toBe('string error');
    });

    it('Given: line data with Decimal-like quantity and salePrice objects When: loading lines Then: should use toNumber()', async () => {
      // Arrange
      mockPrismaService.saleLine.findMany.mockResolvedValue([
        {
          id: 'line-1',
          saleId: 'sale-123',
          productId: 'product-001',
          locationId: 'loc-001',
          quantity: { toNumber: () => 10 },
          salePrice: { toNumber: () => 49.99 },
          currency: 'USD',
          extra: { note: 'test' },
          orgId: 'org-123',
        },
      ]);

      // Act
      const result = await repository.loadLines('sale-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('product-001');
      expect(result[0].locationId).toBe('loc-001');
      expect(result[0].quantity.getNumericValue()).toBe(10);
      expect(result[0].salePrice.getAmount()).toBe(49.99);
      expect(result[0].extra).toEqual({ note: 'test' });
    });

    it('Given: line data with string quantity and salePrice When: loading lines Then: should convert via Number()', async () => {
      // Arrange
      mockPrismaService.saleLine.findMany.mockResolvedValue([
        {
          id: 'line-1',
          saleId: 'sale-123',
          productId: 'product-001',
          locationId: null,
          quantity: '7',
          salePrice: '15.50',
          currency: 'COP',
          extra: null,
          orgId: 'org-123',
        },
      ]);

      // Act
      const result = await repository.loadLines('sale-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].quantity.getNumericValue()).toBe(7);
      expect(result[0].salePrice.getAmount()).toBe(15.5);
    });

    it('Given: empty lines array When: loading lines Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.saleLine.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.loadLines('sale-123', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findAll - error handling', () => {
    it('Given: prisma throws error When: finding all Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error object When: finding all Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe('string error');
    });
  });

  describe('findAllWithoutLines - additional coverage', () => {
    it('Given: no pagination options When: finding all without lines Then: should use defaults (skip=0, take=20)', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleDataWithoutLines]);
      mockPrismaService.sale.count.mockResolvedValue(1);

      // Act
      const result = await repository.findAllWithoutLines('org-123');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaService.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 21, // take + 1
        })
      );
    });

    it('Given: hasMore is true When: finding all without lines Then: nextCursor should be set to last item id', async () => {
      // Arrange
      const sales = Array.from({ length: 21 }, (_, i) => ({
        ...mockSaleDataWithoutLines,
        id: `sale-${i + 1}`,
        saleNumber: `SALE-2026-${String(i + 1).padStart(6, '0')}`,
      }));
      mockPrismaService.sale.findMany.mockResolvedValue(sales);
      mockPrismaService.sale.count.mockResolvedValue(30);

      // Act
      const result = await repository.findAllWithoutLines('org-123', { skip: 0, take: 20 });

      // Assert
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('sale-20');
    });

    it('Given: prisma throws error When: finding all without lines Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findAllWithoutLines('org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error object When: finding all without lines Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findAllWithoutLines('org-123')).rejects.toBe('string error');
    });

    it('Given: empty results When: finding all without lines Then: should return empty data with no nextCursor', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockResolvedValue([]);
      mockPrismaService.sale.count.mockResolvedValue(0);

      // Act
      const result = await repository.findAllWithoutLines('org-123', { skip: 0, take: 20 });

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe('exists - error handling', () => {
    it('Given: prisma throws error When: checking existence Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.exists('sale-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error object When: checking existence Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.count.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.exists('sale-123', 'org-123')).rejects.toBe('string error');
    });
  });

  describe('delete - error handling', () => {
    it('Given: prisma throws error When: deleting Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.delete.mockRejectedValue(new Error('Record not found'));

      // Act & Assert
      await expect(repository.delete('sale-123', 'org-123')).rejects.toThrow('Record not found');
    });

    it('Given: prisma throws non-Error object When: deleting Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.delete.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.delete('sale-123', 'org-123')).rejects.toBe('string error');
    });
  });

  describe('findBySaleNumber - error handling', () => {
    it('Given: prisma throws error When: finding by sale number Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findBySaleNumber('SALE-2026-000001', 'org-123')).rejects.toThrow(
        'DB Error'
      );
    });

    it('Given: prisma throws non-Error object When: finding by sale number Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findBySaleNumber('SALE-2026-000001', 'org-123')).rejects.toBe(
        'string error'
      );
    });
  });

  describe('findByStatus - error handling', () => {
    it('Given: prisma throws error When: finding by status Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByStatus('DRAFT', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error object When: finding by status Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findByStatus('DRAFT', 'org-123')).rejects.toBe('string error');
    });

    it('Given: empty result When: finding by status Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByStatus('CANCELLED', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findByWarehouse - error handling', () => {
    it('Given: prisma throws error When: finding by warehouse Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByWarehouse('wh-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error object When: finding by warehouse Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findByWarehouse('wh-123', 'org-123')).rejects.toBe('string error');
    });

    it('Given: empty result When: finding by warehouse Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByWarehouse('wh-999', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findByDateRange - error handling', () => {
    it('Given: prisma throws error When: finding by date range Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByDateRange(new Date(), new Date(), 'org-123')).rejects.toThrow(
        'DB Error'
      );
    });

    it('Given: prisma throws non-Error object When: finding by date range Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.findMany.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findByDateRange(new Date(), new Date(), 'org-123')).rejects.toBe(
        'string error'
      );
    });
  });

  describe('getLastSaleNumberForYear - error handling', () => {
    it('Given: prisma throws error When: getting last sale number Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.getLastSaleNumberForYear(2026, 'org-123')).rejects.toThrow(
        'DB Error'
      );
    });

    it('Given: prisma throws non-Error object When: getting last sale number Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.getLastSaleNumberForYear(2026, 'org-123')).rejects.toBe(
        'string error'
      );
    });
  });

  describe('findByMovementId - error handling', () => {
    it('Given: prisma throws error When: finding by movement id Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByMovementId('mov-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error object When: finding by movement id Then: should propagate it', async () => {
      // Arrange
      mockPrismaService.sale.findFirst.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findByMovementId('mov-123', 'org-123')).rejects.toBe('string error');
    });
  });

  describe('mapToEntity - domain mapping with all optional fields', () => {
    it('Given: sale data with all fields populated When: finding by id Then: should map all fields correctly', async () => {
      // Arrange
      const confirmedAt = new Date('2026-02-21T10:00:00Z');
      const cancelledAt = new Date('2026-02-22T10:00:00Z');
      const pickedAt = new Date('2026-02-23T10:00:00Z');
      const shippedAt = new Date('2026-02-24T10:00:00Z');
      const completedAt = new Date('2026-02-25T10:00:00Z');
      const returnedAt = new Date('2026-02-26T10:00:00Z');

      const fullSaleData = {
        ...mockSaleData,
        status: 'COMPLETED',
        customerReference: 'CUST-001',
        externalReference: 'EXT-001',
        note: 'Full sale note',
        confirmedAt,
        confirmedBy: 'user-1',
        cancelledAt,
        cancelledBy: 'user-2',
        pickedAt,
        pickedBy: 'user-3',
        shippedAt,
        shippedBy: 'user-4',
        trackingNumber: 'TRACK-001',
        shippingCarrier: 'DHL',
        shippingNotes: 'Fragile',
        completedAt,
        completedBy: 'user-5',
        returnedAt,
        returnedBy: 'user-6',
        movementId: 'mov-001',
        lines: [
          {
            id: 'line-1',
            productId: 'product-001',
            locationId: 'loc-001',
            quantity: { toNumber: () => 10 },
            salePrice: { toNumber: () => 99.99 },
            currency: 'USD',
            extra: { batch: 'B001' },
            orgId: 'org-123',
          },
        ],
      };

      mockPrismaService.sale.findUnique.mockResolvedValue(fullSaleData);

      // Act
      const result = await repository.findById('sale-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.status.getValue()).toBe('COMPLETED');
      expect(result?.customerReference).toBe('CUST-001');
      expect(result?.externalReference).toBe('EXT-001');
      expect(result?.note).toBe('Full sale note');
      expect(result?.confirmedAt).toEqual(confirmedAt);
      expect(result?.confirmedBy).toBe('user-1');
      expect(result?.cancelledAt).toEqual(cancelledAt);
      expect(result?.cancelledBy).toBe('user-2');
      expect(result?.pickedAt).toEqual(pickedAt);
      expect(result?.pickedBy).toBe('user-3');
      expect(result?.shippedAt).toEqual(shippedAt);
      expect(result?.shippedBy).toBe('user-4');
      expect(result?.trackingNumber).toBe('TRACK-001');
      expect(result?.shippingCarrier).toBe('DHL');
      expect(result?.shippingNotes).toBe('Fragile');
      expect(result?.completedAt).toEqual(completedAt);
      expect(result?.completedBy).toBe('user-5');
      expect(result?.returnedAt).toEqual(returnedAt);
      expect(result?.returnedBy).toBe('user-6');
      expect(result?.movementId).toBe('mov-001');
      expect(result?.getLines()).toHaveLength(1);
      expect(result?.getLines()[0].locationId).toBe('loc-001');
      expect(result?.getLines()[0].extra).toEqual({ batch: 'B001' });
    });

    it('Given: sale data with multiple lines When: mapping Then: should map all lines', async () => {
      // Arrange
      const multiLineSaleData = {
        ...mockSaleData,
        lines: [
          {
            id: 'line-1',
            productId: 'product-001',
            locationId: null,
            quantity: 5,
            salePrice: 19.99,
            currency: 'USD',
            extra: null,
            orgId: 'org-123',
          },
          {
            id: 'line-2',
            productId: 'product-002',
            locationId: 'loc-002',
            quantity: 3,
            salePrice: 29.99,
            currency: 'USD',
            extra: { color: 'blue' },
            orgId: 'org-123',
          },
        ],
      };

      mockPrismaService.sale.findUnique.mockResolvedValue(multiLineSaleData);

      // Act
      const result = await repository.findById('sale-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.getLines()).toHaveLength(2);
      expect(result?.getLines()[0].productId).toBe('product-001');
      expect(result?.getLines()[1].productId).toBe('product-002');
      expect(result?.getLines()[1].locationId).toBe('loc-002');
    });
  });

  describe('mapToEntityWithoutLines - domain mapping', () => {
    it('Given: sale data with all optional fields populated When: mapping without lines Then: should map correctly', async () => {
      // Arrange
      const confirmedAt = new Date('2026-02-21T10:00:00Z');
      const shippedAt = new Date('2026-02-24T10:00:00Z');

      const fullSaleDataNoLines = {
        ...mockSaleDataWithoutLines,
        status: 'SHIPPED',
        externalReference: 'EXT-REF',
        confirmedAt,
        confirmedBy: 'user-1',
        shippedAt,
        shippedBy: 'user-4',
        trackingNumber: 'TRACK-001',
        shippingCarrier: 'UPS',
        shippingNotes: 'Leave at door',
        movementId: 'mov-001',
      };

      mockPrismaService.sale.findUnique.mockResolvedValue(fullSaleDataNoLines);

      // Act
      const result = await repository.findByIdWithoutLines('sale-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.status.getValue()).toBe('SHIPPED');
      expect(result?.externalReference).toBe('EXT-REF');
      expect(result?.confirmedAt).toEqual(confirmedAt);
      expect(result?.confirmedBy).toBe('user-1');
      expect(result?.shippedAt).toEqual(shippedAt);
      expect(result?.shippedBy).toBe('user-4');
      expect(result?.trackingNumber).toBe('TRACK-001');
      expect(result?.shippingCarrier).toBe('UPS');
      expect(result?.shippingNotes).toBe('Leave at door');
      expect(result?.movementId).toBe('mov-001');
      expect(result?.getLines()).toHaveLength(0);
    });
  });

  describe('findByWarehouse - multiple results', () => {
    it('Given: multiple sales for warehouse When: finding by warehouse Then: should return all sales', async () => {
      // Arrange
      const sale2 = {
        ...mockSaleData,
        id: 'sale-456',
        saleNumber: 'SALE-2026-000002',
      };
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleData, sale2]);

      // Act
      const result = await repository.findByWarehouse('wh-123', 'org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sale-123');
      expect(result[1].id).toBe('sale-456');
    });
  });

  describe('findByStatus - multiple statuses', () => {
    it('Given: multiple sales with CONFIRMED status When: finding by status Then: should return all', async () => {
      // Arrange
      const confirmedSale1 = {
        ...mockSaleData,
        id: 'sale-c1',
        saleNumber: 'SALE-2026-000010',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy: 'user-1',
      };
      const confirmedSale2 = {
        ...mockSaleData,
        id: 'sale-c2',
        saleNumber: 'SALE-2026-000011',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy: 'user-2',
      };
      mockPrismaService.sale.findMany.mockResolvedValue([confirmedSale1, confirmedSale2]);

      // Act
      const result = await repository.findByStatus('CONFIRMED', 'org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].status.getValue()).toBe('CONFIRMED');
      expect(result[1].status.getValue()).toBe('CONFIRMED');
    });
  });

  describe('findAll - multiple sales mapping', () => {
    it('Given: multiple sales When: finding all Then: should map all sales with lines', async () => {
      // Arrange
      const sale2 = {
        ...mockSaleData,
        id: 'sale-456',
        saleNumber: 'SALE-2026-000002',
        lines: [
          {
            id: 'line-2',
            productId: 'product-002',
            locationId: null,
            quantity: 10,
            salePrice: 29.99,
            currency: 'USD',
            extra: null,
            orgId: 'org-123',
          },
        ],
      };
      mockPrismaService.sale.findMany.mockResolvedValue([mockSaleData, sale2]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].getLines()).toHaveLength(1);
      expect(result[1].getLines()).toHaveLength(1);
      expect(result[1].getLines()[0].productId).toBe('product-002');
    });
  });

  describe('save - update branch with lines containing extra and locationId', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockTx: Record<string, any>;

    beforeEach(() => {
      mockTx = {
        sale: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        saleLine: {
          createMany: jest.fn(),
          deleteMany: jest.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (cb: (tx: any) => Promise<any>) => cb(mockTx)
      );
    });

    it('Given: sale with lines that have locationId and extra When: saving Then: should include those fields in createMany', async () => {
      // Arrange
      // Uses statically imported Sale, SaleNumber, SaleStatus
      // Uses statically imported SaleLine, Quantity, SalePrice

      const line = SaleLine.reconstitute(
        {
          productId: 'product-001',
          locationId: 'loc-001',
          quantity: Quantity.create(5, 6),
          salePrice: SalePrice.create(25.0, 'USD'),
          extra: { batch: 'B001', lot: 'L001' },
        },
        'line-1',
        'org-123'
      );

      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2026-001'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: 'wh-123',
          createdBy: 'user-789',
        },
        '',
        'org-123',
        [line]
      );
      Object.defineProperty(sale, 'id', { get: () => '' });

      mockTx.sale.create.mockResolvedValue({ ...mockSaleData, id: 'new-id' });
      mockTx.saleLine.createMany.mockResolvedValue({ count: 1 });
      mockTx.sale.findUnique.mockResolvedValue({
        ...mockSaleData,
        id: 'new-id',
        lines: [
          {
            id: 'line-1',
            productId: 'product-001',
            locationId: 'loc-001',
            quantity: 5,
            salePrice: 25.0,
            currency: 'USD',
            extra: { batch: 'B001', lot: 'L001' },
            orgId: 'org-123',
          },
        ],
      });

      // Act
      const result = await repository.save(sale);

      // Assert
      expect(result).not.toBeNull();
      expect(result.getLines()).toHaveLength(1);
      expect(result.getLines()[0].locationId).toBe('loc-001');
      expect(result.getLines()[0].extra).toEqual({ batch: 'B001', lot: 'L001' });
      expect(mockTx.saleLine.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              productId: 'product-001',
              locationId: 'loc-001',
            }),
          ]),
        })
      );
    });
  });
});
