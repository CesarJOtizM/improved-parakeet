/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaIntegrationSyncLogRepository } from '@infrastructure/database/repositories/integrationSyncLog.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationSyncLog } from '../../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';

describe('PrismaIntegrationSyncLogRepository', () => {
  let repository: PrismaIntegrationSyncLogRepository;

  let mockPrismaService: {
    integrationSyncLog: Record<string, jest.Mock<any>>;
  };

  const mockSyncLogData = {
    id: 'log-1',
    connectionId: 'conn-1',
    externalOrderId: 'ORD-001',
    action: 'SYNCED',
    saleId: 'sale-1',
    contactId: 'contact-1',
    errorMessage: null,
    rawPayload: { OrderId: 'ORD-001', Status: 'ready-for-handling' },
    orgId: 'org-123',
    processedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      integrationSyncLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new PrismaIntegrationSyncLogRepository(mockPrismaService as any);
  });

  describe('save', () => {
    it('Given: sync log entity When: saving Then: should create in prisma', async () => {
      const log = IntegrationSyncLog.create(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-001',
          action: 'PENDING',
        },
        'org-123'
      );
      mockPrismaService.integrationSyncLog.create.mockResolvedValue({
        ...mockSyncLogData,
        id: log.id,
        action: 'PENDING',
        saleId: null,
        contactId: null,
      });

      const result = await repository.save(log);

      expect(result).not.toBeNull();
      expect(result.externalOrderId).toBe('ORD-001');
      expect(mockPrismaService.integrationSyncLog.create).toHaveBeenCalled();
    });
  });

  describe('save - non-Error throw', () => {
    it('Given: non-Error thrown When: saving sync log Then: should propagate non-Error', async () => {
      const log = IntegrationSyncLog.create(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-001',
          action: 'PENDING',
        },
        'org-123'
      );
      mockPrismaService.integrationSyncLog.create.mockRejectedValue('string-error');

      await expect(repository.save(log)).rejects.toBe('string-error');
    });
  });

  describe('findByExternalOrderId', () => {
    it('Given: existing order When: finding Then: should return sync log', async () => {
      mockPrismaService.integrationSyncLog.findFirst.mockResolvedValue(mockSyncLogData);

      const result = await repository.findByExternalOrderId('conn-1', 'ORD-001');

      expect(result).not.toBeNull();
      expect(result?.externalOrderId).toBe('ORD-001');
      expect(result?.action).toBe('SYNCED');
      expect(mockPrismaService.integrationSyncLog.findFirst).toHaveBeenCalledWith({
        where: { connectionId: 'conn-1', externalOrderId: 'ORD-001' },
      });
    });

    it('Given: non-existent order When: finding Then: should return null', async () => {
      mockPrismaService.integrationSyncLog.findFirst.mockResolvedValue(null);

      const result = await repository.findByExternalOrderId('conn-1', 'NON-EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('findByConnectionId', () => {
    it('Given: valid connectionId When: finding with pagination Then: should return paginated results', async () => {
      mockPrismaService.integrationSyncLog.findMany.mockResolvedValue([mockSyncLogData]);
      mockPrismaService.integrationSyncLog.count.mockResolvedValue(1);

      const result = await repository.findByConnectionId('conn-1', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].externalOrderId).toBe('ORD-001');
      expect(mockPrismaService.integrationSyncLog.findMany).toHaveBeenCalledWith({
        where: { connectionId: 'conn-1' },
        skip: 0,
        take: 10,
        orderBy: { processedAt: 'desc' },
      });
    });

    it('Given: action filter When: finding Then: should include filter in query', async () => {
      mockPrismaService.integrationSyncLog.findMany.mockResolvedValue([]);
      mockPrismaService.integrationSyncLog.count.mockResolvedValue(0);

      await repository.findByConnectionId('conn-1', 1, 10, { action: 'FAILED' });

      expect(mockPrismaService.integrationSyncLog.findMany).toHaveBeenCalledWith({
        where: { connectionId: 'conn-1', action: 'FAILED' },
        skip: 0,
        take: 10,
        orderBy: { processedAt: 'desc' },
      });
    });

    it('Given: page 2 When: finding Then: should calculate correct skip', async () => {
      mockPrismaService.integrationSyncLog.findMany.mockResolvedValue([]);
      mockPrismaService.integrationSyncLog.count.mockResolvedValue(0);

      await repository.findByConnectionId('conn-1', 2, 20);

      expect(mockPrismaService.integrationSyncLog.findMany).toHaveBeenCalledWith({
        where: { connectionId: 'conn-1' },
        skip: 20,
        take: 20,
        orderBy: { processedAt: 'desc' },
      });
    });
  });

  describe('findFailedByConnectionId', () => {
    it('Given: failed logs exist When: finding failed Then: should filter by FAILED action', async () => {
      const failedLogData = {
        ...mockSyncLogData,
        action: 'FAILED',
        errorMessage: 'SKU not mapped',
        saleId: null,
      };
      mockPrismaService.integrationSyncLog.findMany.mockResolvedValue([failedLogData]);

      const result = await repository.findFailedByConnectionId('conn-1');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('FAILED');
      expect(result[0].errorMessage).toBe('SKU not mapped');
      expect(mockPrismaService.integrationSyncLog.findMany).toHaveBeenCalledWith({
        where: { connectionId: 'conn-1', action: 'FAILED' },
        orderBy: { processedAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('Given: sync log entity When: updating Then: should update in prisma', async () => {
      const log = IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-001',
          action: 'SYNCED',
          saleId: 'sale-1',
          processedAt: new Date(),
        },
        'log-1',
        'org-123'
      );
      mockPrismaService.integrationSyncLog.update.mockResolvedValue(mockSyncLogData);

      const result = await repository.update(log);

      expect(result).not.toBeNull();
      expect(mockPrismaService.integrationSyncLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: {
          action: 'SYNCED',
          saleId: 'sale-1',
          saleNumber: null,
          contactId: null,
          errorMessage: null,
        },
      });
    });

    it('Given: sync log with all optional fields When: updating Then: should map correctly', async () => {
      const log = IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-001',
          action: 'FAILED',
          saleId: 'sale-1',
          contactId: 'contact-1',
          errorMessage: 'Failed to sync',
          processedAt: new Date(),
        },
        'log-1',
        'org-123'
      );
      mockPrismaService.integrationSyncLog.update.mockResolvedValue({
        ...mockSyncLogData,
        action: 'FAILED',
        errorMessage: 'Failed to sync',
      });

      const result = await repository.update(log);

      expect(result).not.toBeNull();
      expect(mockPrismaService.integrationSyncLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: {
          action: 'FAILED',
          saleId: 'sale-1',
          saleNumber: null,
          contactId: 'contact-1',
          errorMessage: 'Failed to sync',
        },
      });
    });

    it('Given: prisma throws Error When: updating Then: should propagate Error', async () => {
      const log = IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-001',
          action: 'SYNCED',
          processedAt: new Date(),
        },
        'log-1',
        'org-123'
      );
      mockPrismaService.integrationSyncLog.update.mockRejectedValue(new Error('Update failed'));

      await expect(repository.update(log)).rejects.toThrow('Update failed');
    });

    it('Given: prisma throws non-Error When: updating Then: should propagate non-Error', async () => {
      const log = IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-001',
          action: 'SYNCED',
          processedAt: new Date(),
        },
        'log-1',
        'org-123'
      );
      mockPrismaService.integrationSyncLog.update.mockRejectedValue('string-error');

      await expect(repository.update(log)).rejects.toBe('string-error');
    });
  });

  describe('save - additional branch coverage', () => {
    it('Given: sync log with all optional fields When: saving Then: should map fields correctly', async () => {
      const log = IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-002',
          action: 'SYNCED',
          saleId: 'sale-2',
          contactId: 'contact-2',
          errorMessage: undefined,
          rawPayload: { key: 'value' },
          processedAt: new Date(),
        },
        'log-2',
        'org-123'
      );
      mockPrismaService.integrationSyncLog.create.mockResolvedValue({
        ...mockSyncLogData,
        id: 'log-2',
        saleId: 'sale-2',
        contactId: 'contact-2',
      });

      const result = await repository.save(log);

      expect(result).not.toBeNull();
      expect(mockPrismaService.integrationSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          saleId: 'sale-2',
          contactId: 'contact-2',
          errorMessage: null,
        }),
      });
    });

    it('Given: prisma throws Error When: saving Then: should propagate Error', async () => {
      const log = IntegrationSyncLog.create(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-001',
          action: 'PENDING',
        },
        'org-123'
      );
      mockPrismaService.integrationSyncLog.create.mockRejectedValue(new Error('Create failed'));

      await expect(repository.save(log)).rejects.toThrow('Create failed');
    });
  });

  describe('findByExternalOrderId - error handling', () => {
    it('Given: prisma throws Error When: finding Then: should propagate Error', async () => {
      mockPrismaService.integrationSyncLog.findFirst.mockRejectedValue(new Error('Query failed'));

      await expect(repository.findByExternalOrderId('conn-1', 'ORD-001')).rejects.toThrow(
        'Query failed'
      );
    });

    it('Given: prisma throws non-Error When: finding Then: should propagate non-Error', async () => {
      mockPrismaService.integrationSyncLog.findFirst.mockRejectedValue('string-error');

      await expect(repository.findByExternalOrderId('conn-1', 'ORD-001')).rejects.toBe(
        'string-error'
      );
    });
  });

  describe('findByConnectionId - error handling', () => {
    it('Given: prisma throws Error When: finding by connectionId Then: should propagate Error', async () => {
      mockPrismaService.integrationSyncLog.findMany.mockRejectedValue(new Error('Query failed'));

      await expect(repository.findByConnectionId('conn-1', 1, 10)).rejects.toThrow('Query failed');
    });

    it('Given: prisma throws non-Error When: finding by connectionId Then: should propagate non-Error', async () => {
      mockPrismaService.integrationSyncLog.findMany.mockRejectedValue('string-error');

      await expect(repository.findByConnectionId('conn-1', 1, 10)).rejects.toBe('string-error');
    });

    it('Given: no action filter When: finding Then: should not include action in where', async () => {
      mockPrismaService.integrationSyncLog.findMany.mockResolvedValue([]);
      mockPrismaService.integrationSyncLog.count.mockResolvedValue(0);

      await repository.findByConnectionId('conn-1', 1, 10, {});

      expect(mockPrismaService.integrationSyncLog.findMany).toHaveBeenCalledWith({
        where: { connectionId: 'conn-1' },
        skip: 0,
        take: 10,
        orderBy: { processedAt: 'desc' },
      });
    });
  });

  describe('findFailedByConnectionId - error handling', () => {
    it('Given: prisma throws Error When: finding failed Then: should propagate Error', async () => {
      mockPrismaService.integrationSyncLog.findMany.mockRejectedValue(new Error('Query failed'));

      await expect(repository.findFailedByConnectionId('conn-1')).rejects.toThrow('Query failed');
    });

    it('Given: prisma throws non-Error When: finding failed Then: should propagate non-Error', async () => {
      mockPrismaService.integrationSyncLog.findMany.mockRejectedValue('string-error');

      await expect(repository.findFailedByConnectionId('conn-1')).rejects.toBe('string-error');
    });

    it('Given: no failed logs When: finding failed Then: should return empty array', async () => {
      mockPrismaService.integrationSyncLog.findMany.mockResolvedValue([]);

      const result = await repository.findFailedByConnectionId('conn-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('toDomain - optional field mapping', () => {
    it('Given: sync log with null rawPayload When: converting to domain Then: should map to undefined', async () => {
      const dataWithNullPayload = {
        ...mockSyncLogData,
        rawPayload: null,
        saleId: null,
        contactId: null,
        errorMessage: null,
      };
      mockPrismaService.integrationSyncLog.findFirst.mockResolvedValue(dataWithNullPayload);

      const result = await repository.findByExternalOrderId('conn-1', 'ORD-001');

      expect(result).not.toBeNull();
      expect(result?.saleId).toBeUndefined();
      expect(result?.contactId).toBeUndefined();
      expect(result?.errorMessage).toBeUndefined();
    });

    it('Given: sync log with all optional fields populated When: converting to domain Then: should map all', async () => {
      const fullData = {
        ...mockSyncLogData,
        saleId: 'sale-1',
        contactId: 'contact-1',
        errorMessage: 'Some error',
        rawPayload: { detail: 'full payload' },
      };
      mockPrismaService.integrationSyncLog.findFirst.mockResolvedValue(fullData);

      const result = await repository.findByExternalOrderId('conn-1', 'ORD-001');

      expect(result).not.toBeNull();
      expect(result?.saleId).toBe('sale-1');
      expect(result?.contactId).toBe('contact-1');
      expect(result?.errorMessage).toBe('Some error');
    });
  });
});
