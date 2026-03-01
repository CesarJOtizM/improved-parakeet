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
  });
});
