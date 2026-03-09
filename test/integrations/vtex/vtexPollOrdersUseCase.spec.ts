import { VtexPollOrdersUseCase } from '../../../src/integrations/vtex/application/vtexPollOrdersUseCase';
import { VtexSyncOrderUseCase } from '../../../src/integrations/vtex/application/vtexSyncOrderUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { EncryptionService } from '../../../src/integrations/shared/encryption/encryption.service';
import { VtexApiClient } from '../../../src/integrations/vtex/infrastructure/vtexApiClient';
import { ok, err } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

describe('VtexPollOrdersUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: VtexPollOrdersUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockVtexApiClient: jest.Mocked<VtexApiClient>;
  let mockSyncOrderUseCase: jest.Mocked<VtexSyncOrderUseCase>;

  const createMockConnection = (
    overrides: Partial<{
      id: string;
      orgId: string;
      status: string;
      syncDirection: string;
      lastSyncAt: Date | undefined;
    }> = {}
  ) =>
    IntegrationConnection.reconstitute(
      {
        provider: 'VTEX',
        accountName: 'teststore',
        storeName: 'Test Store',
        status: overrides.status ?? 'CONNECTED',
        syncStrategy: 'BOTH',
        syncDirection: overrides.syncDirection ?? 'BIDIRECTIONAL',
        encryptedAppKey: 'encrypted-key',
        encryptedAppToken: 'encrypted-token',
        webhookSecret: 'secret',
        defaultWarehouseId: 'wh-1',
        createdBy: 'user-1',
        lastSyncAt: overrides.lastSyncAt,
      },
      overrides.id ?? 'conn-1',
      overrides.orgId ?? mockOrgId
    );

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnectionRepository = {
      findByOrgId: jest.fn(),
      findById: jest.fn(),
      findByProviderAndAccount: jest.fn(),
      findByProviderAndAccountGlobal: jest.fn(),
      findAllConnectedForPolling: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IIntegrationConnectionRepository>;

    mockEncryptionService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as unknown as jest.Mocked<EncryptionService>;

    mockVtexApiClient = {
      ping: jest.fn(),
      getOrder: jest.fn(),
      listOrders: jest.fn(),
      registerWebhook: jest.fn(),
      startHandling: jest.fn(),
      sendInvoice: jest.fn(),
      cancelOrder: jest.fn(),
    } as unknown as jest.Mocked<VtexApiClient>;

    mockSyncOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<VtexSyncOrderUseCase>;

    useCase = new VtexPollOrdersUseCase(
      mockConnectionRepository,
      mockEncryptionService,
      mockVtexApiClient,
      mockSyncOrderUseCase
    );
  });

  it('Given: connected connections When: polling all Then: should poll and sync orders', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([connection]);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.listOrders.mockResolvedValue({
      list: [
        { orderId: 'ORD-1', status: 'ready-for-handling' } as any,
        { orderId: 'ORD-2', status: 'ready-for-handling' } as any,
      ],
      paging: { total: 2, pages: 1, currentPage: 1, perPage: 50 },
    });
    mockSyncOrderUseCase.execute
      .mockResolvedValueOnce(
        ok({
          success: true,
          message: 'OK',
          data: { externalOrderId: 'ORD-1', action: 'SYNCED', saleId: 'sale-1' },
          timestamp: new Date().toISOString(),
        })
      )
      .mockResolvedValueOnce(err(new ValidationError('SKU not mapped', 'SKU_NOT_FOUND')));

    const result = await useCase.execute({});

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.polled).toBe(2);
        expect(value.data.synced).toBe(1);
        expect(value.data.failed).toBe(1);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: specific connectionId When: polling Then: should poll only that connection', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.listOrders.mockResolvedValue({
      list: [{ orderId: 'ORD-1', status: 'ready-for-handling' } as any],
      paging: { total: 1, pages: 1, currentPage: 1, perPage: 50 },
    });
    mockSyncOrderUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'OK',
        data: { externalOrderId: 'ORD-1', action: 'SYNCED', saleId: 'sale-1' },
        timestamp: new Date().toISOString(),
      })
    );

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    expect(mockConnectionRepository.findById).toHaveBeenCalledWith('conn-1', mockOrgId);
    expect(mockConnectionRepository.findAllConnectedForPolling).not.toHaveBeenCalled();
  });

  it('Given: no connected connections When: polling all Then: should return zero counts', async () => {
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([]);

    const result = await useCase.execute({});

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.polled).toBe(0);
        expect(value.data.synced).toBe(0);
        expect(value.data.failed).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: connection polling throws When: polling Then: should mark connection error and continue', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([connection]);
    mockEncryptionService.decrypt.mockImplementation(() => {
      throw new Error('Decryption failed');
    });
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({});

    expect(result.isOk()).toBe(true);
    expect(mockConnectionRepository.update).toHaveBeenCalled();
    result.match(
      value => {
        expect(value.data.polled).toBe(0);
        expect(value.data.synced).toBe(0);
        expect(value.data.failed).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: connection without lastSyncAt When: polling Then: should not include date filter', async () => {
    const connection = createMockConnection({ lastSyncAt: undefined });
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([connection]);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.listOrders.mockResolvedValue({
      list: [],
      paging: { total: 0, pages: 0, currentPage: 1, perPage: 50 },
    });

    await useCase.execute({});

    expect(mockVtexApiClient.listOrders).toHaveBeenCalledWith(
      'teststore',
      'plain-key',
      'plain-token',
      expect.objectContaining({
        creationDate: undefined,
        orderBy: 'creationDate,asc',
        perPage: 50,
      })
    );
  });

  it('Given: connection with lastSyncAt When: polling Then: should include date filter', async () => {
    const lastSync = new Date('2024-01-01T00:00:00Z');
    const connection = createMockConnection({ lastSyncAt: lastSync });
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([connection]);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.listOrders.mockResolvedValue({
      list: [],
      paging: { total: 0, pages: 0, currentPage: 1, perPage: 50 },
    });

    await useCase.execute({});

    expect(mockVtexApiClient.listOrders).toHaveBeenCalledWith(
      'teststore',
      'plain-key',
      'plain-token',
      expect.objectContaining({
        creationDate: expect.stringContaining('creationDate:['),
        orderBy: 'creationDate,asc',
        perPage: 50,
      })
    );
  });

  it('Given: connectionId provided but connection not found When: polling Then: should return zero counts', async () => {
    mockConnectionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({ connectionId: 'non-existent', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.polled).toBe(0);
        expect(value.data.synced).toBe(0);
        expect(value.data.failed).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: multiple connections When: polling all Then: should aggregate counts from all', async () => {
    const conn1 = createMockConnection({ id: 'conn-1' });
    const conn2 = createMockConnection({ id: 'conn-2' });
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([conn1, conn2]);
    mockEncryptionService.decrypt.mockReturnValue('plain-value');
    mockVtexApiClient.listOrders.mockResolvedValue({
      list: [{ orderId: 'ORD-1', status: 'ready-for-handling' } as any],
      paging: { total: 1, pages: 1, currentPage: 1, perPage: 50 },
    });
    mockSyncOrderUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'OK',
        data: { externalOrderId: 'ORD-1', action: 'SYNCED', saleId: 'sale-1' },
        timestamp: new Date().toISOString(),
      })
    );

    const result = await useCase.execute({});

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.polled).toBe(2); // 1 per connection
        expect(value.data.synced).toBe(2);
        expect(value.data.failed).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: outer try-catch throws When: polling Then: should return ValidationError', async () => {
    mockConnectionRepository.findAllConnectedForPolling.mockRejectedValue(
      new Error('Connection repo failed')
    );

    const result = await useCase.execute({});

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('Polling failed');
        expect(error.message).toContain('Connection repo failed');
      }
    );
  });

  it('Given: outer try-catch throws non-Error When: polling Then: should return ValidationError with Unknown error', async () => {
    mockConnectionRepository.findAllConnectedForPolling.mockRejectedValue('string-error');

    const result = await useCase.execute({});

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('Unknown error');
      }
    );
  });

  it('Given: connection polling throws non-Error When: polling Then: should mark connection with Unknown polling error', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([connection]);
    mockEncryptionService.decrypt.mockImplementation(() => {
      throw 'non-error-value';
    });
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({});

    expect(result.isOk()).toBe(true);
    expect(mockConnectionRepository.update).toHaveBeenCalled();
  });

  it('Given: all sync orders fail When: polling Then: should count all as failed', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([connection]);
    mockEncryptionService.decrypt.mockReturnValue('plain-value');
    mockVtexApiClient.listOrders.mockResolvedValue({
      list: [
        { orderId: 'ORD-1', status: 'ready-for-handling' } as any,
        { orderId: 'ORD-2', status: 'ready-for-handling' } as any,
        { orderId: 'ORD-3', status: 'ready-for-handling' } as any,
      ],
      paging: { total: 3, pages: 1, currentPage: 1, perPage: 50 },
    });
    mockSyncOrderUseCase.execute.mockResolvedValue(
      err(new ValidationError('SKU not mapped', 'SKU_NOT_FOUND'))
    );

    const result = await useCase.execute({});

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.polled).toBe(3);
        expect(value.data.synced).toBe(0);
        expect(value.data.failed).toBe(3);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });
});
