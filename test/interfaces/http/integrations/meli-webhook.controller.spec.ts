import { MeliWebhookController } from '../../../../src/interfaces/http/integrations/meli-webhook.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { MeliSyncOrderUseCase } from '../../../../src/integrations/mercadolibre/application/meliSyncOrderUseCase';
import { ok, err } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

describe('MeliWebhookController', () => {
  const mockOrgId = 'test-org-id';

  let controller: MeliWebhookController;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockSyncUseCase: jest.Mocked<MeliSyncOrderUseCase>;

  const createMockConnection = () =>
    IntegrationConnection.reconstitute(
      {
        provider: 'MERCADOLIBRE',
        accountName: 'testaccount',
        storeName: 'Test Store',
        status: 'CONNECTED',
        syncStrategy: 'WEBHOOK',
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
      },
      'conn-1',
      mockOrgId
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

    mockSyncUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MeliSyncOrderUseCase>;

    controller = new MeliWebhookController(mockConnectionRepository, mockSyncUseCase);
  });

  it('Given: order topic webhook with valid resource When: handling Then: should process and sync the order', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findByMeliUserId.mockResolvedValue(connection);
    mockSyncUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'Synced',
        data: { externalOrderId: '98765', action: 'SYNCED', saleId: 'meli-98765' },
        timestamp: new Date().toISOString(),
      })
    );

    const result = await controller.handleWebhook({
      resource: '/orders/98765',
      user_id: 12345,
      topic: 'orders_v2',
      application_id: 111,
      attempts: 1,
      sent: '2025-06-01T10:00:00Z',
      received: '2025-06-01T10:00:01Z',
    });

    expect(result).toBeDefined();
    expect(mockSyncUseCase.execute).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      externalOrderId: '98765',
      orgId: mockOrgId,
    });
  });

  it('Given: marketplace_orders topic When: handling Then: should also process the order', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findByMeliUserId.mockResolvedValue(connection);
    mockSyncUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'Synced',
        data: { externalOrderId: '55555', action: 'SYNCED', saleId: 'meli-55555' },
        timestamp: new Date().toISOString(),
      })
    );

    await controller.handleWebhook({
      resource: '/orders/55555',
      user_id: 12345,
      topic: 'marketplace_orders',
      application_id: 111,
      attempts: 1,
      sent: '2025-06-01T10:00:00Z',
      received: '2025-06-01T10:00:01Z',
    });

    expect(mockSyncUseCase.execute).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      externalOrderId: '55555',
      orgId: mockOrgId,
    });
  });

  it('Given: non-order topic When: handling Then: should ignore and return success', async () => {
    const result = await controller.handleWebhook({
      resource: '/items/MLA12345',
      user_id: 12345,
      topic: 'items',
      application_id: 111,
      attempts: 1,
      sent: '2025-06-01T10:00:00Z',
      received: '2025-06-01T10:00:01Z',
    });

    expect(result).toEqual({ success: true, message: 'Topic ignored' });
    expect(mockSyncUseCase.execute).not.toHaveBeenCalled();
    expect(mockConnectionRepository.findByMeliUserId).not.toHaveBeenCalled();
  });

  it('Given: questions topic When: handling Then: should ignore', async () => {
    const result = await controller.handleWebhook({
      resource: '/questions/999',
      user_id: 12345,
      topic: 'questions',
      application_id: 111,
      attempts: 1,
      sent: '2025-06-01T10:00:00Z',
      received: '2025-06-01T10:00:01Z',
    });

    expect(result).toEqual({ success: true, message: 'Topic ignored' });
    expect(mockSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: order topic but no connection found for user When: handling Then: should return not found', async () => {
    mockConnectionRepository.findByMeliUserId.mockResolvedValue(null);

    const result = await controller.handleWebhook({
      resource: '/orders/12345',
      user_id: 99999,
      topic: 'orders_v2',
      application_id: 111,
      attempts: 1,
      sent: '2025-06-01T10:00:00Z',
      received: '2025-06-01T10:00:01Z',
    });

    expect(result).toEqual({ success: false, message: 'Connection not found' });
    expect(mockSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: order topic but invalid resource format When: handling Then: should return error', async () => {
    const result = await controller.handleWebhook({
      resource: '/items/MLA12345',
      user_id: 12345,
      topic: 'orders_v2',
      application_id: 111,
      attempts: 1,
      sent: '2025-06-01T10:00:00Z',
      received: '2025-06-01T10:00:01Z',
    });

    expect(result).toEqual({ success: false, message: 'Invalid resource format' });
    expect(mockSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: sync use case returns error When: handling webhook Then: should still process (resultToHttpResponse)', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findByMeliUserId.mockResolvedValue(connection);
    mockSyncUseCase.execute.mockResolvedValue(
      err(new ValidationError('SKU mismatch', 'MELI_SKU_MISMATCH'))
    );

    // resultToHttpResponse will throw an HttpException on err result
    // This tests that the controller passes the result through
    await expect(
      controller.handleWebhook({
        resource: '/orders/12345',
        user_id: 12345,
        topic: 'orders_v2',
        application_id: 111,
        attempts: 1,
        sent: '2025-06-01T10:00:00Z',
        received: '2025-06-01T10:00:01Z',
      })
    ).rejects.toBeDefined();
  });
});
