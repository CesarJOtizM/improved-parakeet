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
          contactId: null,
          errorMessage: null,
        },
      });
    });
  });
});
