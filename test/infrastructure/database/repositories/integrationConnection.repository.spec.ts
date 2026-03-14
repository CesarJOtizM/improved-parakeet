/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaIntegrationConnectionRepository } from '@infrastructure/database/repositories/integrationConnection.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../../src/integrations/shared/domain/entities/integrationConnection.entity';

describe('PrismaIntegrationConnectionRepository', () => {
  let repository: PrismaIntegrationConnectionRepository;

  let mockPrismaService: {
    integrationConnection: Record<string, jest.Mock<any>>;
  };

  const mockConnectionData = {
    id: 'conn-1',
    provider: 'VTEX',
    accountName: 'teststore',
    storeName: 'Test Store',
    status: 'CONNECTED',
    syncStrategy: 'BOTH',
    syncDirection: 'BIDIRECTIONAL',
    encryptedAppKey: 'encrypted-key',
    encryptedAppToken: 'encrypted-token',
    webhookSecret: 'secret-123',
    defaultWarehouseId: 'wh-1',
    defaultContactId: null,
    connectedAt: new Date(),
    lastSyncAt: null,
    lastSyncError: null,
    companyId: null,
    orgId: 'org-123',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      integrationConnection: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new PrismaIntegrationConnectionRepository(mockPrismaService as any);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return connection', async () => {
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue(mockConnectionData);

      const result = await repository.findById('conn-1', 'org-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('conn-1');
      expect(result?.provider).toBe('VTEX');
      expect(result?.accountName).toBe('teststore');
      expect(mockPrismaService.integrationConnection.findFirst).toHaveBeenCalledWith({
        where: { id: 'conn-1', orgId: 'org-123' },
      });
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue(null);

      const result = await repository.findById('non-existent', 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('findById - non-Error throw', () => {
    it('Given: non-Error thrown When: finding by id Then: should propagate non-Error', async () => {
      mockPrismaService.integrationConnection.findFirst.mockRejectedValue('string-error');

      await expect(repository.findById('conn-1', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findByOrgId', () => {
    it('Given: valid orgId When: finding by orgId Then: should return connections', async () => {
      mockPrismaService.integrationConnection.findMany.mockResolvedValue([mockConnectionData]);

      const result = await repository.findByOrgId('org-123');

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('VTEX');
      expect(mockPrismaService.integrationConnection.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: filters When: finding by orgId Then: should include filters in query', async () => {
      mockPrismaService.integrationConnection.findMany.mockResolvedValue([]);

      await repository.findByOrgId('org-123', { provider: 'VTEX', status: 'CONNECTED' });

      expect(mockPrismaService.integrationConnection.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123', provider: 'VTEX', status: 'CONNECTED' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByProviderAndAccount', () => {
    it('Given: valid params When: finding Then: should return connection', async () => {
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue(mockConnectionData);

      const result = await repository.findByProviderAndAccount('VTEX', 'teststore', 'org-123');

      expect(result).not.toBeNull();
      expect(result?.accountName).toBe('teststore');
      expect(mockPrismaService.integrationConnection.findFirst).toHaveBeenCalledWith({
        where: { provider: 'VTEX', accountName: 'teststore', orgId: 'org-123' },
      });
    });
  });

  describe('findByProviderAndAccountGlobal', () => {
    it('Given: valid params When: finding globally Then: should not include orgId', async () => {
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue(mockConnectionData);

      const result = await repository.findByProviderAndAccountGlobal('VTEX', 'teststore');

      expect(result).not.toBeNull();
      expect(mockPrismaService.integrationConnection.findFirst).toHaveBeenCalledWith({
        where: { provider: 'VTEX', accountName: 'teststore' },
      });
    });
  });

  describe('findAllConnectedForPolling', () => {
    it('Given: connected connections with polling strategy When: finding Then: should filter correctly', async () => {
      mockPrismaService.integrationConnection.findMany.mockResolvedValue([mockConnectionData]);

      const result = await repository.findAllConnectedForPolling();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.integrationConnection.findMany).toHaveBeenCalledWith({
        where: {
          status: 'CONNECTED',
          syncStrategy: { in: ['POLLING', 'BOTH'] },
          lastSyncAt: { not: null },
        },
      });
    });
  });

  describe('save', () => {
    it('Given: connection entity When: saving Then: should create in prisma and return domain entity', async () => {
      const connection = IntegrationConnection.create(
        {
          provider: 'VTEX',
          accountName: 'newstore',
          storeName: 'New Store',
          syncStrategy: 'BOTH',
          syncDirection: 'BIDIRECTIONAL',
          encryptedAppKey: 'key',
          encryptedAppToken: 'token',
          webhookSecret: 'secret',
          defaultWarehouseId: 'wh-1',
          createdBy: 'user-1',
        },
        'org-123'
      );
      mockPrismaService.integrationConnection.create.mockResolvedValue({
        ...mockConnectionData,
        id: connection.id,
        accountName: 'newstore',
        storeName: 'New Store',
      });

      const result = await repository.save(connection);

      expect(result).not.toBeNull();
      expect(result.accountName).toBe('newstore');
      expect(mockPrismaService.integrationConnection.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('Given: connection entity When: updating Then: should update in prisma', async () => {
      const connection = IntegrationConnection.reconstitute(
        {
          ...mockConnectionData,
          defaultContactId: undefined,
          connectedAt: undefined,
          lastSyncAt: undefined,
          lastSyncError: undefined,
          companyId: undefined,
        },
        'conn-1',
        'org-123'
      );
      mockPrismaService.integrationConnection.update.mockResolvedValue(mockConnectionData);

      const result = await repository.update(connection);

      expect(result).not.toBeNull();
      expect(mockPrismaService.integrationConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
        data: expect.objectContaining({
          storeName: 'Test Store',
          status: 'CONNECTED',
        }),
      });
    });
  });

  describe('delete', () => {
    it('Given: valid id and orgId When: deleting Then: should call deleteMany', async () => {
      mockPrismaService.integrationConnection.deleteMany.mockResolvedValue({ count: 1 });

      await repository.delete('conn-1', 'org-123');

      expect(mockPrismaService.integrationConnection.deleteMany).toHaveBeenCalledWith({
        where: { id: 'conn-1', orgId: 'org-123' },
      });
    });

    it('Given: delete throws error When: deleting Then: should propagate error', async () => {
      mockPrismaService.integrationConnection.deleteMany.mockRejectedValue(
        new Error('Delete failed')
      );

      await expect(repository.delete('conn-1', 'org-123')).rejects.toThrow('Delete failed');
    });

    it('Given: delete throws non-Error When: deleting Then: should propagate non-Error', async () => {
      mockPrismaService.integrationConnection.deleteMany.mockRejectedValue('string-error');

      await expect(repository.delete('conn-1', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('toDomain - optional field mapping', () => {
    it('Given: data with all optional fields populated When: converting to domain Then: should map all fields', async () => {
      const fullData = {
        ...mockConnectionData,
        defaultContactId: 'contact-1',
        connectedAt: new Date('2024-01-01'),
        lastSyncAt: new Date('2024-06-01'),
        lastSyncError: 'Last sync failed',
        companyId: 'company-1',
      };
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue(fullData);

      const result = await repository.findById('conn-1', 'org-123');

      expect(result).not.toBeNull();
      expect(result?.defaultContactId).toBe('contact-1');
      expect(result?.connectedAt).toEqual(new Date('2024-01-01'));
      expect(result?.lastSyncAt).toEqual(new Date('2024-06-01'));
      expect(result?.lastSyncError).toBe('Last sync failed');
      expect(result?.companyId).toBe('company-1');
    });

    it('Given: data with all optional fields null When: converting to domain Then: should map to undefined', async () => {
      const nullData = {
        ...mockConnectionData,
        defaultContactId: null,
        connectedAt: null,
        lastSyncAt: null,
        lastSyncError: null,
        companyId: null,
      };
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue(nullData);

      const result = await repository.findById('conn-1', 'org-123');

      expect(result).not.toBeNull();
      expect(result?.defaultContactId).toBeUndefined();
      expect(result?.connectedAt).toBeUndefined();
      expect(result?.lastSyncAt).toBeUndefined();
      expect(result?.lastSyncError).toBeUndefined();
      expect(result?.companyId).toBeUndefined();
    });
  });

  describe('findByOrgId - error handling', () => {
    it('Given: prisma throws Error When: finding by orgId Then: should propagate Error', async () => {
      mockPrismaService.integrationConnection.findMany.mockRejectedValue(
        new Error('Connection refused')
      );

      await expect(repository.findByOrgId('org-123')).rejects.toThrow('Connection refused');
    });

    it('Given: prisma throws non-Error When: finding by orgId Then: should propagate non-Error', async () => {
      mockPrismaService.integrationConnection.findMany.mockRejectedValue('string-error');

      await expect(repository.findByOrgId('org-123')).rejects.toBe('string-error');
    });

    it('Given: no filters When: finding by orgId Then: should only include orgId in where', async () => {
      mockPrismaService.integrationConnection.findMany.mockResolvedValue([]);

      await repository.findByOrgId('org-123');

      expect(mockPrismaService.integrationConnection.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: only provider filter When: finding by orgId Then: should include provider in where', async () => {
      mockPrismaService.integrationConnection.findMany.mockResolvedValue([]);

      await repository.findByOrgId('org-123', { provider: 'VTEX' });

      expect(mockPrismaService.integrationConnection.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123', provider: 'VTEX' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: only status filter When: finding by orgId Then: should include status in where', async () => {
      mockPrismaService.integrationConnection.findMany.mockResolvedValue([]);

      await repository.findByOrgId('org-123', { status: 'DISCONNECTED' });

      expect(mockPrismaService.integrationConnection.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123', status: 'DISCONNECTED' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByProviderAndAccount - error handling', () => {
    it('Given: prisma throws Error When: finding by provider Then: should propagate Error', async () => {
      mockPrismaService.integrationConnection.findFirst.mockRejectedValue(
        new Error('Query failed')
      );

      await expect(repository.findByProviderAndAccount('VTEX', 'test', 'org-123')).rejects.toThrow(
        'Query failed'
      );
    });

    it('Given: prisma throws non-Error When: finding by provider Then: should propagate non-Error', async () => {
      mockPrismaService.integrationConnection.findFirst.mockRejectedValue('string-error');

      await expect(repository.findByProviderAndAccount('VTEX', 'test', 'org-123')).rejects.toBe(
        'string-error'
      );
    });

    it('Given: no match When: finding by provider Then: should return null', async () => {
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue(null);

      const result = await repository.findByProviderAndAccount('VTEX', 'nonexistent', 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('findByProviderAndAccountGlobal - error handling', () => {
    it('Given: prisma throws Error When: finding globally Then: should propagate Error', async () => {
      mockPrismaService.integrationConnection.findFirst.mockRejectedValue(
        new Error('Global query failed')
      );

      await expect(repository.findByProviderAndAccountGlobal('VTEX', 'test')).rejects.toThrow(
        'Global query failed'
      );
    });

    it('Given: prisma throws non-Error When: finding globally Then: should propagate non-Error', async () => {
      mockPrismaService.integrationConnection.findFirst.mockRejectedValue('string-error');

      await expect(repository.findByProviderAndAccountGlobal('VTEX', 'test')).rejects.toBe(
        'string-error'
      );
    });

    it('Given: no match When: finding globally Then: should return null', async () => {
      mockPrismaService.integrationConnection.findFirst.mockResolvedValue(null);

      const result = await repository.findByProviderAndAccountGlobal('VTEX', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAllConnectedForPolling - error handling', () => {
    it('Given: prisma throws Error When: finding for polling Then: should propagate Error', async () => {
      mockPrismaService.integrationConnection.findMany.mockRejectedValue(
        new Error('Polling query failed')
      );

      await expect(repository.findAllConnectedForPolling()).rejects.toThrow('Polling query failed');
    });

    it('Given: prisma throws non-Error When: finding for polling Then: should propagate non-Error', async () => {
      mockPrismaService.integrationConnection.findMany.mockRejectedValue('string-error');

      await expect(repository.findAllConnectedForPolling()).rejects.toBe('string-error');
    });
  });

  describe('save - error handling', () => {
    it('Given: prisma throws Error When: saving Then: should propagate Error', async () => {
      const connection = IntegrationConnection.create(
        {
          provider: 'VTEX',
          accountName: 'newstore',
          storeName: 'New Store',
          syncStrategy: 'BOTH',
          syncDirection: 'BIDIRECTIONAL',
          encryptedAppKey: 'key',
          encryptedAppToken: 'token',
          webhookSecret: 'secret',
          defaultWarehouseId: 'wh-1',
          createdBy: 'user-1',
        },
        'org-123'
      );
      mockPrismaService.integrationConnection.create.mockRejectedValue(new Error('Create failed'));

      await expect(repository.save(connection)).rejects.toThrow('Create failed');
    });

    it('Given: prisma throws non-Error When: saving Then: should propagate non-Error', async () => {
      const connection = IntegrationConnection.create(
        {
          provider: 'VTEX',
          accountName: 'newstore',
          storeName: 'New Store',
          syncStrategy: 'BOTH',
          syncDirection: 'BIDIRECTIONAL',
          encryptedAppKey: 'key',
          encryptedAppToken: 'token',
          webhookSecret: 'secret',
          defaultWarehouseId: 'wh-1',
          createdBy: 'user-1',
        },
        'org-123'
      );
      mockPrismaService.integrationConnection.create.mockRejectedValue('string-error');

      await expect(repository.save(connection)).rejects.toBe('string-error');
    });
  });

  describe('save - optional field mapping', () => {
    it('Given: connection with optional fields When: saving Then: should map them correctly', async () => {
      const connection = IntegrationConnection.reconstitute(
        {
          provider: 'VTEX',
          accountName: 'test',
          storeName: 'Test',
          status: 'CONNECTED',
          syncStrategy: 'POLLING',
          syncDirection: 'INBOUND',
          encryptedAppKey: 'key',
          encryptedAppToken: 'token',
          webhookSecret: 'secret',
          defaultWarehouseId: 'wh-1',
          defaultContactId: 'contact-1',
          connectedAt: new Date('2024-01-01'),
          lastSyncAt: new Date('2024-06-01'),
          lastSyncError: 'Some error',
          companyId: 'company-1',
          createdBy: 'user-1',
        },
        'conn-1',
        'org-123'
      );

      mockPrismaService.integrationConnection.create.mockResolvedValue({
        ...mockConnectionData,
        id: 'conn-1',
        defaultContactId: 'contact-1',
        companyId: 'company-1',
      });

      await repository.save(connection);

      expect(mockPrismaService.integrationConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          defaultContactId: 'contact-1',
          companyId: 'company-1',
          connectedAt: new Date('2024-01-01'),
          lastSyncAt: new Date('2024-06-01'),
          lastSyncError: 'Some error',
        }),
      });
    });
  });

  describe('update - error handling', () => {
    it('Given: prisma throws Error When: updating Then: should propagate Error', async () => {
      const connection = IntegrationConnection.reconstitute(
        {
          ...mockConnectionData,
          defaultContactId: undefined,
          connectedAt: undefined,
          lastSyncAt: undefined,
          lastSyncError: undefined,
          companyId: undefined,
        },
        'conn-1',
        'org-123'
      );
      mockPrismaService.integrationConnection.update.mockRejectedValue(new Error('Update failed'));

      await expect(repository.update(connection)).rejects.toThrow('Update failed');
    });

    it('Given: prisma throws non-Error When: updating Then: should propagate non-Error', async () => {
      const connection = IntegrationConnection.reconstitute(
        {
          ...mockConnectionData,
          defaultContactId: undefined,
          connectedAt: undefined,
          lastSyncAt: undefined,
          lastSyncError: undefined,
          companyId: undefined,
        },
        'conn-1',
        'org-123'
      );
      mockPrismaService.integrationConnection.update.mockRejectedValue('string-error');

      await expect(repository.update(connection)).rejects.toBe('string-error');
    });
  });

  describe('update - optional field mapping', () => {
    it('Given: connection with all optional fields When: updating Then: should map to correct values', async () => {
      const connection = IntegrationConnection.reconstitute(
        {
          provider: 'VTEX',
          accountName: 'test',
          storeName: 'Updated Store',
          status: 'CONNECTED',
          syncStrategy: 'BOTH',
          syncDirection: 'BIDIRECTIONAL',
          encryptedAppKey: 'new-key',
          encryptedAppToken: 'new-token',
          webhookSecret: 'secret',
          defaultWarehouseId: 'wh-2',
          defaultContactId: 'contact-2',
          connectedAt: new Date('2024-01-01'),
          lastSyncAt: new Date('2024-06-15'),
          lastSyncError: 'Sync timeout',
          companyId: 'company-2',
          createdBy: 'user-1',
        },
        'conn-1',
        'org-123'
      );
      mockPrismaService.integrationConnection.update.mockResolvedValue({
        ...mockConnectionData,
        storeName: 'Updated Store',
        defaultContactId: 'contact-2',
        companyId: 'company-2',
      });

      const result = await repository.update(connection);

      expect(result).not.toBeNull();
      expect(mockPrismaService.integrationConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
        data: expect.objectContaining({
          defaultContactId: 'contact-2',
          connectedAt: new Date('2024-01-01'),
          lastSyncAt: new Date('2024-06-15'),
          lastSyncError: 'Sync timeout',
          companyId: 'company-2',
        }),
      });
    });
  });

  describe('findById - Error instance handling', () => {
    it('Given: prisma throws Error When: finding by id Then: should propagate Error', async () => {
      mockPrismaService.integrationConnection.findFirst.mockRejectedValue(
        new Error('DB connection lost')
      );

      await expect(repository.findById('conn-1', 'org-123')).rejects.toThrow('DB connection lost');
    });
  });
});
