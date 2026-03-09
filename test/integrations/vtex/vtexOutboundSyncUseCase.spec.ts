import { VtexOutboundSyncUseCase } from '../../../src/integrations/vtex/application/vtexOutboundSyncUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { EncryptionService } from '../../../src/integrations/shared/encryption/encryption.service';
import { VtexApiClient } from '../../../src/integrations/vtex/infrastructure/vtexApiClient';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

describe('VtexOutboundSyncUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: VtexOutboundSyncUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockVtexApiClient: jest.Mocked<VtexApiClient>;

  const createMockConnection = (overrides: Partial<{ syncDirection: string }> = {}) =>
    IntegrationConnection.reconstitute(
      {
        provider: 'VTEX',
        accountName: 'teststore',
        storeName: 'Test Store',
        status: 'CONNECTED',
        syncStrategy: 'BOTH',
        syncDirection: overrides.syncDirection ?? 'BIDIRECTIONAL',
        encryptedAppKey: 'encrypted-key',
        encryptedAppToken: 'encrypted-token',
        webhookSecret: 'secret',
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

    useCase = new VtexOutboundSyncUseCase(
      mockConnectionRepository,
      mockEncryptionService,
      mockVtexApiClient
    );
  });

  it('Given: valid connection and START_HANDLING action When: syncing Then: should call startHandling', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.startHandling.mockResolvedValue(undefined);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-123',
      action: 'START_HANDLING',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.externalOrderId).toBe('ORD-123');
        expect(value.data.action).toBe('START_HANDLING');
        expect(value.data.synced).toBe(true);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockVtexApiClient.startHandling).toHaveBeenCalledWith(
      'teststore',
      'plain-key',
      'plain-token',
      'ORD-123'
    );
  });

  it('Given: valid connection and INVOICE action When: syncing Then: should call sendInvoice', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.sendInvoice.mockResolvedValue(undefined);

    const invoiceData = {
      invoiceNumber: 'INV-001',
      invoiceValue: 10000,
      issuanceDate: '2024-01-01',
      items: [{ id: 'item-1', quantity: 2, price: 5000 }],
    };

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-123',
      action: 'INVOICE',
      orgId: mockOrgId,
      invoiceData,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.synced).toBe(true);
        expect(value.data.action).toBe('INVOICE');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockVtexApiClient.sendInvoice).toHaveBeenCalled();
  });

  it('Given: INVOICE action without invoice data When: syncing Then: should return ValidationError', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-123',
      action: 'INVOICE',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('MISSING_INVOICE_DATA');
      }
    );
  });

  it('Given: valid connection and CANCEL action When: syncing Then: should call cancelOrder', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.cancelOrder.mockResolvedValue(undefined);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-123',
      action: 'CANCEL',
      orgId: mockOrgId,
      cancelReason: 'Customer request',
    });

    expect(result.isOk()).toBe(true);
    expect(mockVtexApiClient.cancelOrder).toHaveBeenCalledWith(
      'teststore',
      'plain-key',
      'plain-token',
      'ORD-123',
      'Customer request'
    );
  });

  it('Given: non-existent connection When: syncing Then: should return NotFoundError', async () => {
    mockConnectionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      connectionId: 'non-existent',
      externalOrderId: 'ORD-123',
      action: 'START_HANDLING',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(NotFoundError);
      }
    );
  });

  it('Given: inbound-only connection When: syncing Then: should skip with synced false', async () => {
    const connection = createMockConnection({ syncDirection: 'INBOUND_ONLY' });
    mockConnectionRepository.findById.mockResolvedValue(connection);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-123',
      action: 'START_HANDLING',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.synced).toBe(false);
        expect(value.message).toContain('inbound only');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockVtexApiClient.startHandling).not.toHaveBeenCalled();
  });

  it('Given: CANCEL action without cancelReason When: syncing Then: should use default reason', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.cancelOrder.mockResolvedValue(undefined);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-123',
      action: 'CANCEL',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    expect(mockVtexApiClient.cancelOrder).toHaveBeenCalledWith(
      'teststore',
      'plain-key',
      'plain-token',
      'ORD-123',
      'Cancelled from Nevada'
    );
  });

  it('Given: API throws error When: syncing Then: should return error result', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.startHandling.mockRejectedValue(new Error('API timeout'));

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-123',
      action: 'START_HANDLING',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('VTEX_OUTBOUND_SYNC_ERROR');
      }
    );
  });
});
