import { MeliPollOrdersUseCase } from '../../../src/integrations/mercadolibre/application/meliPollOrdersUseCase';
import { MeliSyncOrderUseCase } from '../../../src/integrations/mercadolibre/application/meliSyncOrderUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { MeliApiClient } from '../../../src/integrations/mercadolibre/infrastructure/meliApiClient';
import { MeliReauthRequiredError } from '../../../src/integrations/mercadolibre/domain/meliReauthRequired.error';
import { ok, err } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

describe('MeliPollOrdersUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: MeliPollOrdersUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockMeliApiClient: jest.Mocked<MeliApiClient>;
  let mockSyncOrderUseCase: jest.Mocked<MeliSyncOrderUseCase>;

  const createMockConnection = (
    overrides: Partial<{
      id: string;
      orgId: string;
      provider: string;
      status: string;
      lastSyncAt: Date | undefined;
    }> = {}
  ) =>
    IntegrationConnection.reconstitute(
      {
        provider: overrides.provider ?? 'MERCADOLIBRE',
        accountName: 'testaccount',
        storeName: 'Test Store',
        status: overrides.status ?? 'CONNECTED',
        syncStrategy: 'POLLING',
        syncDirection: 'INBOUND',
        encryptedAppKey: 'encrypted-key',
        encryptedAppToken: 'encrypted-token',
        webhookSecret: 'secret',
        defaultWarehouseId: 'wh-1',
        createdBy: 'user-1',
        meliUserId: '12345',
        tokenStatus: 'VALID',
        encryptedAccessToken: 'enc-access',
        encryptedRefreshToken: 'enc-refresh',
        accessTokenExpiresAt: new Date(Date.now() + 3600000),
        refreshTokenExpiresAt: new Date(Date.now() + 15552000000),
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
      findByMeliUserId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IIntegrationConnectionRepository>;

    mockMeliApiClient = {
      ping: jest.fn(),
      getOrder: jest.fn(),
      listOrders: jest.fn(),
      getShipping: jest.fn(),
    } as unknown as jest.Mocked<MeliApiClient>;

    mockSyncOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MeliSyncOrderUseCase>;

    useCase = new MeliPollOrdersUseCase(
      mockConnectionRepository,
      mockMeliApiClient,
      mockSyncOrderUseCase
    );
  });

  it('Given: specific connectionId When: polling Then: should poll only that connection', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockMeliApiClient.listOrders.mockResolvedValue({
      query: '',
      results: [{ id: 111, status: 'paid' } as any],
      sort: { id: 'date_desc', name: 'Date descending' },
      paging: { total: 1, offset: 0, limit: 50 },
    });
    mockSyncOrderUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'OK',
        data: { externalOrderId: '111', action: 'SYNCED', saleId: 'meli-111' },
        timestamp: new Date().toISOString(),
      })
    );

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    expect(mockConnectionRepository.findById).toHaveBeenCalledWith('conn-1', mockOrgId);
    expect(mockConnectionRepository.findAllConnectedForPolling).not.toHaveBeenCalled();
    result.match(
      value => {
        expect(value.data.polled).toBe(1);
        expect(value.data.synced).toBe(1);
        expect(value.data.failed).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: no connectionId When: polling all Then: should poll all MERCADOLIBRE connections for polling', async () => {
    const meliConnection = createMockConnection({ id: 'conn-meli' });
    const vtexConnection = createMockConnection({ id: 'conn-vtex', provider: 'VTEX' });
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([
      meliConnection,
      vtexConnection,
    ]);
    mockMeliApiClient.listOrders.mockResolvedValue({
      query: '',
      results: [{ id: 222, status: 'paid' } as any],
      sort: { id: 'date_desc', name: 'Date descending' },
      paging: { total: 1, offset: 0, limit: 50 },
    });
    mockSyncOrderUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'OK',
        data: { externalOrderId: '222', action: 'SYNCED', saleId: 'meli-222' },
        timestamp: new Date().toISOString(),
      })
    );

    const result = await useCase.execute({});

    expect(result.isOk()).toBe(true);
    // Should filter to only MERCADOLIBRE connections
    result.match(
      value => {
        expect(value.data.polled).toBe(1); // only meli connection polled
        expect(value.data.synced).toBe(1);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: connection that needs re-auth When: polling Then: should skip that connection', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([connection]);
    mockMeliApiClient.listOrders.mockRejectedValue(new MeliReauthRequiredError('conn-1'));

    const result = await useCase.execute({});

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        // Connection was skipped, so zero counts
        expect(value.data.polled).toBe(0);
        expect(value.data.synced).toBe(0);
        expect(value.data.failed).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    // Should NOT have marked connection as error (re-auth is handled separately)
    expect(mockConnectionRepository.update).not.toHaveBeenCalled();
  });

  it('Given: connection poll throws non-reauth error When: polling Then: should mark connection as error', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([connection]);
    mockMeliApiClient.listOrders.mockRejectedValue(new Error('Network failure'));
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

  it('Given: mixed sync results When: polling Then: should aggregate synced and failed counts', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([connection]);
    mockMeliApiClient.listOrders.mockResolvedValue({
      query: '',
      results: [
        { id: 1, status: 'paid' } as any,
        { id: 2, status: 'paid' } as any,
        { id: 3, status: 'paid' } as any,
      ],
      sort: { id: 'date_desc', name: 'Date descending' },
      paging: { total: 3, offset: 0, limit: 50 },
    });
    mockSyncOrderUseCase.execute
      .mockResolvedValueOnce(
        ok({
          success: true,
          message: 'OK',
          data: { externalOrderId: '1', action: 'SYNCED', saleId: 'meli-1' },
          timestamp: new Date().toISOString(),
        })
      )
      .mockResolvedValueOnce(err(new ValidationError('SKU not mapped', 'MELI_SKU_MISMATCH')))
      .mockResolvedValueOnce(
        ok({
          success: true,
          message: 'OK',
          data: { externalOrderId: '3', action: 'SYNCED', saleId: 'meli-3' },
          timestamp: new Date().toISOString(),
        })
      );

    const result = await useCase.execute({});

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.polled).toBe(3);
        expect(value.data.synced).toBe(2);
        expect(value.data.failed).toBe(1);
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

  it('Given: multiple MERCADOLIBRE connections When: polling all Then: should aggregate counts from all', async () => {
    const conn1 = createMockConnection({ id: 'conn-1' });
    const conn2 = createMockConnection({ id: 'conn-2' });
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([conn1, conn2]);
    mockMeliApiClient.listOrders.mockResolvedValue({
      query: '',
      results: [{ id: 1, status: 'paid' } as any],
      sort: { id: 'date_desc', name: 'Date descending' },
      paging: { total: 1, offset: 0, limit: 50 },
    });
    mockSyncOrderUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'OK',
        data: { externalOrderId: '1', action: 'SYNCED', saleId: 'meli-1' },
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

  it('Given: connection poll throws non-Error When: polling Then: should mark connection error and continue', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findAllConnectedForPolling.mockResolvedValue([connection]);
    mockMeliApiClient.listOrders.mockRejectedValue('non-error-value');
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({});

    expect(result.isOk()).toBe(true);
    expect(mockConnectionRepository.update).toHaveBeenCalled();
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
});
