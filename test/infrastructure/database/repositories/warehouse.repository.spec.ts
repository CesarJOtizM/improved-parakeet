import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaWarehouseRepository } from '@infrastructure/database/repositories/warehouse.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

describe('PrismaWarehouseRepository', () => {
  let repository: PrismaWarehouseRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrismaService: { warehouse: Record<string, jest.Mock<any>> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCacheService: Record<string, jest.Mock<any>>;

  const mockWarehouseData = {
    id: 'warehouse-123',
    code: 'WH-001',
    name: 'Main Warehouse',
    description: 'Main warehouse description',
    address: '123 Main St, City',
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      warehouse: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    repository = new PrismaWarehouseRepository(
      mockPrismaService as unknown as PrismaService,
      mockCacheService
    );
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return warehouse', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouseData);

      // Act
      const result = await repository.findById('warehouse-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('warehouse-123');
      expect(result?.code.getValue()).toBe('WH-001');
      expect(result?.name).toBe('Main Warehouse');
    });

    it('Given: cached warehouse When: finding by id Then: should return from cache', async () => {
      // Arrange
      const cachedWarehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-001'),
          name: 'Cached Warehouse',
          isActive: true,
        },
        'warehouse-123',
        'org-123'
      );
      mockCacheService.get.mockResolvedValue(ok(cachedWarehouse));

      // Act
      const result = await repository.findById('warehouse-123', 'org-123');

      // Assert
      expect(result).toEqual(cachedWarehouse);
      expect(mockPrismaService.warehouse.findFirst).not.toHaveBeenCalled();
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockPrismaService.warehouse.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by id Then: should throw error', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockPrismaService.warehouse.findFirst.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(repository.findById('warehouse-123', 'org-123')).rejects.toThrow(
        'Database error'
      );
    });

    it('Given: warehouse without address When: finding by id Then: should return warehouse with undefined address', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.warehouse.findFirst.mockResolvedValue({
        ...mockWarehouseData,
        address: null,
      });

      // Act
      const result = await repository.findById('warehouse-123', 'org-123');

      // Assert
      expect(result?.address).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('Given: warehouses exist When: finding all Then: should return all warehouses', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockResolvedValue([mockWarehouseData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].code.getValue()).toBe('WH-001');
    });

    it('Given: no warehouses When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding all Then: should throw error', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockRejectedValue(new Error('Query failed'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('Query failed');
    });
  });

  describe('exists', () => {
    it('Given: warehouse exists When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.warehouse.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('warehouse-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: warehouse does not exist When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.warehouse.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.warehouse.count.mockRejectedValue(new Error('Count failed'));

      // Act & Assert
      await expect(repository.exists('warehouse-123', 'org-123')).rejects.toThrow('Count failed');
    });
  });

  describe('save', () => {
    it('Given: existing warehouse When: saving Then: should update warehouse', async () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-001'),
          name: 'Updated Warehouse',
          address: Address.create('456 New St'),
          isActive: true,
        },
        'warehouse-123',
        'org-123'
      );
      mockPrismaService.warehouse.findUnique.mockResolvedValue(mockWarehouseData);
      mockPrismaService.warehouse.update.mockResolvedValue({
        ...mockWarehouseData,
        name: 'Updated Warehouse',
      });
      mockCacheService.delete.mockResolvedValue(ok(undefined));
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(warehouse);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.warehouse.update).toHaveBeenCalled();
    });

    it('Given: new warehouse When: saving Then: should create warehouse', async () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-002'),
          name: 'New Warehouse',
          isActive: true,
        },
        'new-warehouse-id',
        'org-123'
      );
      mockPrismaService.warehouse.findUnique.mockResolvedValue(null);
      mockPrismaService.warehouse.create.mockResolvedValue({
        ...mockWarehouseData,
        id: 'new-warehouse-id',
        code: 'WH-002',
        name: 'New Warehouse',
      });
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(warehouse);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.warehouse.create).toHaveBeenCalled();
    });

    it('Given: warehouse without id When: saving Then: should create warehouse', async () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-003'),
          name: 'Brand New Warehouse',
          isActive: true,
        },
        undefined,
        'org-123'
      );
      mockPrismaService.warehouse.create.mockResolvedValue({
        ...mockWarehouseData,
        id: 'generated-id',
        code: 'WH-003',
        name: 'Brand New Warehouse',
      });
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(warehouse);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.warehouse.create).toHaveBeenCalled();
    });

    it('Given: database error When: saving Then: should throw error', async () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-001'),
          name: 'Test Warehouse',
          isActive: true,
        },
        'warehouse-123',
        'org-123'
      );
      mockPrismaService.warehouse.findUnique.mockResolvedValue(mockWarehouseData);
      mockPrismaService.warehouse.update.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(repository.save(warehouse)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('Given: existing warehouse When: deleting Then: should soft delete warehouse', async () => {
      // Arrange
      mockPrismaService.warehouse.updateMany.mockResolvedValue({ count: 1 });
      mockCacheService.delete.mockResolvedValue(ok(undefined));

      // Act
      await repository.delete('warehouse-123', 'org-123');

      // Assert
      expect(mockPrismaService.warehouse.updateMany).toHaveBeenCalledWith({
        where: { id: 'warehouse-123', orgId: 'org-123' },
        data: { isActive: false },
      });
    });

    it('Given: database error When: deleting Then: should throw error', async () => {
      // Arrange
      mockPrismaService.warehouse.updateMany.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('warehouse-123', 'org-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('findByCode', () => {
    it('Given: valid code When: finding by code Then: should return warehouse', async () => {
      // Arrange
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouseData);
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.findByCode('WH-001', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.code.getValue()).toBe('WH-001');
    });

    it('Given: cached warehouse When: finding by code Then: should return from cache', async () => {
      // Arrange
      const cachedWarehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-001'),
          name: 'Cached Warehouse',
          isActive: true,
        },
        'warehouse-123',
        'org-123'
      );
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouseData);
      mockCacheService.get.mockResolvedValue(ok(cachedWarehouse));

      // Act
      const result = await repository.findByCode('WH-001', 'org-123');

      // Assert
      expect(result).toEqual(cachedWarehouse);
    });

    it('Given: non-existent code When: finding by code Then: should return null', async () => {
      // Arrange
      mockPrismaService.warehouse.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByCode('NON-EXISTENT', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by code Then: should throw error', async () => {
      // Arrange
      mockPrismaService.warehouse.findFirst.mockRejectedValue(new Error('Code lookup failed'));

      // Act & Assert
      await expect(repository.findByCode('WH-001', 'org-123')).rejects.toThrow(
        'Code lookup failed'
      );
    });
  });

  describe('existsByCode', () => {
    it('Given: code exists When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.warehouse.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByCode('WH-001', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: code does not exist When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.warehouse.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsByCode('NON-EXISTENT', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking code existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.warehouse.count.mockRejectedValue(new Error('Code count failed'));

      // Act & Assert
      await expect(repository.existsByCode('WH-001', 'org-123')).rejects.toThrow(
        'Code count failed'
      );
    });
  });

  describe('findActive', () => {
    it('Given: active warehouses exist When: finding active Then: should return them', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockResolvedValue([mockWarehouseData]);

      // Act
      const result = await repository.findActive('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('Given: no active warehouses When: finding active Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findActive('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding active Then: should throw error', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockRejectedValue(new Error('Active query failed'));

      // Act & Assert
      await expect(repository.findActive('org-123')).rejects.toThrow('Active query failed');
    });
  });

  describe('repository without cache service', () => {
    it('Given: no cache service When: finding by id Then: should query database directly', async () => {
      // Arrange
      const repoWithoutCache = new PrismaWarehouseRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouseData);

      // Act
      const result = await repoWithoutCache.findById('warehouse-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.warehouse.findFirst).toHaveBeenCalled();
    });
  });
});
