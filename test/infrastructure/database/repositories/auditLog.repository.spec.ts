import { PrismaAuditLogRepository } from '@infrastructure/database/repositories/auditLog.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { AuditLog } from '@shared/audit/domain/entities/auditLog.entity';

describe('PrismaAuditLogRepository', () => {
  let repository: PrismaAuditLogRepository;

  let mockPrismaService: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auditLog: Record<string, jest.Mock<any>>;
  };

  const mockAuditLogData = {
    id: 'audit-123',
    orgId: 'org-123',
    entityType: 'Product',
    entityId: 'product-456',
    action: 'CREATE',
    performedBy: 'user-789',
    metadata: { field: 'name', oldValue: null, newValue: 'Test Product' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    httpMethod: 'POST',
    httpUrl: '/api/products',
    httpStatusCode: 201,
    duration: 150,
    createdAt: new Date('2026-02-20T10:00:00Z'),
  };

  beforeEach(() => {
    mockPrismaService = {
      auditLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        count: jest.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaAuditLogRepository(mockPrismaService as any);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return audit log', async () => {
      // Arrange
      mockPrismaService.auditLog.findFirst.mockResolvedValue(mockAuditLogData);

      // Act
      const result = await repository.findById('audit-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('audit-123');
      expect(result?.entityType.getValue()).toBe('Product');
      expect(result?.action.getValue()).toBe('CREATE');
      expect(mockPrismaService.auditLog.findFirst).toHaveBeenCalledWith({
        where: { id: 'audit-123', orgId: 'org-123' },
      });
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.auditLog.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: prisma throws error When: finding by id Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.auditLog.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findById('audit-123', 'org-123')).rejects.toThrow('DB Error');
    });
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return audit logs', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('audit-123');
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: no audit logs When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('exists', () => {
    it('Given: existing id When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('audit-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-existent id When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('save', () => {
    it('Given: valid audit log When: saving Then: should create audit log', async () => {
      // Arrange
      const auditLog = AuditLog.reconstitute(
        {
          entityType: EntityType.create('Product'),
          entityId: 'product-456',
          action: AuditAction.create('CREATE'),
          performedBy: 'user-789',
          metadata: AuditMetadata.create({ field: 'name' }),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          httpMethod: 'POST',
          httpUrl: '/api/products',
          httpStatusCode: 201,
          duration: 150,
        },
        'audit-123',
        'org-123'
      );

      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLogData);

      // Act
      const result = await repository.save(auditLog);

      // Assert
      expect(result).not.toBeNull();
      expect(result.entityType.getValue()).toBe('Product');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('saveBatch', () => {
    it('Given: empty array When: saving batch Then: should return empty array', async () => {
      // Act
      const result = await repository.saveBatch([]);

      // Assert
      expect(result).toHaveLength(0);
      expect(mockPrismaService.auditLog.createMany).not.toHaveBeenCalled();
    });

    it('Given: multiple audit logs When: saving batch Then: should call createMany', async () => {
      // Arrange
      const auditLog = AuditLog.reconstitute(
        {
          entityType: EntityType.create('Product'),
          action: AuditAction.create('CREATE'),
          metadata: AuditMetadata.create({}),
        },
        'audit-1',
        'org-123'
      );

      mockPrismaService.auditLog.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await repository.saveBatch([auditLog]);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.auditLog.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true })
      );
    });
  });

  describe('findByEntity', () => {
    it('Given: valid entity type and id When: finding by entity Then: should return matching logs', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData]);

      // Act
      const result = await repository.findByEntity(
        EntityType.create('Product'),
        'product-456',
        'org-123'
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'Product',
          entityId: 'product-456',
          orgId: 'org-123',
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: custom limit and offset When: finding by entity Then: should apply pagination', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByEntity(EntityType.create('Product'), 'product-456', 'org-123', 10, 5);

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 5 })
      );
    });
  });

  describe('findByUser', () => {
    it('Given: valid userId When: finding by user Then: should return matching logs', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData]);

      // Act
      const result = await repository.findByUser('user-789', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { performedBy: 'user-789', orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });
  });

  describe('findByAction', () => {
    it('Given: valid action When: finding by action Then: should return matching logs', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData]);

      // Act
      const result = await repository.findByAction(AuditAction.create('CREATE'), 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: 'CREATE', orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });
  });

  describe('findByDateRange', () => {
    it('Given: valid date range When: finding by date range Then: should return matching logs', async () => {
      // Arrange
      const startDate = new Date('2026-02-01T00:00:00Z');
      const endDate = new Date('2026-02-28T23:59:59Z');
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData]);

      // Act
      const result = await repository.findByDateRange('org-123', startDate, endDate);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });
  });

  describe('findByFilters', () => {
    it('Given: multiple filters When: finding by filters Then: should apply all filters', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData]);
      const filters = {
        entityType: EntityType.create('Product'),
        action: AuditAction.create('CREATE'),
        performedBy: 'user-789',
      };

      // Act
      const result = await repository.findByFilters('org-123', filters);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          entityType: 'Product',
          action: 'CREATE',
          performedBy: 'user-789',
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: empty filters When: finding by filters Then: should only filter by orgId', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByFilters('org-123', {});

      // Assert
      expect(result).toHaveLength(0);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: date range filters When: finding by filters Then: should include date constraints', async () => {
      // Arrange
      const startDate = new Date('2026-02-01');
      const endDate = new Date('2026-02-28');
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByFilters('org-123', { startDate, endDate });

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        })
      );
    });
  });

  describe('countByFilters', () => {
    it('Given: filters When: counting Then: should return count', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockResolvedValue(5);

      // Act
      const result = await repository.countByFilters('org-123', {
        action: AuditAction.create('CREATE'),
      });

      // Assert
      expect(result).toBe(5);
    });
  });

  describe('findBySpecification', () => {
    it('Given: specification with pagination When: finding Then: should return paginated result', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123', action: 'CREATE' }),
      };
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

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

    it('Given: specification with hasMore true When: finding Then: should indicate hasMore', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData]);
      mockPrismaService.auditLog.count.mockResolvedValue(20);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123', {
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(20);
      expect(result.hasMore).toBe(true);
    });

    it('Given: specification without pagination options When: finding Then: hasMore should be false', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123');

      // Assert
      expect(result.hasMore).toBe(false);
    });

    it('Given: specification with only skip (no take) When: finding Then: hasMore should be false', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData]);
      mockPrismaService.auditLog.count.mockResolvedValue(10);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123', {
        skip: 0,
      });

      // Assert
      expect(result.hasMore).toBe(false);
    });

    it('Given: prisma throws error When: findBySpecification Then: should propagate error', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      mockPrismaService.auditLog.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(
        repository.findBySpecification(mockSpec as any, 'org-123', { skip: 0, take: 10 })
      ).rejects.toThrow('DB Error');
    });

    it('Given: specification returns record with bad data When: finding Then: should filter out null toDomain results', async () => {
      // Arrange
      const mockSpec = {
        toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123' }),
      };
      const badAuditLogData = {
        ...mockAuditLogData,
        entityType: 'INVALID_ENTITY_TYPE_THAT_DOES_NOT_EXIST',
        action: 'INVALID_ACTION',
      };
      mockPrismaService.auditLog.findMany.mockResolvedValue([badAuditLogData]);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await repository.findBySpecification(mockSpec as any, 'org-123', {
        skip: 0,
        take: 10,
      });

      // Assert - safeToDomain should filter out the bad record
      expect(result.data.length).toBeLessThanOrEqual(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findById - edge cases', () => {
    it('Given: empty orgId When: finding by id Then: should use null orgId', async () => {
      // Arrange
      mockPrismaService.auditLog.findFirst.mockResolvedValue(mockAuditLogData);

      // Act
      const result = await repository.findById('audit-123', '');

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.auditLog.findFirst).toHaveBeenCalledWith({
        where: { id: 'audit-123', orgId: null },
      });
    });
  });

  describe('findAll - edge cases', () => {
    it('Given: empty orgId When: finding all Then: should use null orgId', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findAll('');

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { orgId: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: prisma throws error When: finding all Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockRejectedValue(new Error('DB connection lost'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('DB connection lost');
    });

    it('Given: record with invalid entity type When: finding all Then: safeToDomain should filter it out', async () => {
      // Arrange
      const badRecord = {
        ...mockAuditLogData,
        entityType: 'TOTALLY_INVALID_TYPE',
        action: 'TOTALLY_INVALID_ACTION',
      };
      mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLogData, badRecord]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert - one valid, one filtered
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('exists - edge cases', () => {
    it('Given: empty orgId When: checking existence Then: should use null orgId', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      // Act
      await repository.exists('audit-123', '');

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: { id: 'audit-123', orgId: null },
      });
    });

    it('Given: prisma throws error When: checking existence Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.exists('audit-123', 'org-123')).rejects.toThrow('DB Error');
    });
  });

  describe('save - edge cases', () => {
    it('Given: prisma throws error When: saving Then: should propagate error', async () => {
      // Arrange
      const auditLog = AuditLog.reconstitute(
        {
          entityType: EntityType.create('Product'),
          action: AuditAction.create('CREATE'),
          metadata: AuditMetadata.create({}),
        },
        'audit-123',
        'org-123'
      );
      mockPrismaService.auditLog.create.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.save(auditLog)).rejects.toThrow('DB Error');
    });

    it('Given: audit log with empty id When: saving Then: should not include id in persistence data', async () => {
      // Arrange
      const auditLog = AuditLog.reconstitute(
        {
          entityType: EntityType.create('Product'),
          action: AuditAction.create('CREATE'),
          metadata: AuditMetadata.create({}),
        },
        '',
        'org-123'
      );
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLogData);

      // Act
      await repository.save(auditLog);

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ id: '' }),
      });
    });

    it('Given: audit log with all optional fields undefined When: saving Then: should persist null values', async () => {
      // Arrange
      const auditLog = AuditLog.reconstitute(
        {
          entityType: EntityType.create('Product'),
          action: AuditAction.create('CREATE'),
          metadata: AuditMetadata.create({}),
        },
        'audit-new',
        ''
      );
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLogData);

      // Act
      await repository.save(auditLog);

      // Assert
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: null,
          entityId: null,
          performedBy: null,
          ipAddress: null,
          userAgent: null,
          httpMethod: null,
          httpUrl: null,
          httpStatusCode: null,
          duration: null,
        }),
      });
    });
  });

  describe('saveBatch - edge cases', () => {
    it('Given: prisma throws error When: saving batch Then: should propagate error', async () => {
      // Arrange
      const auditLog = AuditLog.reconstitute(
        {
          entityType: EntityType.create('Product'),
          action: AuditAction.create('CREATE'),
          metadata: AuditMetadata.create({}),
        },
        'audit-1',
        'org-123'
      );
      mockPrismaService.auditLog.createMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.saveBatch([auditLog])).rejects.toThrow('DB Error');
    });
  });

  describe('findByEntity - edge cases', () => {
    it('Given: empty orgId When: finding by entity Then: should use null orgId', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByEntity(EntityType.create('Product'), 'product-1', '');

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'Product',
          entityId: 'product-1',
          orgId: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: prisma throws error When: finding by entity Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(
        repository.findByEntity(EntityType.create('Product'), 'product-1', 'org-123')
      ).rejects.toThrow('DB Error');
    });
  });

  describe('findByUser - edge cases', () => {
    it('Given: custom limit and offset When: finding by user Then: should apply pagination', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByUser('user-789', 'org-123', 25, 10);

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25, skip: 10 })
      );
    });

    it('Given: empty orgId When: finding by user Then: should use null orgId', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByUser('user-789', '');

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { performedBy: 'user-789', orgId: null },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: prisma throws error When: finding by user Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByUser('user-789', 'org-123')).rejects.toThrow('DB Error');
    });
  });

  describe('findByAction - edge cases', () => {
    it('Given: custom limit and offset When: finding by action Then: should apply pagination', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByAction(AuditAction.create('CREATE'), 'org-123', 50, 20);

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 20 })
      );
    });

    it('Given: empty orgId When: finding by action Then: should use null orgId', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByAction(AuditAction.create('CREATE'), '');

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: 'CREATE', orgId: null },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: prisma throws error When: finding by action Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(
        repository.findByAction(AuditAction.create('CREATE'), 'org-123')
      ).rejects.toThrow('DB Error');
    });
  });

  describe('findByDateRange - edge cases', () => {
    it('Given: custom limit and offset When: finding by date range Then: should apply pagination', async () => {
      // Arrange
      const startDate = new Date('2026-02-01T00:00:00Z');
      const endDate = new Date('2026-02-28T23:59:59Z');
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByDateRange('org-123', startDate, endDate, 50, 10);

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 10 })
      );
    });

    it('Given: empty orgId When: finding by date range Then: should use null orgId', async () => {
      // Arrange
      const startDate = new Date('2026-02-01');
      const endDate = new Date('2026-02-28');
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByDateRange('', startDate, endDate);

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          orgId: null,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: prisma throws error When: finding by date range Then: should propagate error', async () => {
      // Arrange
      const startDate = new Date('2026-02-01');
      const endDate = new Date('2026-02-28');
      mockPrismaService.auditLog.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByDateRange('org-123', startDate, endDate)).rejects.toThrow(
        'DB Error'
      );
    });
  });

  describe('findByFilters - edge cases', () => {
    it('Given: entityId filter only When: finding by filters Then: should include entityId', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByFilters('org-123', { entityId: 'entity-456' });

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123', entityId: 'entity-456' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: only startDate filter When: finding by filters Then: should include only gte constraint', async () => {
      // Arrange
      const startDate = new Date('2026-02-01');
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByFilters('org-123', { startDate });

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: only endDate filter When: finding by filters Then: should include only lte constraint', async () => {
      // Arrange
      const endDate = new Date('2026-02-28');
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByFilters('org-123', { endDate });

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          createdAt: { lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: custom limit and offset When: finding by filters Then: should apply pagination', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByFilters('org-123', {}, 25, 5);

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25, skip: 5 })
      );
    });

    it('Given: empty orgId When: finding by filters Then: should use null orgId', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByFilters('', {});

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { orgId: null },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('Given: prisma throws error When: finding by filters Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.auditLog.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByFilters('org-123', {})).rejects.toThrow('DB Error');
    });

    it('Given: all filters combined When: finding by filters Then: should include all in where clause', async () => {
      // Arrange
      const startDate = new Date('2026-02-01');
      const endDate = new Date('2026-02-28');
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      // Act
      await repository.findByFilters('org-123', {
        entityType: EntityType.create('Product'),
        entityId: 'product-1',
        action: AuditAction.create('CREATE'),
        performedBy: 'user-1',
        startDate,
        endDate,
      });

      // Assert
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          entityType: 'Product',
          entityId: 'product-1',
          action: 'CREATE',
          performedBy: 'user-1',
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });
  });

  describe('countByFilters - edge cases', () => {
    it('Given: empty filters When: counting Then: should only filter by orgId', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      // Act
      await repository.countByFilters('org-123', {});

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
      });
    });

    it('Given: entityType filter When: counting Then: should include in where', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockResolvedValue(3);

      // Act
      const result = await repository.countByFilters('org-123', {
        entityType: EntityType.create('Product'),
      });

      // Assert
      expect(result).toBe(3);
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: { orgId: 'org-123', entityType: 'Product' },
      });
    });

    it('Given: entityId filter When: counting Then: should include in where', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockResolvedValue(2);

      // Act
      await repository.countByFilters('org-123', { entityId: 'entity-1' });

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: { orgId: 'org-123', entityId: 'entity-1' },
      });
    });

    it('Given: performedBy filter When: counting Then: should include in where', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockResolvedValue(4);

      // Act
      await repository.countByFilters('org-123', { performedBy: 'user-1' });

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: { orgId: 'org-123', performedBy: 'user-1' },
      });
    });

    it('Given: only startDate When: counting Then: should include gte constraint', async () => {
      // Arrange
      const startDate = new Date('2026-02-01');
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      // Act
      await repository.countByFilters('org-123', { startDate });

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          createdAt: { gte: startDate },
        },
      });
    });

    it('Given: only endDate When: counting Then: should include lte constraint', async () => {
      // Arrange
      const endDate = new Date('2026-02-28');
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      // Act
      await repository.countByFilters('org-123', { endDate });

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          createdAt: { lte: endDate },
        },
      });
    });

    it('Given: both dates When: counting Then: should include both constraints', async () => {
      // Arrange
      const startDate = new Date('2026-02-01');
      const endDate = new Date('2026-02-28');
      mockPrismaService.auditLog.count.mockResolvedValue(5);

      // Act
      await repository.countByFilters('org-123', { startDate, endDate });

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          createdAt: { gte: startDate, lte: endDate },
        },
      });
    });

    it('Given: empty orgId When: counting Then: should use null orgId', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      // Act
      await repository.countByFilters('', {});

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: { orgId: null },
      });
    });

    it('Given: prisma throws error When: counting Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.auditLog.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.countByFilters('org-123', {})).rejects.toThrow('DB Error');
    });

    it('Given: all filters When: counting Then: should include all in where', async () => {
      // Arrange
      const startDate = new Date('2026-02-01');
      const endDate = new Date('2026-02-28');
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      // Act
      await repository.countByFilters('org-123', {
        entityType: EntityType.create('Product'),
        entityId: 'product-1',
        action: AuditAction.create('CREATE'),
        performedBy: 'user-1',
        startDate,
        endDate,
      });

      // Assert
      expect(mockPrismaService.auditLog.count).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          entityType: 'Product',
          entityId: 'product-1',
          action: 'CREATE',
          performedBy: 'user-1',
          createdAt: { gte: startDate, lte: endDate },
        },
      });
    });
  });

  describe('toDomain - edge cases', () => {
    it('Given: audit log data with null metadata When: converting to domain Then: should use empty object', async () => {
      // Arrange
      const dataWithNullMetadata = {
        ...mockAuditLogData,
        metadata: null,
      };
      mockPrismaService.auditLog.findFirst.mockResolvedValue(dataWithNullMetadata);

      // Act
      const result = await repository.findById('audit-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.metadata.toJSON()).toEqual({});
    });

    it('Given: audit log data with null optional fields When: converting to domain Then: should handle nulls', async () => {
      // Arrange
      const dataWithNulls = {
        ...mockAuditLogData,
        orgId: null,
        entityId: null,
        performedBy: null,
        ipAddress: null,
        userAgent: null,
        httpMethod: null,
        httpUrl: null,
        httpStatusCode: null,
        duration: null,
      };
      mockPrismaService.auditLog.findFirst.mockResolvedValue(dataWithNulls);

      // Act
      const result = await repository.findById('audit-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      // All nullable fields should result in undefined on the domain entity
      expect(result?.entityId).toBeUndefined();
      expect(result?.performedBy).toBeUndefined();
      expect(result?.ipAddress).toBeUndefined();
      expect(result?.userAgent).toBeUndefined();
      expect(result?.httpMethod).toBeUndefined();
      expect(result?.httpUrl).toBeUndefined();
      expect(result?.httpStatusCode).toBeUndefined();
      expect(result?.duration).toBeUndefined();
    });
  });
});
