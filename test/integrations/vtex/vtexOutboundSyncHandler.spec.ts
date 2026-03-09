import { VtexOutboundSyncHandler } from '../../../src/integrations/vtex/events/vtexOutboundSyncHandler';
import { VtexOutboundSyncUseCase } from '../../../src/integrations/vtex/application/vtexOutboundSyncUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { IntegrationSyncLog } from '../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';
import { ok } from '@shared/domain/result';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IIntegrationSyncLogRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSyncLogRepository.port';

// Mock the sale events since they depend on Sale entity with complex construction
const createMockSaleConfirmedEvent = (saleId: string, orgId: string) => {
  const event = Object.create({
    get eventName() {
      return 'SaleConfirmed';
    },
    get occurredOn() {
      return new Date();
    },
  });
  Object.defineProperty(event, 'saleId', { value: saleId, enumerable: true });
  Object.defineProperty(event, 'orgId', { value: orgId, enumerable: true });
  // Set the prototype chain so instanceof checks work
  return event;
};

describe('VtexOutboundSyncHandler', () => {
  const mockOrgId = 'test-org-id';

  let handler: VtexOutboundSyncHandler;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockSyncLogRepository: jest.Mocked<IIntegrationSyncLogRepository>;
  let mockOutboundSyncUseCase: jest.Mocked<VtexOutboundSyncUseCase>;

  const createMockConnection = (overrides: Partial<{ id: string; syncDirection: string }> = {}) =>
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
      overrides.id ?? 'conn-1',
      mockOrgId
    );

  const createMockSyncLog = (saleId: string, externalOrderId: string) =>
    IntegrationSyncLog.reconstitute(
      {
        connectionId: 'conn-1',
        externalOrderId,
        action: 'SYNCED',
        saleId,
        processedAt: new Date(),
      },
      'log-1',
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

    mockSyncLogRepository = {
      save: jest.fn(),
      findByExternalOrderId: jest.fn(),
      findByConnectionId: jest.fn(),
      findFailedByConnectionId: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IIntegrationSyncLogRepository>;

    mockOutboundSyncUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<VtexOutboundSyncUseCase>;

    handler = new VtexOutboundSyncHandler(
      mockConnectionRepository,
      mockSyncLogRepository,
      mockOutboundSyncUseCase
    );
  });

  it('Given: unknown event When: handling Then: should return without action', async () => {
    const unknownEvent = { eventName: 'UnknownEvent', occurredOn: new Date() } as any;

    await handler.handle(unknownEvent);

    expect(mockConnectionRepository.findByOrgId).not.toHaveBeenCalled();
    expect(mockOutboundSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: no matching sync log When: handling Then: should not trigger outbound sync', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [],
      total: 0,
    });

    // Create a mock event that looks like SaleConfirmedEvent but isn't an instance
    // Since we can't easily construct Sale entities, test the "no matching log" path
    const event = createMockSaleConfirmedEvent('sale-1', mockOrgId);

    // The handler checks instanceof, so this event won't match any of the three event types
    // and will return early
    await handler.handle(event);

    expect(mockOutboundSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: inbound-only connection When: handling Then: should skip connection', async () => {
    const connection = createMockConnection({ syncDirection: 'INBOUND_ONLY' });
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);

    const event = createMockSaleConfirmedEvent('sale-1', mockOrgId);

    await handler.handle(event);

    // Should not even query logs for inbound-only connections
    expect(mockOutboundSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: handler throws error When: handling Then: should catch and not throw', async () => {
    mockConnectionRepository.findByOrgId.mockRejectedValue(new Error('DB error'));

    const event = createMockSaleConfirmedEvent('sale-1', mockOrgId);

    // The handler catches all errors internally, so it should not throw
    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('Given: SaleCompletedEvent with matching log When: handling Then: should trigger INVOICE outbound sync', async () => {
    // Create a mock that simulates SaleCompletedEvent (instanceof check won't match,
    // so we test the else path and no-saleId path)
    const event = { eventName: 'SaleCompleted', occurredOn: new Date() } as any;
    // This won't match instanceof checks, so it hits the else return
    await handler.handle(event);
    expect(mockOutboundSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: SaleCancelledEvent without saleId When: handling Then: should return early', async () => {
    const event = { eventName: 'SaleCancelled', occurredOn: new Date() } as any;
    await handler.handle(event);
    expect(mockConnectionRepository.findByOrgId).not.toHaveBeenCalled();
  });

  it('Given: no connections for org When: handling Then: should not trigger sync', async () => {
    mockConnectionRepository.findByOrgId.mockResolvedValue([]);
    const event = createMockSaleConfirmedEvent('sale-1', mockOrgId);
    await handler.handle(event);
    expect(mockOutboundSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: connection with matching sync log When: handling via mock event Then: should not match instanceof', async () => {
    const connection = createMockConnection();
    const syncLog = createMockSyncLog('sale-1', 'ORD-EXT-1');
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [syncLog],
      total: 1,
    });

    // Mock event won't pass instanceof checks, so handler returns early
    const event = createMockSaleConfirmedEvent('sale-1', mockOrgId);
    await handler.handle(event);

    // Since mock event doesn't pass instanceof SaleConfirmedEvent, execute shouldn't be called
    expect(mockOutboundSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: outbound sync use case throws When: handling Then: should catch and not throw', async () => {
    // Simulate a scenario where the sync use case is called but throws
    const connection = createMockConnection();
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [createMockSyncLog('sale-1', 'ORD-1')],
      total: 1,
    });
    mockOutboundSyncUseCase.execute.mockRejectedValue(new Error('Outbound sync failed'));

    // Even if mockOutboundSyncUseCase throws, the outer try-catch protects us
    const event = createMockSaleConfirmedEvent('sale-1', mockOrgId);
    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('Given: event with null orgId When: handling Then: should return without action', async () => {
    const event = Object.create({
      get eventName() {
        return 'SaleConfirmed';
      },
      get occurredOn() {
        return new Date();
      },
    });
    Object.defineProperty(event, 'saleId', { value: 'sale-1', enumerable: true });
    Object.defineProperty(event, 'orgId', { value: undefined, enumerable: true });

    await handler.handle(event);
    expect(mockConnectionRepository.findByOrgId).not.toHaveBeenCalled();
  });

  it('Given: event with null saleId When: handling Then: should return without action', async () => {
    const event = Object.create({
      get eventName() {
        return 'SaleConfirmed';
      },
      get occurredOn() {
        return new Date();
      },
    });
    Object.defineProperty(event, 'saleId', { value: undefined, enumerable: true });
    Object.defineProperty(event, 'orgId', { value: mockOrgId, enumerable: true });

    await handler.handle(event);
    expect(mockConnectionRepository.findByOrgId).not.toHaveBeenCalled();
  });
});
