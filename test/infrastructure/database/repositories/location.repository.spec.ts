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
  });
});
