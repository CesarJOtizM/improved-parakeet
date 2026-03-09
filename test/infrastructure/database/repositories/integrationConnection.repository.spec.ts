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
  });
});
