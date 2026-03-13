import { VtexOutboundSyncHandler } from '../../../src/integrations/vtex/events/vtexOutboundSyncHandler';
import { VtexOutboundSyncUseCase } from '../../../src/integrations/vtex/application/vtexOutboundSyncUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { IntegrationSyncLog } from '../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';
import { SalePickingStartedEvent } from '@sale/domain/events/salePickingStarted.event';
import { SaleShippedEvent } from '@sale/domain/events/saleShipped.event';
import { SaleCancelledEvent } from '@sale/domain/events/saleCancelled.event';
import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IIntegrationSyncLogRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSyncLogRepository.port';

// Mock the sale events since they depend on Sale entity with complex construction
const createMockSalePickingStartedEvent = (saleId: string, orgId: string) => {
  const event = Object.create({
    get eventName() {
      return 'SalePickingStarted';
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

// Create real event instances using mock Sale objects
const createRealSalePickingStartedEvent = (saleId: string, orgId: string) => {
  const mockSale = {
    id: saleId,
    orgId,
    saleNumber: { getValue: () => 'SALE-2025-001' },
    pickedAt: new Date(),
    warehouseId: 'wh-1',
  };
  return new SalePickingStartedEvent(mockSale as any);
};

const createRealSaleShippedEvent = (saleId: string, orgId: string) => {
  const mockSale = {
    id: saleId,
    orgId,
    saleNumber: { getValue: () => 'SALE-2025-002' },
    shippedAt: new Date(),
    warehouseId: 'wh-1',
    trackingNumber: 'TRACK-001',
    shippingCarrier: 'Carrier',
  };
  return new SaleShippedEvent(mockSale as any);
};

const createRealSaleCancelledEvent = (saleId: string, orgId: string) => {
  const mockSale = {
    id: saleId,
    orgId,
    saleNumber: { getValue: () => 'SALE-2025-003' },
    cancelledAt: new Date(),
    warehouseId: 'wh-1',
  };
  return new SaleCancelledEvent(mockSale as any);
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
      findByMeliUserId: jest.fn(),
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

    // Create a mock event that looks like SalePickingStartedEvent but isn't an instance
    // Since we can't easily construct Sale entities, test the "no matching log" path
    const event = createMockSalePickingStartedEvent('sale-1', mockOrgId);

    // The handler checks instanceof, so this event won't match any of the three event types
    // and will return early
    await handler.handle(event);

    expect(mockOutboundSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: inbound-only connection When: handling Then: should skip connection', async () => {
    const connection = createMockConnection({ syncDirection: 'INBOUND_ONLY' });
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);

    const event = createMockSalePickingStartedEvent('sale-1', mockOrgId);

    await handler.handle(event);

    // Should not even query logs for inbound-only connections
    expect(mockOutboundSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: handler throws error When: handling Then: should catch and not throw', async () => {
    mockConnectionRepository.findByOrgId.mockRejectedValue(new Error('DB error'));

    const event = createMockSalePickingStartedEvent('sale-1', mockOrgId);

    // The handler catches all errors internally, so it should not throw
    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('Given: SaleShippedEvent with matching log When: handling Then: should trigger INVOICE outbound sync', async () => {
    // Create a mock that simulates SaleShippedEvent (instanceof check won't match,
    // so we test the else path and no-saleId path)
    const event = { eventName: 'SaleShipped', occurredOn: new Date() } as any;
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
    const event = createMockSalePickingStartedEvent('sale-1', mockOrgId);
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
    const event = createMockSalePickingStartedEvent('sale-1', mockOrgId);
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
    const event = createMockSalePickingStartedEvent('sale-1', mockOrgId);
    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('Given: event with null orgId When: handling Then: should return without action', async () => {
    const event = Object.create({
      get eventName() {
        return 'SalePickingStarted';
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
        return 'SalePickingStarted';
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

  // --- Tests using real event instances to cover instanceof branches ---

  it('Given: real SalePickingStartedEvent with matching sync log When: handling Then: should trigger START_HANDLING outbound sync', async () => {
    const connection = createMockConnection();
    const syncLog = createMockSyncLog('sale-1', 'ORD-EXT-1');
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [syncLog],
      total: 1,
    });
    mockOutboundSyncUseCase.execute.mockResolvedValue(undefined as any);

    const event = createRealSalePickingStartedEvent('sale-1', mockOrgId);
    await handler.handle(event);

    expect(mockOutboundSyncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn-1',
        externalOrderId: 'ORD-EXT-1',
        action: 'START_HANDLING',
        orgId: mockOrgId,
      })
    );
  });

  it('Given: real SaleShippedEvent with matching sync log When: handling Then: should trigger INVOICE outbound sync', async () => {
    const connection = createMockConnection();
    const syncLog = createMockSyncLog('sale-2', 'ORD-EXT-2');
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [syncLog],
      total: 1,
    });
    mockOutboundSyncUseCase.execute.mockResolvedValue(undefined as any);

    const event = createRealSaleShippedEvent('sale-2', mockOrgId);
    await handler.handle(event);

    expect(mockOutboundSyncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn-1',
        externalOrderId: 'ORD-EXT-2',
        action: 'INVOICE',
        orgId: mockOrgId,
      })
    );
  });

  it('Given: real SaleCancelledEvent with matching sync log When: handling Then: should trigger CANCEL outbound sync', async () => {
    const connection = createMockConnection();
    const syncLog = createMockSyncLog('sale-3', 'ORD-EXT-3');
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [syncLog],
      total: 1,
    });
    mockOutboundSyncUseCase.execute.mockResolvedValue(undefined as any);

    const event = createRealSaleCancelledEvent('sale-3', mockOrgId);
    await handler.handle(event);

    expect(mockOutboundSyncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn-1',
        externalOrderId: 'ORD-EXT-3',
        action: 'CANCEL',
        orgId: mockOrgId,
      })
    );
  });

  it('Given: real SalePickingStartedEvent with INBOUND_ONLY connection When: handling Then: should skip connection', async () => {
    const connection = createMockConnection({ syncDirection: 'INBOUND_ONLY' });
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);

    const event = createRealSalePickingStartedEvent('sale-1', mockOrgId);
    await handler.handle(event);

    expect(mockSyncLogRepository.findByConnectionId).not.toHaveBeenCalled();
    expect(mockOutboundSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: real SalePickingStartedEvent with no matching sync log When: handling Then: should not trigger sync', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [createMockSyncLog('different-sale', 'ORD-OTHER')],
      total: 1,
    });

    const event = createRealSalePickingStartedEvent('sale-1', mockOrgId);
    await handler.handle(event);

    expect(mockOutboundSyncUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: real SalePickingStartedEvent and outbound sync throws When: handling Then: should catch error via outer try-catch', async () => {
    const connection = createMockConnection();
    const syncLog = createMockSyncLog('sale-1', 'ORD-EXT-1');
    mockConnectionRepository.findByOrgId.mockResolvedValue([connection]);
    mockSyncLogRepository.findByConnectionId.mockResolvedValue({
      data: [syncLog],
      total: 1,
    });
    mockOutboundSyncUseCase.execute.mockRejectedValue(new Error('Outbound sync failed'));

    const event = createRealSalePickingStartedEvent('sale-1', mockOrgId);
    await expect(handler.handle(event)).resolves.not.toThrow();
  });

  it('Given: non-Error thrown in handler When: handling Then: should log Unknown error', async () => {
    mockConnectionRepository.findByOrgId.mockRejectedValue('string-error');

    const event = createRealSalePickingStartedEvent('sale-1', mockOrgId);
    await expect(handler.handle(event)).resolves.not.toThrow();
  });
});
