/* eslint-disable @typescript-eslint/no-explicit-any */
import { IntegrationsController } from '../../../../src/interfaces/http/integrations/integrations.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

describe('IntegrationsController', () => {
  let controller: IntegrationsController;
  let mockCreateConnectionUseCase: any;
  let mockGetConnectionsUseCase: any;
  let mockGetConnectionByIdUseCase: any;
  let mockUpdateConnectionUseCase: any;
  let mockDeleteConnectionUseCase: any;
  let mockCreateSkuMappingUseCase: any;
  let mockDeleteSkuMappingUseCase: any;
  let mockGetSkuMappingsUseCase: any;
  let mockGetUnmatchedSkusUseCase: any;
  let mockRetrySyncUseCase: any;
  let mockRetryAllFailedSyncsUseCase: any;
  let mockVtexTestConnectionUseCase: any;
  let mockVtexPollOrdersUseCase: any;
  let mockVtexSyncOrderUseCase: any;
  let mockVtexRegisterWebhookUseCase: any;

  const mockOrgId = 'org-123';

  beforeEach(() => {
    mockCreateConnectionUseCase = { execute: jest.fn() };
    mockGetConnectionsUseCase = { execute: jest.fn() };
    mockGetConnectionByIdUseCase = { execute: jest.fn() };
    mockUpdateConnectionUseCase = { execute: jest.fn() };
    mockDeleteConnectionUseCase = { execute: jest.fn() };
    mockCreateSkuMappingUseCase = { execute: jest.fn() };
    mockDeleteSkuMappingUseCase = { execute: jest.fn() };
    mockGetSkuMappingsUseCase = { execute: jest.fn() };
    mockGetUnmatchedSkusUseCase = { execute: jest.fn() };
    mockRetrySyncUseCase = { execute: jest.fn() };
    mockRetryAllFailedSyncsUseCase = { execute: jest.fn() };
    mockVtexTestConnectionUseCase = { execute: jest.fn() };
    mockVtexPollOrdersUseCase = { execute: jest.fn() };
    mockVtexSyncOrderUseCase = { execute: jest.fn() };
    mockVtexRegisterWebhookUseCase = { execute: jest.fn() };

    controller = new IntegrationsController(
      mockCreateConnectionUseCase,
      mockGetConnectionsUseCase,
      mockGetConnectionByIdUseCase,
      mockUpdateConnectionUseCase,
      mockDeleteConnectionUseCase,
      mockCreateSkuMappingUseCase,
      mockDeleteSkuMappingUseCase,
      mockGetSkuMappingsUseCase,
      mockGetUnmatchedSkusUseCase,
      mockRetrySyncUseCase,
      mockRetryAllFailedSyncsUseCase,
      mockVtexTestConnectionUseCase,
      mockVtexPollOrdersUseCase,
      mockVtexSyncOrderUseCase,
      mockVtexRegisterWebhookUseCase
    );
  });

  describe('getConnections', () => {
    it('Given: valid orgId When: getting connections Then: should return connections', async () => {
      const responseData = {
        success: true,
        message: 'Connections retrieved',
        data: [{ id: 'conn-1', provider: 'VTEX', accountName: 'store1' }],
        timestamp: new Date().toISOString(),
      };
      mockGetConnectionsUseCase.execute.mockResolvedValue(ok(responseData));

      const result = await controller.getConnections(undefined, undefined, mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockGetConnectionsUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        provider: undefined,
        status: undefined,
      });
    });

    it('Given: provider filter When: getting connections Then: should pass filter', async () => {
      mockGetConnectionsUseCase.execute.mockResolvedValue(
        ok({ success: true, message: 'OK', data: [], timestamp: new Date().toISOString() })
      );

      await controller.getConnections('VTEX', 'CONNECTED', mockOrgId);

      expect(mockGetConnectionsUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        provider: 'VTEX',
        status: 'CONNECTED',
      });
    });
  });

  describe('getConnectionById', () => {
    it('Given: existing connection When: getting by ID Then: should return connection', async () => {
      const responseData = {
        success: true,
        message: 'Connection retrieved',
        data: { id: 'conn-1', provider: 'VTEX' },
        timestamp: new Date().toISOString(),
      };
      mockGetConnectionByIdUseCase.execute.mockResolvedValue(ok(responseData));

      const result = await controller.getConnectionById('conn-1', mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('conn-1');
    });

    it('Given: non-existent connection When: getting by ID Then: should throw', async () => {
      mockGetConnectionByIdUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Not found', 'INTEGRATION_CONNECTION_NOT_FOUND'))
      );

      await expect(controller.getConnectionById('non-existent', mockOrgId)).rejects.toThrow();
    });
  });

  describe('createConnection', () => {
    it('Given: valid dto When: creating Then: should return created connection', async () => {
      const dto = {
        provider: 'VTEX',
        accountName: 'teststore',
        storeName: 'Test Store',
        appKey: 'key-123',
        appToken: 'token-123',
        defaultWarehouseId: 'wh-1',
      };
      const responseData = {
        success: true,
        message: 'Connection created',
        data: { id: 'conn-1', ...dto },
        timestamp: new Date().toISOString(),
      };
      mockCreateConnectionUseCase.execute.mockResolvedValue(ok(responseData));

      const result = await controller.createConnection(dto, mockOrgId);

      expect(result.success).toBe(true);
      expect(mockCreateConnectionUseCase.execute).toHaveBeenCalledWith({
        ...dto,
        createdBy: 'system',
        orgId: mockOrgId,
      });
    });
  });

  describe('updateConnection', () => {
    it('Given: valid dto When: updating Then: should return updated connection', async () => {
      const dto = { storeName: 'Updated Store' };
      const responseData = {
        success: true,
        message: 'Connection updated',
        data: { id: 'conn-1', storeName: 'Updated Store' },
        timestamp: new Date().toISOString(),
      };
      mockUpdateConnectionUseCase.execute.mockResolvedValue(ok(responseData));

      const result = await controller.updateConnection('conn-1', dto, mockOrgId);

      expect(result.success).toBe(true);
      expect(mockUpdateConnectionUseCase.execute).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        orgId: mockOrgId,
        storeName: 'Updated Store',
      });
    });
  });

  describe('deleteConnection', () => {
    it('Given: existing connection When: deleting Then: should return success', async () => {
      mockDeleteConnectionUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Deleted',
          data: { id: 'conn-1' },
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.deleteConnection('conn-1', mockOrgId);

      expect(result.success).toBe(true);
      expect(mockDeleteConnectionUseCase.execute).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        orgId: mockOrgId,
      });
    });
  });

  describe('testConnection', () => {
    it('Given: valid connectionId When: testing Then: should call test use case', async () => {
      mockVtexTestConnectionUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Connection test successful',
          data: { connected: true },
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.testConnection('conn-1', mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data.connected).toBe(true);
    });
  });

  describe('syncConnection', () => {
    it('Given: valid connectionId When: syncing Then: should call poll use case', async () => {
      mockVtexPollOrdersUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Polling completed',
          data: { polled: 5, synced: 3, failed: 2 },
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.syncConnection('conn-1', mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data.polled).toBe(5);
    });
  });

  describe('syncOrder', () => {
    it('Given: valid params When: syncing order Then: should call sync order use case', async () => {
      mockVtexSyncOrderUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Synced',
          data: { externalOrderId: 'ORD-123', action: 'SYNCED', saleId: 'sale-1' },
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.syncOrder('conn-1', 'ORD-123', mockOrgId);

      expect(result.success).toBe(true);
      expect(mockVtexSyncOrderUseCase.execute).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        externalOrderId: 'ORD-123',
        orgId: mockOrgId,
      });
    });
  });

  describe('registerWebhook', () => {
    it('Given: valid params When: registering webhook Then: should call register use case', async () => {
      mockVtexRegisterWebhookUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Webhook registered',
          data: { registered: true },
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.registerWebhook(
        'conn-1',
        { webhookBaseUrl: 'https://api.example.com' },
        mockOrgId
      );

      expect(result.success).toBe(true);
      expect(result.data.registered).toBe(true);
    });
  });

  describe('getSkuMappings', () => {
    it('Given: valid connectionId When: getting mappings Then: should return mappings', async () => {
      mockGetSkuMappingsUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Mappings retrieved',
          data: [{ id: 'map-1', externalSku: 'VTEX-001', productId: 'prod-1' }],
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.getSkuMappings('conn-1', mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('createSkuMapping', () => {
    it('Given: valid dto When: creating mapping Then: should return created mapping', async () => {
      mockCreateSkuMappingUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Mapping created',
          data: { id: 'map-1', externalSku: 'VTEX-001', productId: 'prod-1' },
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.createSkuMapping(
        'conn-1',
        { externalSku: 'VTEX-001', productId: 'prod-1' },
        mockOrgId
      );

      expect(result.success).toBe(true);
      expect(mockCreateSkuMappingUseCase.execute).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        externalSku: 'VTEX-001',
        productId: 'prod-1',
        orgId: mockOrgId,
      });
    });
  });

  describe('deleteSkuMapping', () => {
    it('Given: existing mapping When: deleting Then: should return success', async () => {
      mockDeleteSkuMappingUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Mapping deleted',
          data: { id: 'map-1' },
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.deleteSkuMapping('conn-1', 'map-1', mockOrgId);

      expect(result.success).toBe(true);
      expect(mockDeleteSkuMappingUseCase.execute).toHaveBeenCalledWith({
        mappingId: 'map-1',
        connectionId: 'conn-1',
        orgId: mockOrgId,
      });
    });
  });

  describe('getUnmatchedSkus', () => {
    it('Given: valid connectionId When: getting unmatched Then: should return unmatched skus', async () => {
      mockGetUnmatchedSkusUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Unmatched SKUs retrieved',
          data: [{ id: 'log-1', externalOrderId: 'ORD-001', errorMessage: 'SKU not mapped' }],
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.getUnmatchedSkus('conn-1', mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('retrySync', () => {
    it('Given: valid params When: retrying Then: should call retry use case', async () => {
      mockRetrySyncUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Retry successful',
          data: { externalOrderId: 'ORD-001', action: 'SYNCED', saleId: 'sale-1' },
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.retrySync('conn-1', 'log-1', mockOrgId);

      expect(result.success).toBe(true);
      expect(mockRetrySyncUseCase.execute).toHaveBeenCalledWith({
        syncLogId: 'log-1',
        connectionId: 'conn-1',
        orgId: mockOrgId,
      });
    });
  });

  describe('retryAllFailedSyncs', () => {
    it('Given: valid connectionId When: retrying all Then: should call retry all use case', async () => {
      mockRetryAllFailedSyncsUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Retry completed',
          data: { total: 5, succeeded: 3, failed: 2 },
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.retryAllFailedSyncs('conn-1', mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(5);
      expect(result.data.succeeded).toBe(3);
      expect(result.data.failed).toBe(2);
    });

    it('Given: use case error When: retrying all Then: should throw', async () => {
      mockRetryAllFailedSyncsUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retry syncs'))
      );

      await expect(controller.retryAllFailedSyncs('conn-1', mockOrgId)).rejects.toThrow();
    });
  });

  describe('createConnection - error paths', () => {
    it('Given: invalid dto When: creating Then: should throw validation error', async () => {
      const dto = {
        provider: '',
        accountName: '',
        storeName: '',
        appKey: '',
        appToken: '',
        defaultWarehouseId: '',
      };
      mockCreateConnectionUseCase.execute.mockResolvedValue(
        err(new ValidationError('Provider is required'))
      );

      await expect(controller.createConnection(dto, mockOrgId)).rejects.toThrow();
    });

    it('Given: optional fields When: creating Then: should pass optional fields', async () => {
      const dto = {
        provider: 'VTEX',
        accountName: 'teststore',
        storeName: 'Test Store',
        appKey: 'key-123',
        appToken: 'token-123',
        defaultWarehouseId: 'wh-1',
        syncStrategy: 'POLL',
        syncDirection: 'INBOUND',
        defaultContactId: 'contact-1',
        companyId: 'company-1',
      };
      const responseData = {
        success: true,
        message: 'Connection created',
        data: { id: 'conn-1', ...dto },
        timestamp: new Date().toISOString(),
      };
      mockCreateConnectionUseCase.execute.mockResolvedValue(ok(responseData));

      const result = await controller.createConnection(dto, mockOrgId);

      expect(result.success).toBe(true);
      expect(mockCreateConnectionUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          syncStrategy: 'POLL',
          syncDirection: 'INBOUND',
          defaultContactId: 'contact-1',
          companyId: 'company-1',
        })
      );
    });
  });

  describe('updateConnection - error paths', () => {
    it('Given: non-existent connection When: updating Then: should throw', async () => {
      mockUpdateConnectionUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Connection not found'))
      );

      await expect(
        controller.updateConnection('non-existent', { storeName: 'New' }, mockOrgId)
      ).rejects.toThrow();
    });

    it('Given: all optional fields When: updating Then: should pass all fields', async () => {
      const dto = {
        storeName: 'Updated Store',
        appKey: 'new-key',
        appToken: 'new-token',
        syncStrategy: 'WEBHOOK',
        syncDirection: 'OUTBOUND',
        defaultWarehouseId: 'wh-2',
        defaultContactId: 'contact-2',
        companyId: 'company-2',
      };
      mockUpdateConnectionUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Updated',
          data: { id: 'conn-1', ...dto },
          timestamp: new Date().toISOString(),
        })
      );

      const result = await controller.updateConnection('conn-1', dto, mockOrgId);

      expect(result.success).toBe(true);
      expect(mockUpdateConnectionUseCase.execute).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        orgId: mockOrgId,
        ...dto,
      });
    });
  });

  describe('deleteConnection - error paths', () => {
    it('Given: non-existent connection When: deleting Then: should throw', async () => {
      mockDeleteConnectionUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Connection not found'))
      );

      await expect(controller.deleteConnection('non-existent', mockOrgId)).rejects.toThrow();
    });
  });

  describe('testConnection - error paths', () => {
    it('Given: connection test fails When: testing Then: should throw', async () => {
      mockVtexTestConnectionUseCase.execute.mockResolvedValue(
        err(new ValidationError('Connection test failed'))
      );

      await expect(controller.testConnection('conn-1', mockOrgId)).rejects.toThrow();
    });
  });

  describe('syncConnection - error paths', () => {
    it('Given: sync fails When: syncing Then: should throw', async () => {
      mockVtexPollOrdersUseCase.execute.mockResolvedValue(err(new ValidationError('Sync failed')));

      await expect(controller.syncConnection('conn-1', mockOrgId)).rejects.toThrow();
    });
  });

  describe('syncOrder - error paths', () => {
    it('Given: order sync fails When: syncing order Then: should throw', async () => {
      mockVtexSyncOrderUseCase.execute.mockResolvedValue(err(new NotFoundError('Order not found')));

      await expect(controller.syncOrder('conn-1', 'ORD-999', mockOrgId)).rejects.toThrow();
    });
  });

  describe('registerWebhook - error paths', () => {
    it('Given: registration fails When: registering webhook Then: should throw', async () => {
      mockVtexRegisterWebhookUseCase.execute.mockResolvedValue(
        err(new ValidationError('Registration failed'))
      );

      await expect(
        controller.registerWebhook('conn-1', { webhookBaseUrl: 'https://bad.url' }, mockOrgId)
      ).rejects.toThrow();
    });
  });

  describe('getSkuMappings - error paths', () => {
    it('Given: use case error When: getting mappings Then: should throw', async () => {
      mockGetSkuMappingsUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Connection not found'))
      );

      await expect(controller.getSkuMappings('non-existent', mockOrgId)).rejects.toThrow();
    });
  });

  describe('createSkuMapping - error paths', () => {
    it('Given: duplicate mapping When: creating Then: should throw', async () => {
      mockCreateSkuMappingUseCase.execute.mockResolvedValue(
        err(new ValidationError('SKU mapping already exists'))
      );

      await expect(
        controller.createSkuMapping(
          'conn-1',
          { externalSku: 'VTEX-001', productId: 'prod-1' },
          mockOrgId
        )
      ).rejects.toThrow();
    });
  });

  describe('deleteSkuMapping - error paths', () => {
    it('Given: non-existent mapping When: deleting Then: should throw', async () => {
      mockDeleteSkuMappingUseCase.execute.mockResolvedValue(
        err(new NotFoundError('SKU mapping not found'))
      );

      await expect(
        controller.deleteSkuMapping('conn-1', 'non-existent', mockOrgId)
      ).rejects.toThrow();
    });
  });

  describe('getUnmatchedSkus - error paths', () => {
    it('Given: use case error When: getting unmatched Then: should throw', async () => {
      mockGetUnmatchedSkusUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Connection not found'))
      );

      await expect(controller.getUnmatchedSkus('non-existent', mockOrgId)).rejects.toThrow();
    });
  });

  describe('retrySync - error paths', () => {
    it('Given: retry fails When: retrying Then: should throw', async () => {
      mockRetrySyncUseCase.execute.mockResolvedValue(err(new ValidationError('Retry failed')));

      await expect(controller.retrySync('conn-1', 'log-1', mockOrgId)).rejects.toThrow();
    });
  });
});
