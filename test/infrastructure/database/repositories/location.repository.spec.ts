import { PrismaLocationRepository } from '@infrastructure/database/repositories/location.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Location, LocationCode, LocationType } from '@location/domain';

describe('PrismaLocationRepository', () => {
  let repository: PrismaLocationRepository;

  let mockPrismaService: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    location: Record<string, jest.Mock<any>>;
  };

  const mockLocationData = {
    id: 'loc-123',
    code: 'A-01-01',
    name: 'Shelf A1',
    description: 'First shelf in aisle A',
    type: 'SHELF',
    warehouseId: 'wh-123',
    parentId: null,
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChildLocationData = {
    id: 'loc-456',
    code: 'A-01-01-B1',
    name: 'Bin B1',
    description: 'First bin on shelf A1',
    type: 'BIN',
    warehouseId: 'wh-123',
    parentId: 'loc-123',
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      location: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaLocationRepository(mockPrismaService as any);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return location', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockResolvedValue(mockLocationData);

      // Act
      const result = await repository.findById('loc-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('loc-123');
      expect(result?.code.getValue()).toBe('A-01-01');
      expect(result?.name).toBe('Shelf A1');
      expect(mockPrismaService.location.findFirst).toHaveBeenCalledWith({
        where: { id: 'loc-123', orgId: 'org-123' },
      });
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: prisma throws error When: finding by id Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findById('loc-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: non-Error thrown When: finding by id Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findById('loc-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findByCode', () => {
    it('Given: valid code and warehouseId When: finding by code Then: should return location', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockResolvedValue(mockLocationData);

      // Act
      const result = await repository.findByCode('A-01-01', 'wh-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.code.getValue()).toBe('A-01-01');
      expect(mockPrismaService.location.findFirst).toHaveBeenCalledWith({
        where: { code: 'A-01-01', warehouseId: 'wh-123', orgId: 'org-123' },
      });
    });

    it('Given: non-existent code When: finding by code Then: should return null', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByCode('UNKNOWN', 'wh-123', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return locations', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([mockLocationData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('loc-123');
    });

    it('Given: warehouseId filter When: finding all Then: should filter by warehouse', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([mockLocationData]);

      // Act
      await repository.findAll('org-123', { warehouseId: 'wh-123' });

      // Assert
      expect(mockPrismaService.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ warehouseId: 'wh-123' }),
        })
      );
    });

    it('Given: type filter When: finding all Then: should filter by type', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll('org-123', { type: 'SHELF' });

      // Assert
      expect(mockPrismaService.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'SHELF' }),
        })
      );
    });

    it('Given: no locations When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findByWarehouse', () => {
    it('Given: valid warehouseId When: finding by warehouse Then: should return locations', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([
        mockLocationData,
        mockChildLocationData,
      ]);

      // Act
      const result = await repository.findByWarehouse('wh-123', 'org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.location.findMany).toHaveBeenCalledWith({
        where: { warehouseId: 'wh-123', orgId: 'org-123' },
        orderBy: { code: 'asc' },
      });
    });
  });

  describe('findChildren', () => {
    it('Given: valid parentId When: finding children Then: should return child locations', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([mockChildLocationData]);

      // Act
      const result = await repository.findChildren('loc-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bin B1');
      expect(mockPrismaService.location.findMany).toHaveBeenCalledWith({
        where: { parentId: 'loc-123', orgId: 'org-123' },
        orderBy: { code: 'asc' },
      });
    });
  });

  describe('save', () => {
    it('Given: existing location When: saving Then: should update location', async () => {
      // Arrange
      mockPrismaService.location.findUnique.mockResolvedValue(mockLocationData);
      mockPrismaService.location.update.mockResolvedValue({
        ...mockLocationData,
        name: 'Updated Shelf',
      });

      const location = Location.reconstitute(
        {
          code: LocationCode.create('A-01-01'),
          name: 'Updated Shelf',
          type: LocationType.create('SHELF'),
          warehouseId: 'wh-123',
          isActive: true,
        },
        'loc-123',
        'org-123'
      );

      // Act
      const result = await repository.save(location);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.location.update).toHaveBeenCalled();
    });

    it('Given: new location When: saving Then: should create location', async () => {
      // Arrange
      mockPrismaService.location.findUnique.mockResolvedValue(null);
      mockPrismaService.location.create.mockResolvedValue(mockLocationData);

      const location = Location.reconstitute(
        {
          code: LocationCode.create('A-01-01'),
          name: 'Shelf A1',
          type: LocationType.create('SHELF'),
          warehouseId: 'wh-123',
          isActive: true,
        },
        'loc-123',
        'org-123'
      );

      // Act
      const result = await repository.save(location);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.location.create).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('Given: valid id and orgId When: deleting Then: should soft delete by deactivating', async () => {
      // Arrange
      mockPrismaService.location.updateMany.mockResolvedValue({ count: 1 });

      // Act
      await repository.delete('loc-123', 'org-123');

      // Assert
      expect(mockPrismaService.location.updateMany).toHaveBeenCalledWith({
        where: { id: 'loc-123', orgId: 'org-123' },
        data: { isActive: false },
      });
    });

    it('Given: database error When: deleting Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.location.updateMany.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('loc-123', 'org-123')).rejects.toThrow('Delete failed');
    });

    it('Given: non-Error thrown When: deleting Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.location.updateMany.mockRejectedValue('delete-error');

      // Act & Assert
      await expect(repository.delete('loc-123', 'org-123')).rejects.toBe('delete-error');
    });
  });

  describe('null description handling', () => {
    it('Given: location with null description When: findById Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockResolvedValue({
        ...mockLocationData,
        description: null,
      });

      // Act
      const result = await repository.findById('loc-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.description).toBeUndefined();
    });

    it('Given: location with description When: findById Then: should map description', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockResolvedValue(mockLocationData);

      // Act
      const result = await repository.findById('loc-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.description).toBe('First shelf in aisle A');
    });
  });

  describe('parentId mapping', () => {
    it('Given: location with null parentId When: findById Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockResolvedValue(mockLocationData);

      // Act
      const result = await repository.findById('loc-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.parentId).toBeUndefined();
    });

    it('Given: location with parentId When: findById Then: should map parentId', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockResolvedValue(mockChildLocationData);

      // Act
      const result = await repository.findById('loc-456', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.parentId).toBe('loc-123');
    });
  });

  describe('findByCode error paths', () => {
    it('Given: database error When: findByCode Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockRejectedValue(new Error('Code lookup failed'));

      // Act & Assert
      await expect(repository.findByCode('A-01-01', 'wh-123', 'org-123')).rejects.toThrow(
        'Code lookup failed'
      );
    });

    it('Given: non-Error thrown When: findByCode Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockRejectedValue('code-error');

      // Act & Assert
      await expect(repository.findByCode('A-01-01', 'wh-123', 'org-123')).rejects.toBe(
        'code-error'
      );
    });
  });

  describe('findAll with filters', () => {
    it('Given: parentId filter When: finding all Then: should filter by parentId', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([mockChildLocationData]);

      // Act
      await repository.findAll('org-123', { parentId: 'loc-123' });

      // Assert
      expect(mockPrismaService.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ parentId: 'loc-123' }),
        })
      );
    });

    it('Given: isActive filter When: finding all Then: should filter by isActive', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll('org-123', { isActive: true });

      // Assert
      expect(mockPrismaService.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('Given: isActive false filter When: finding all Then: should filter by isActive false', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll('org-123', { isActive: false });

      // Assert
      expect(mockPrismaService.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: false }),
        })
      );
    });

    it('Given: all filters combined When: finding all Then: should apply all filters', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll('org-123', {
        warehouseId: 'wh-123',
        type: 'SHELF',
        parentId: 'loc-123',
        isActive: true,
      });

      // Assert
      expect(mockPrismaService.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: 'org-123',
            warehouseId: 'wh-123',
            type: 'SHELF',
            parentId: 'loc-123',
            isActive: true,
          }),
        })
      );
    });

    it('Given: database error When: findAll Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockRejectedValue(new Error('FindAll failed'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('FindAll failed');
    });

    it('Given: non-Error thrown When: findAll Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockRejectedValue('findall-error');

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe('findall-error');
    });
  });

  describe('findByWarehouse error paths', () => {
    it('Given: database error When: findByWarehouse Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockRejectedValue(new Error('Warehouse lookup failed'));

      // Act & Assert
      await expect(repository.findByWarehouse('wh-123', 'org-123')).rejects.toThrow(
        'Warehouse lookup failed'
      );
    });

    it('Given: non-Error thrown When: findByWarehouse Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockRejectedValue('warehouse-error');

      // Act & Assert
      await expect(repository.findByWarehouse('wh-123', 'org-123')).rejects.toBe('warehouse-error');
    });

    it('Given: no locations in warehouse When: findByWarehouse Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByWarehouse('wh-123', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findChildren error paths', () => {
    it('Given: database error When: findChildren Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockRejectedValue(new Error('Children lookup failed'));

      // Act & Assert
      await expect(repository.findChildren('loc-123', 'org-123')).rejects.toThrow(
        'Children lookup failed'
      );
    });

    it('Given: non-Error thrown When: findChildren Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockRejectedValue('children-error');

      // Act & Assert
      await expect(repository.findChildren('loc-123', 'org-123')).rejects.toBe('children-error');
    });

    it('Given: no children When: findChildren Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findChildren('loc-123', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('save error paths', () => {
    it('Given: database error When: save Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.location.findUnique.mockRejectedValue(new Error('Save failed'));

      const location = Location.reconstitute(
        {
          code: LocationCode.create('A-01-01'),
          name: 'Shelf A1',
          type: LocationType.create('SHELF'),
          warehouseId: 'wh-123',
          isActive: true,
        },
        'loc-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.save(location)).rejects.toThrow('Save failed');
    });

    it('Given: non-Error thrown When: save Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.location.findUnique.mockRejectedValue('save-error');

      const location = Location.reconstitute(
        {
          code: LocationCode.create('A-01-01'),
          name: 'Shelf A1',
          type: LocationType.create('SHELF'),
          warehouseId: 'wh-123',
          isActive: true,
        },
        'loc-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.save(location)).rejects.toBe('save-error');
    });
  });

  describe('save with description and parentId', () => {
    it('Given: location with description When: save update Then: should map description', async () => {
      // Arrange
      mockPrismaService.location.findUnique.mockResolvedValue(mockLocationData);
      mockPrismaService.location.update.mockResolvedValue(mockLocationData);

      const location = Location.reconstitute(
        {
          code: LocationCode.create('A-01-01'),
          name: 'Shelf A1',
          description: 'First shelf in aisle A',
          type: LocationType.create('SHELF'),
          warehouseId: 'wh-123',
          isActive: true,
        },
        'loc-123',
        'org-123'
      );

      // Act
      const result = await repository.save(location);

      // Assert
      expect(result.description).toBe('First shelf in aisle A');
    });

    it('Given: location with null description When: save update Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.location.findUnique.mockResolvedValue(mockLocationData);
      mockPrismaService.location.update.mockResolvedValue({
        ...mockLocationData,
        description: null,
      });

      const location = Location.reconstitute(
        {
          code: LocationCode.create('A-01-01'),
          name: 'Shelf A1',
          type: LocationType.create('SHELF'),
          warehouseId: 'wh-123',
          isActive: true,
        },
        'loc-123',
        'org-123'
      );

      // Act
      const result = await repository.save(location);

      // Assert
      expect(result.description).toBeUndefined();
    });

    it('Given: location with parentId When: save create Then: should map parentId', async () => {
      // Arrange
      mockPrismaService.location.findUnique.mockResolvedValue(null);
      mockPrismaService.location.create.mockResolvedValue(mockChildLocationData);

      const location = Location.reconstitute(
        {
          code: LocationCode.create('A-01-01-B1'),
          name: 'Bin B1',
          type: LocationType.create('BIN'),
          warehouseId: 'wh-123',
          parentId: 'loc-123',
          isActive: true,
        },
        'loc-456',
        'org-123'
      );

      // Act
      const result = await repository.save(location);

      // Assert
      expect(result.parentId).toBe('loc-123');
    });

    it('Given: location with null parentId When: save create Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.location.findUnique.mockResolvedValue(null);
      mockPrismaService.location.create.mockResolvedValue(mockLocationData);

      const location = Location.reconstitute(
        {
          code: LocationCode.create('A-01-01'),
          name: 'Shelf A1',
          type: LocationType.create('SHELF'),
          warehouseId: 'wh-123',
          isActive: true,
        },
        'loc-123',
        'org-123'
      );

      // Act
      const result = await repository.save(location);

      // Assert
      expect(result.parentId).toBeUndefined();
    });
  });

  describe('findByCode with null description', () => {
    it('Given: found location has null description When: findByCode Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockResolvedValue({
        ...mockLocationData,
        description: null,
      });

      // Act
      const result = await repository.findByCode('A-01-01', 'wh-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.description).toBeUndefined();
    });

    it('Given: found location has parentId When: findByCode Then: should map parentId', async () => {
      // Arrange
      mockPrismaService.location.findFirst.mockResolvedValue(mockChildLocationData);

      // Act
      const result = await repository.findByCode('A-01-01-B1', 'wh-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.parentId).toBe('loc-123');
    });
  });

  describe('findByWarehouse with null descriptions', () => {
    it('Given: locations with null descriptions When: findByWarehouse Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([
        { ...mockLocationData, description: null },
        { ...mockChildLocationData, description: null },
      ]);

      // Act
      const result = await repository.findByWarehouse('wh-123', 'org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].description).toBeUndefined();
      expect(result[1].description).toBeUndefined();
    });
  });

  describe('findChildren with null descriptions', () => {
    it('Given: children with null descriptions When: findChildren Then: should map to undefined', async () => {
      // Arrange
      mockPrismaService.location.findMany.mockResolvedValue([
        { ...mockChildLocationData, description: null },
      ]);

      // Act
      const result = await repository.findChildren('loc-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBeUndefined();
    });
  });
});
