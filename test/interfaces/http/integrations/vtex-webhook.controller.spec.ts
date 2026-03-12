import { VtexWebhookController } from '../../../../src/interfaces/http/integrations/vtex-webhook.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { VtexSyncOrderUseCase } from '../../../../src/integrations/vtex/application/vtexSyncOrderUseCase';
import { ok } from '@shared/domain/result';

import type { IIntegrationConnectionRepository } from '../../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

describe('VtexWebhookController', () => {
  let controller: VtexWebhookController;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockSyncUseCase: jest.Mocked<VtexSyncOrderUseCase>;

  const mockOrgId = 'test-org-id';
  const createMockConnection = () =>
    IntegrationConnection.reconstitute(
      {
        provider: 'VTEX',
        accountName: 'teststore',
        storeName: 'Test Store',
        status: 'CONNECTED',
        syncStrategy: 'BOTH',
        syncDirection: 'BIDIRECTIONAL',
        encryptedAppKey: 'key',
        encryptedAppToken: 'token',
        webhookSecret: 'valid-secret',
        defaultWarehouseId: 'wh-1',
        createdBy: 'user-1',
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
    } as unknown as jest.Mocked<VtexSyncOrderUseCase>;

    controller = new VtexWebhookController(mockConnectionRepository, mockSyncUseCase);
  });

  it('Given: valid webhook with correct secret When: handling Then: should sync the order', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findByProviderAndAccountGlobal.mockResolvedValue(connection);
    mockSyncUseCase.execute.mockResolvedValue(
      ok({
        success: true,
        message: 'Synced',
        data: { externalOrderId: 'ORD-123', action: 'SYNCED', saleId: 'sale-1' },
        timestamp: new Date().toISOString(),
      })
    );

    const result = await controller.handleWebhook('teststore', 'valid-secret', {
      Domain: 'Marketplace',
      OrderId: 'ORD-123',
      State: 'handling',
      LastState: 'order-completed',
      LastChange: new Date().toISOString(),
      CurrentChange: new Date().toISOString(),
      Origin: { Account: 'teststore', Key: 'key' },
    });

    expect(result).toBeDefined();
    expect(mockSyncUseCase.execute).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-123',
      orgId: mockOrgId,
    });
  });

  it('Given: no connection found When: handling webhook Then: should return error', async () => {
    mockConnectionRepository.findByProviderAndAccountGlobal.mockResolvedValue(null);

    const result = await controller.handleWebhook('unknown', 'secret', {
      Domain: 'Marketplace',
      OrderId: 'ORD-123',
      State: 'handling',
      LastState: '',
      LastChange: new Date().toISOString(),
      CurrentChange: new Date().toISOString(),
      Origin: { Account: 'unknown', Key: 'key' },
    });

    expect(result).toEqual({ success: false, message: 'Connection not found' });
    expect(mockSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: invalid secret When: handling webhook Then: should return unauthorized', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findByProviderAndAccountGlobal.mockResolvedValue(connection);

    const result = await controller.handleWebhook('teststore', 'wrong-secret', {
      Domain: 'Marketplace',
      OrderId: 'ORD-123',
      State: 'handling',
      LastState: '',
      LastChange: new Date().toISOString(),
      CurrentChange: new Date().toISOString(),
      Origin: { Account: 'teststore', Key: 'key' },
    });

    expect(result).toEqual({ success: false, message: 'Unauthorized' });
    expect(mockSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: irrelevant state When: handling webhook Then: should ignore', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findByProviderAndAccountGlobal.mockResolvedValue(connection);

    const result = await controller.handleWebhook('teststore', 'valid-secret', {
      Domain: 'Marketplace',
      OrderId: 'ORD-123',
      State: 'payment-pending',
      LastState: '',
      LastChange: new Date().toISOString(),
      CurrentChange: new Date().toISOString(),
      Origin: { Account: 'teststore', Key: 'key' },
    });

    expect(result).toEqual({ success: true, message: 'State ignored' });
    expect(mockSyncUseCase.execute).not.toHaveBeenCalled();
  });
});
