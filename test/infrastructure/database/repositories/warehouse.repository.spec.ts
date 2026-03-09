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

    it('Given: no cache service When: saving new warehouse Then: should not cache', async () => {
      // Arrange
      const repoWithoutCache = new PrismaWarehouseRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
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

      // Act
      const result = await repoWithoutCache.save(warehouse);

      // Assert
      expect(result).not.toBeNull();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('Given: no cache service When: updating warehouse Then: should not invalidate cache', async () => {
      // Arrange
      const repoWithoutCache = new PrismaWarehouseRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-001'),
          name: 'Updated Warehouse',
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

      // Act
      const result = await repoWithoutCache.save(warehouse);

      // Assert
      expect(result).not.toBeNull();
      expect(mockCacheService.delete).not.toHaveBeenCalled();
    });

    it('Given: no cache service When: deleting warehouse Then: should not invalidate cache', async () => {
      // Arrange
      const repoWithoutCache = new PrismaWarehouseRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
      mockPrismaService.warehouse.updateMany.mockResolvedValue({ count: 1 });

      // Act
      await repoWithoutCache.delete('warehouse-123', 'org-123');

      // Assert
      expect(mockCacheService.delete).not.toHaveBeenCalled();
    });

    it('Given: no cache service When: finding by code Then: should query database directly', async () => {
      // Arrange
      const repoWithoutCache = new PrismaWarehouseRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
      mockPrismaService.warehouse.findFirst.mockResolvedValue(mockWarehouseData);

      // Act
      const result = await repoWithoutCache.findByCode('WH-001', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.code.getValue()).toBe('WH-001');
    });
  });

  describe('null description handling', () => {
    it('Given: warehouse with null description When: findById Then: should map to undefined', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.warehouse.findFirst.mockResolvedValue({
        ...mockWarehouseData,
        description: null,
      });

      // Act
      const result = await repository.findById('warehouse-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.description).toBeUndefined();
    });

    it('Given: warehouse with empty description When: findById Then: should map to undefined', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.warehouse.findFirst.mockResolvedValue({
        ...mockWarehouseData,
        description: '',
      });

      // Act
      const result = await repository.findById('warehouse-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.description).toBeUndefined();
    });

    it('Given: warehouse with null description When: findAll Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockResolvedValue([
        { ...mockWarehouseData, description: null },
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBeUndefined();
    });

    it('Given: warehouse with null description When: findActive Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockResolvedValue([
        { ...mockWarehouseData, description: null },
      ]);

      // Act
      const result = await repository.findActive('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBeUndefined();
    });
  });

  describe('address mapping', () => {
    it('Given: warehouse with null address When: findAll Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockResolvedValue([
        { ...mockWarehouseData, address: null },
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].address).toBeUndefined();
    });

    it('Given: warehouse with address When: findAll Then: should map address', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockResolvedValue([mockWarehouseData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].address).toBeDefined();
    });

    it('Given: warehouse with null address When: findActive Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockResolvedValue([
        { ...mockWarehouseData, address: null },
      ]);

      // Act
      const result = await repository.findActive('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].address).toBeUndefined();
    });

    it('Given: warehouse with null address When: findByCode Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.warehouse.findFirst.mockResolvedValue({
        ...mockWarehouseData,
        address: null,
      });
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.findByCode('WH-001', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.address).toBeUndefined();
    });
  });

  describe('statusChangedBy and statusChangedAt mapping', () => {
    it('Given: warehouse with null statusChangedBy When: findById Then: should map to undefined', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.warehouse.findFirst.mockResolvedValue({
        ...mockWarehouseData,
        statusChangedBy: null,
        statusChangedAt: null,
      });

      // Act
      const result = await repository.findById('warehouse-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.statusChangedBy).toBeUndefined();
      expect(result?.statusChangedAt).toBeUndefined();
    });

    it('Given: warehouse with statusChangedBy populated When: findById Then: should map values', async () => {
      // Arrange
      const changeDate = new Date('2024-06-15');
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockCacheService.set.mockResolvedValue(ok(undefined));
      mockPrismaService.warehouse.findFirst.mockResolvedValue({
        ...mockWarehouseData,
        statusChangedBy: 'user-456',
        statusChangedAt: changeDate,
      });

      // Act
      const result = await repository.findById('warehouse-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.statusChangedBy).toBe('user-456');
      expect(result?.statusChangedAt).toEqual(changeDate);
    });
  });

  describe('non-Error throws', () => {
    it('Given: non-Error thrown When: findById Then: should propagate non-Error', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(err(new Error('Cache miss')));
      mockPrismaService.warehouse.findFirst.mockRejectedValue('findById-error');

      // Act & Assert
      await expect(repository.findById('warehouse-123', 'org-123')).rejects.toBe('findById-error');
    });

    it('Given: non-Error thrown When: findAll Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockRejectedValue('findAll-error');

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe('findAll-error');
    });

    it('Given: non-Error thrown When: exists Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.warehouse.count.mockRejectedValue('exists-error');

      // Act & Assert
      await expect(repository.exists('warehouse-123', 'org-123')).rejects.toBe('exists-error');
    });

    it('Given: non-Error thrown When: delete Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.warehouse.updateMany.mockRejectedValue('delete-error');

      // Act & Assert
      await expect(repository.delete('warehouse-123', 'org-123')).rejects.toBe('delete-error');
    });

    it('Given: non-Error thrown When: findByCode Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.warehouse.findFirst.mockRejectedValue('code-error');

      // Act & Assert
      await expect(repository.findByCode('WH-001', 'org-123')).rejects.toBe('code-error');
    });

    it('Given: non-Error thrown When: existsByCode Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.warehouse.count.mockRejectedValue('code-exists-error');

      // Act & Assert
      await expect(repository.existsByCode('WH-001', 'org-123')).rejects.toBe('code-exists-error');
    });

    it('Given: non-Error thrown When: findActive Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockRejectedValue('active-error');

      // Act & Assert
      await expect(repository.findActive('org-123')).rejects.toBe('active-error');
    });
  });

  describe('save with null address', () => {
    it('Given: existing warehouse with null address When: saving Then: should update with null address', async () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-001'),
          name: 'No Address Warehouse',
          isActive: true,
        },
        'warehouse-123',
        'org-123'
      );
      mockPrismaService.warehouse.findUnique.mockResolvedValue(mockWarehouseData);
      mockPrismaService.warehouse.update.mockResolvedValue({
        ...mockWarehouseData,
        address: null,
        name: 'No Address Warehouse',
      });
      mockCacheService.delete.mockResolvedValue(ok(undefined));
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(warehouse);

      // Assert
      expect(result).not.toBeNull();
      expect(result.address).toBeUndefined();
    });

    it('Given: new warehouse with null address When: saving Then: should create with null address', async () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-003'),
          name: 'No Address New Warehouse',
          isActive: true,
        },
        'new-wh-id',
        'org-123'
      );
      mockPrismaService.warehouse.findUnique.mockResolvedValue(null);
      mockPrismaService.warehouse.create.mockResolvedValue({
        ...mockWarehouseData,
        id: 'new-wh-id',
        address: null,
        name: 'No Address New Warehouse',
      });
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(warehouse);

      // Assert
      expect(result).not.toBeNull();
      expect(result.address).toBeUndefined();
    });

    it('Given: new warehouse with null description When: saving Then: should map description to undefined', async () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-004'),
          name: 'No Desc Warehouse',
          isActive: true,
        },
        'new-wh-id-2',
        'org-123'
      );
      mockPrismaService.warehouse.findUnique.mockResolvedValue(null);
      mockPrismaService.warehouse.create.mockResolvedValue({
        ...mockWarehouseData,
        id: 'new-wh-id-2',
        description: null,
        name: 'No Desc Warehouse',
      });
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(warehouse);

      // Assert
      expect(result).not.toBeNull();
      expect(result.description).toBeUndefined();
    });

    it('Given: updated warehouse with null description When: saving Then: should map description to undefined', async () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-001'),
          name: 'Updated No Desc',
          isActive: true,
        },
        'warehouse-123',
        'org-123'
      );
      mockPrismaService.warehouse.findUnique.mockResolvedValue(mockWarehouseData);
      mockPrismaService.warehouse.update.mockResolvedValue({
        ...mockWarehouseData,
        description: null,
        name: 'Updated No Desc',
      });
      mockCacheService.delete.mockResolvedValue(ok(undefined));
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(warehouse);

      // Assert
      expect(result).not.toBeNull();
      expect(result.description).toBeUndefined();
    });

    it('Given: updated warehouse with null statusChangedBy When: saving Then: should map to undefined', async () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-001'),
          name: 'Test',
          isActive: true,
        },
        'warehouse-123',
        'org-123'
      );
      mockPrismaService.warehouse.findUnique.mockResolvedValue(mockWarehouseData);
      mockPrismaService.warehouse.update.mockResolvedValue({
        ...mockWarehouseData,
        statusChangedBy: null,
        statusChangedAt: null,
      });
      mockCacheService.delete.mockResolvedValue(ok(undefined));
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(warehouse);

      // Assert
      expect(result.statusChangedBy).toBeUndefined();
      expect(result.statusChangedAt).toBeUndefined();
    });

    it('Given: new warehouse with null statusChangedBy When: saving Then: should map to undefined', async () => {
      // Arrange
      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create('WH-005'),
          name: 'New Wh',
          isActive: true,
        },
        'new-wh-5',
        'org-123'
      );
      mockPrismaService.warehouse.findUnique.mockResolvedValue(null);
      mockPrismaService.warehouse.create.mockResolvedValue({
        ...mockWarehouseData,
        id: 'new-wh-5',
        statusChangedBy: null,
        statusChangedAt: null,
      });
      mockCacheService.set.mockResolvedValue(ok(undefined));

      // Act
      const result = await repository.save(warehouse);

      // Assert
      expect(result.statusChangedBy).toBeUndefined();
      expect(result.statusChangedAt).toBeUndefined();
    });
  });

  describe('findByCode cache path', () => {
    it('Given: findByCode cache miss and no warehouse data When: finding Then: should return null without caching', async () => {
      // Arrange
      mockPrismaService.warehouse.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByCode('NONEXISTENT', 'org-123');

      // Assert
      expect(result).toBeNull();
      expect(mockCacheService.get).not.toHaveBeenCalled();
    });
  });

  describe('findAll with statusChangedBy', () => {
    it('Given: warehouse with statusChangedBy When: findAll Then: should map statusChangedBy', async () => {
      // Arrange
      const changeDate = new Date('2024-06-15');
      mockPrismaService.warehouse.findMany.mockResolvedValue([
        {
          ...mockWarehouseData,
          statusChangedBy: 'user-456',
          statusChangedAt: changeDate,
        },
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].statusChangedBy).toBe('user-456');
      expect(result[0].statusChangedAt).toEqual(changeDate);
    });

    it('Given: warehouse with null statusChangedBy When: findAll Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.warehouse.findMany.mockResolvedValue([
        {
          ...mockWarehouseData,
          statusChangedBy: null,
          statusChangedAt: null,
        },
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].statusChangedBy).toBeUndefined();
      expect(result[0].statusChangedAt).toBeUndefined();
    });
  });
});
