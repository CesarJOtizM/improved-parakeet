// Base Repository Service Tests
// Unit tests for BaseRepositoryService following AAA and Given-When-Then patterns

import { PrismaService } from '@infrastructure/database/prisma.service';
import { BaseRepositoryService } from '@infrastructure/database/services/base.repository.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IBaseEntity } from '@shared/types/database.types';

// Mock entity for testing
interface ITestEntity extends IBaseEntity {
  name: string;
  description?: string;
  status?: string;
  category?: string;
}

// Concrete implementation for testing
class TestRepositoryService extends BaseRepositoryService<ITestEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, 'testModel');
  }
}

describe('BaseRepositoryService', () => {
  let service: TestRepositoryService;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockModel: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  let mockLogger: { log: jest.Mock; error: jest.Mock };

  const mockOrgId = 'org-123';
  const mockEntity: ITestEntity = {
    id: 'entity-123',
    name: 'Test Entity',
    description: 'Test Description',
    orgId: mockOrgId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockModel = {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    mockPrisma = {
      testModel: mockModel,
    } as unknown as jest.Mocked<PrismaService>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    service = new TestRepositoryService(mockPrisma);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).logger = mockLogger;
  });

  describe('create', () => {
    it('Given: valid entity data When: creating entity Then: should create and return entity with orgId', async () => {
      // Arrange
      const data = { name: 'New Entity', description: 'New Description' };
      mockModel.create.mockResolvedValue({ ...mockEntity, ...data });

      // Act
      const result = await service.create(data, mockOrgId);

      // Assert
      expect(mockModel.create).toHaveBeenCalledWith({
        data: { ...data, orgId: mockOrgId },
      });
      expect(result).toEqual({ ...mockEntity, ...data });
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Created testModel:'));
    });

    it('Given: database error When: creating entity Then: should log error and throw', async () => {
      // Arrange
      const data = { name: 'New Entity' };
      const error = new Error('Database error');
      mockModel.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.create(data, mockOrgId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating testModel:'),
        error
      );
    });
  });

  describe('findById', () => {
    it('Given: existing entity ID When: finding by ID Then: should return entity', async () => {
      // Arrange
      mockModel.findFirst.mockResolvedValue(mockEntity);

      // Act
      const result = await service.findById('entity-123', mockOrgId);

      // Assert
      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'entity-123', orgId: mockOrgId },
      });
      expect(result).toEqual(mockEntity);
    });

    it('Given: non-existent entity ID When: finding by ID Then: should return null', async () => {
      // Arrange
      mockModel.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.findById('non-existent', mockOrgId);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by ID Then: should log error and throw', async () => {
      // Arrange
      const error = new Error('Database error');
      mockModel.findFirst.mockRejectedValue(error);

      // Act & Assert
      await expect(service.findById('entity-123', mockOrgId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error finding testModel by ID:'),
        error
      );
    });
  });

  describe('findAll', () => {
    it('Given: no options When: finding all entities Then: should return all entities with total', async () => {
      // Arrange
      const entities = [mockEntity];
      mockModel.findMany.mockResolvedValue(entities);
      mockModel.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll(mockOrgId);

      // Assert
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { orgId: mockOrgId },
        skip: undefined,
        take: undefined,
        orderBy: undefined,
        include: undefined,
      });
      expect(mockModel.count).toHaveBeenCalledWith({
        where: { orgId: mockOrgId },
      });
      expect(result).toEqual({ data: entities, total: 1 });
    });

    it('Given: pagination options When: finding all entities Then: should apply pagination', async () => {
      // Arrange
      const entities = [mockEntity];
      mockModel.findMany.mockResolvedValue(entities);
      mockModel.count.mockResolvedValue(10);
      const options = { skip: 0, take: 10 };

      // Act
      const result = await service.findAll(mockOrgId, options);

      // Assert
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { orgId: mockOrgId },
        skip: 0,
        take: 10,
        orderBy: undefined,
        include: undefined,
      });
      expect(result.total).toBe(10);
    });

    it('Given: where clause When: finding all entities Then: should apply where clause', async () => {
      // Arrange
      const entities = [mockEntity];
      mockModel.findMany.mockResolvedValue(entities);
      mockModel.count.mockResolvedValue(1);
      const options = { where: { status: 'ACTIVE' } };

      // Act
      const result = await service.findAll(mockOrgId, options);

      // Assert
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', orgId: mockOrgId },
        skip: undefined,
        take: undefined,
        orderBy: undefined,
        include: undefined,
      });
      expect(result.data).toEqual(entities);
    });

    it('Given: database error When: finding all entities Then: should log error and throw', async () => {
      // Arrange
      const error = new Error('Database error');
      mockModel.findMany.mockRejectedValue(error);

      // Act & Assert
      await expect(service.findAll(mockOrgId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error finding all testModel:'),
        error
      );
    });
  });

  describe('update', () => {
    it('Given: valid update data When: updating entity Then: should update and return entity', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' };
      const updatedEntity = { ...mockEntity, ...updateData };
      mockModel.update.mockResolvedValue(updatedEntity);

      // Act
      const result = await service.update('entity-123', updateData, mockOrgId);

      // Assert
      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'entity-123', orgId: mockOrgId },
        data: updateData,
      });
      expect(result).toEqual(updatedEntity);
      expect(mockLogger.log).toHaveBeenCalledWith('Updated testModel: entity-123');
    });

    it('Given: database error When: updating entity Then: should log error and throw', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' };
      const error = new Error('Database error');
      mockModel.update.mockRejectedValue(error);

      // Act & Assert
      await expect(service.update('entity-123', updateData, mockOrgId)).rejects.toThrow(
        'Database error'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error updating testModel:'),
        error
      );
    });
  });

  describe('delete', () => {
    it('Given: valid entity ID When: deleting entity Then: should soft delete entity', async () => {
      // Arrange
      const deletedEntity = { ...mockEntity, deletedAt: new Date() };
      mockModel.update.mockResolvedValue(deletedEntity);

      // Act
      const result = await service.delete('entity-123', mockOrgId);

      // Assert
      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'entity-123', orgId: mockOrgId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.deletedAt).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith('Soft deleted testModel: entity-123');
    });

    it('Given: database error When: deleting entity Then: should log error and throw', async () => {
      // Arrange
      const error = new Error('Database error');
      mockModel.update.mockRejectedValue(error);

      // Act & Assert
      await expect(service.delete('entity-123', mockOrgId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error deleting testModel:'),
        error
      );
    });
  });

  describe('hardDelete', () => {
    it('Given: valid entity ID When: hard deleting entity Then: should permanently delete entity', async () => {
      // Arrange
      mockModel.delete.mockResolvedValue(mockEntity);

      // Act
      const result = await service.hardDelete('entity-123', mockOrgId);

      // Assert
      expect(mockModel.delete).toHaveBeenCalledWith({
        where: { id: 'entity-123', orgId: mockOrgId },
      });
      expect(result).toEqual(mockEntity);
      expect(mockLogger.log).toHaveBeenCalledWith('Hard deleted testModel: entity-123');
    });

    it('Given: database error When: hard deleting entity Then: should log error and throw', async () => {
      // Arrange
      const error = new Error('Database error');
      mockModel.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(service.hardDelete('entity-123', mockOrgId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error hard deleting testModel:'),
        error
      );
    });
  });

  describe('exists', () => {
    it('Given: existing entity ID When: checking existence Then: should return true', async () => {
      // Arrange
      mockModel.count.mockResolvedValue(1);

      // Act
      const result = await service.exists('entity-123', mockOrgId);

      // Assert
      expect(mockModel.count).toHaveBeenCalledWith({
        where: { id: 'entity-123', orgId: mockOrgId },
      });
      expect(result).toBe(true);
    });

    it('Given: non-existent entity ID When: checking existence Then: should return false', async () => {
      // Arrange
      mockModel.count.mockResolvedValue(0);

      // Act
      const result = await service.exists('non-existent', mockOrgId);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking existence Then: should log error and throw', async () => {
      // Arrange
      const error = new Error('Database error');
      mockModel.count.mockRejectedValue(error);

      // Act & Assert
      await expect(service.exists('entity-123', mockOrgId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error checking existence of testModel:'),
        error
      );
    });
  });

  describe('count', () => {
    it('Given: no where clause When: counting entities Then: should return count for orgId', async () => {
      // Arrange
      mockModel.count.mockResolvedValue(5);

      // Act
      const result = await service.count(mockOrgId);

      // Assert
      expect(mockModel.count).toHaveBeenCalledWith({
        where: { orgId: mockOrgId },
      });
      expect(result).toBe(5);
    });

    it('Given: where clause When: counting entities Then: should return count with filters', async () => {
      // Arrange
      mockModel.count.mockResolvedValue(3);
      const where = { status: 'ACTIVE' };

      // Act
      const result = await service.count(mockOrgId, where);

      // Assert
      expect(mockModel.count).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', orgId: mockOrgId },
      });
      expect(result).toBe(3);
    });

    it('Given: database error When: counting entities Then: should log error and throw', async () => {
      // Arrange
      const error = new Error('Database error');
      mockModel.count.mockRejectedValue(error);

      // Act & Assert
      await expect(service.count(mockOrgId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error counting testModel:'),
        error
      );
    });
  });

  describe('findWithFilters', () => {
    it('Given: search filter When: finding with filters Then: should apply search to name and description', async () => {
      // Arrange
      const entities = [mockEntity];
      mockModel.findMany.mockResolvedValue(entities);
      mockModel.count.mockResolvedValue(1);
      const filters = { search: 'test', orgId: mockOrgId };

      // Act
      const result = await service.findWithFilters(mockOrgId, filters);

      // Assert
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {
          orgId: mockOrgId,
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        skip: undefined,
        take: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual(entities);
    });

    it('Given: category filter When: finding with filters Then: should apply category filter', async () => {
      // Arrange
      const entities = [mockEntity];
      mockModel.findMany.mockResolvedValue(entities);
      mockModel.count.mockResolvedValue(1);
      const filters = { category: 'electronics', orgId: mockOrgId };

      // Act
      const result = await service.findWithFilters(mockOrgId, filters);

      // Assert
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {
          orgId: mockOrgId,
          category: 'electronics',
        },
        skip: undefined,
        take: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual(entities);
    });

    it('Given: status filter When: finding with filters Then: should apply status filter', async () => {
      // Arrange
      const entities = [mockEntity];
      mockModel.findMany.mockResolvedValue(entities);
      mockModel.count.mockResolvedValue(1);
      const filters = { status: 'ACTIVE', orgId: mockOrgId };

      // Act
      const result = await service.findWithFilters(mockOrgId, filters);

      // Assert
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {
          orgId: mockOrgId,
          status: 'ACTIVE',
        },
        skip: undefined,
        take: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual(entities);
    });

    it('Given: date range filter When: finding with filters Then: should apply date range filter', async () => {
      // Arrange
      const entities = [mockEntity];
      mockModel.findMany.mockResolvedValue(entities);
      mockModel.count.mockResolvedValue(1);
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');
      const filters = { dateFrom, dateTo, orgId: mockOrgId };

      // Act
      const result = await service.findWithFilters(mockOrgId, filters);

      // Assert
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {
          orgId: mockOrgId,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        skip: undefined,
        take: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual(entities);
    });

    it('Given: pagination options When: finding with filters Then: should apply pagination', async () => {
      // Arrange
      const entities = [mockEntity];
      mockModel.findMany.mockResolvedValue(entities);
      mockModel.count.mockResolvedValue(10);
      const filters = { skip: 0, take: 10, orgId: mockOrgId };

      // Act
      const result = await service.findWithFilters(mockOrgId, filters);

      // Assert
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { orgId: mockOrgId },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.total).toBe(10);
    });

    it('Given: custom orderBy When: finding with filters Then: should apply custom orderBy', async () => {
      // Arrange
      const entities = [mockEntity];
      mockModel.findMany.mockResolvedValue(entities);
      mockModel.count.mockResolvedValue(1);
      const filters = { orderBy: { name: 'asc' }, orgId: mockOrgId };

      // Act
      const result = await service.findWithFilters(mockOrgId, filters);

      // Assert
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { orgId: mockOrgId },
        skip: undefined,
        take: undefined,
        orderBy: { name: 'asc' },
      });
      expect(result.data).toEqual(entities);
    });

    it('Given: multiple filters When: finding with filters Then: should apply all filters', async () => {
      // Arrange
      const entities = [mockEntity];
      mockModel.findMany.mockResolvedValue(entities);
      mockModel.count.mockResolvedValue(1);
      const dateFrom = new Date('2024-01-01');
      const filters = {
        search: 'test',
        category: 'electronics',
        status: 'ACTIVE',
        dateFrom,
        skip: 0,
        take: 10,
        orgId: mockOrgId,
      };

      // Act
      const result = await service.findWithFilters(mockOrgId, filters);

      // Assert
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {
          orgId: mockOrgId,
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
          category: 'electronics',
          status: 'ACTIVE',
          createdAt: { gte: dateFrom },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual(entities);
    });

    it('Given: database error When: finding with filters Then: should log error and throw', async () => {
      // Arrange
      const error = new Error('Database error');
      mockModel.findMany.mockRejectedValue(error);
      const filters = { orgId: mockOrgId };

      // Act & Assert
      await expect(service.findWithFilters(mockOrgId, filters)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error finding testModel with filters:'),
        error
      );
    });
  });
});
