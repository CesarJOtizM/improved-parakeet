import { VtexSyncOrderUseCase } from '../../../src/integrations/vtex/application/vtexSyncOrderUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { IntegrationSyncLog } from '../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';
import { EncryptionService } from '../../../src/integrations/shared/encryption/encryption.service';
import { VtexApiClient } from '../../../src/integrations/vtex/infrastructure/vtexApiClient';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IIntegrationSyncLogRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSyncLogRepository.port';
import type { IIntegrationSkuMappingRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port';
import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

describe('VtexSyncOrderUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: VtexSyncOrderUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockSyncLogRepository: jest.Mocked<IIntegrationSyncLogRepository>;
  let mockSkuMappingRepository: jest.Mocked<IIntegrationSkuMappingRepository>;
  let mockContactRepository: jest.Mocked<IContactRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockVtexApiClient: jest.Mocked<VtexApiClient>;

  const createMockConnection = () =>
    IntegrationConnection.reconstitute(
      {
        provider: 'VTEX',
        accountName: 'teststore',
        storeName: 'Test Store',
        status: 'CONNECTED',
        syncStrategy: 'BOTH',
        syncDirection: 'BIDIRECTIONAL',
        encryptedAppKey: 'encrypted-key',
        encryptedAppToken: 'encrypted-token',
        webhookSecret: 'secret',
        defaultWarehouseId: 'wh-1',
        defaultContactId: 'contact-1',
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

    mockSyncLogRepository = {
      save: jest.fn(),
      findByExternalOrderId: jest.fn(),
      findByConnectionId: jest.fn(),
      findFailedByConnectionId: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IIntegrationSyncLogRepository>;

    mockSkuMappingRepository = {
      findByConnectionId: jest.fn(),
      findByExternalSku: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IIntegrationSkuMappingRepository>;

    mockContactRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByIdentification: jest.fn(),
      existsByIdentification: jest.fn(),
      findByEmail: jest.fn(),
      findByType: jest.fn(),
      countSales: jest.fn(),
    } as jest.Mocked<IContactRepository>;

    mockProductRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findBySku: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
      findBySpecification: jest.fn(),
    } as unknown as jest.Mocked<IProductRepository>;

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

    useCase = new VtexSyncOrderUseCase(
      mockConnectionRepository,
      mockSyncLogRepository,
      mockSkuMappingRepository,
      mockContactRepository,
      mockProductRepository,
      mockEncryptionService,
      mockVtexApiClient
    );
  });

  it('Given: non-existent connection When: syncing order Then: should return NotFoundError', async () => {
    mockConnectionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      connectionId: 'non-existent',
      externalOrderId: 'ORD-123',
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

  it('Given: already synced order When: syncing again Then: should return ALREADY_SYNCED', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);

    const existingLog = IntegrationSyncLog.reconstitute(
      {
        connectionId: 'conn-1',
        externalOrderId: 'ORD-123',
        action: 'SYNCED',
        saleId: 'sale-1',
        processedAt: new Date(),
      },
      'log-1',
      mockOrgId
    );
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(existingLog);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-123',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.action).toBe('ALREADY_SYNCED');
        expect(value.data.saleId).toBe('sale-1');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    // Should NOT have called VTEX API
    expect(mockVtexApiClient.getOrder).not.toHaveBeenCalled();
  });

  it('Given: valid order with unmatched SKUs When: syncing Then: should return error and log failure', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-123',
      sequence: '1',
      status: 'handling',
      creationDate: new Date().toISOString(),
      value: 10000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'UNKNOWN-SKU',
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 10000,
          sellingPrice: 10000,
          imageUrl: '',
        },
      ],
      clientProfileData: {
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        document: '123456',
        documentType: 'CC',
        phone: '555-0100',
        isCorporate: false,
      },
      shippingData: {
        address: {
          street: 'Main St',
          number: '123',
          neighborhood: 'Downtown',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'COL',
        },
      },
      paymentData: { transactions: [] },
    });
    mockContactRepository.findByEmail.mockResolvedValue(null);
    mockContactRepository.findByIdentification.mockResolvedValue(null);
    mockContactRepository.save.mockImplementation(async c => c);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue(null);
    mockProductRepository.findBySku.mockResolvedValue(null);
    mockSyncLogRepository.save.mockImplementation(async l => l);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-123',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    expect(mockSyncLogRepository.save).toHaveBeenCalled();
  });
});
