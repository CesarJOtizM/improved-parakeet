import { VtexSyncOrderUseCase } from '../../../src/integrations/vtex/application/vtexSyncOrderUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { IntegrationSyncLog } from '../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';
import { EncryptionService } from '../../../src/integrations/shared/encryption/encryption.service';
import { VtexApiClient } from '../../../src/integrations/vtex/infrastructure/vtexApiClient';
import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { NotFoundError } from '@shared/domain/result/domainError';
import { ok } from '@shared/domain/result';

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
  let mockCreateSaleUseCase: jest.Mocked<CreateSaleUseCase>;
  let mockConfirmSaleUseCase: jest.Mocked<ConfirmSaleUseCase>;

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

    mockCreateSaleUseCase = {
      execute: jest.fn<any>().mockResolvedValue(
        ok({
          success: true,
          message: 'Sale created successfully',
          data: { id: 'sale-uuid-123', saleNumber: 'S-0001', status: 'DRAFT' },
          timestamp: new Date().toISOString(),
        })
      ),
    } as unknown as jest.Mocked<CreateSaleUseCase>;

    mockConfirmSaleUseCase = {
      execute: jest.fn<any>().mockResolvedValue(
        ok({
          success: true,
          message: 'Sale confirmed successfully',
          data: {
            id: 'sale-uuid-123',
            saleNumber: 'S-0001',
            status: 'CONFIRMED',
            movementId: 'mov-1',
          },
          timestamp: new Date().toISOString(),
        })
      ),
    } as unknown as jest.Mocked<ConfirmSaleUseCase>;

    useCase = new VtexSyncOrderUseCase(
      mockConnectionRepository,
      mockSyncLogRepository,
      mockSkuMappingRepository,
      mockContactRepository,
      mockProductRepository,
      mockEncryptionService,
      mockVtexApiClient,
      mockCreateSaleUseCase,
      mockConfirmSaleUseCase
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

  it('Given: valid order with matched SKU via mapping When: syncing Then: should sync successfully', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-200',
      sequence: '1',
      status: 'handling',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'MAPPED-SKU',
          name: 'Product',
          skuName: 'SKU',
          quantity: 2,
          price: 5000,
          sellingPrice: 5000,
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
    mockContactRepository.findByEmail.mockResolvedValue({ id: 'existing-contact' } as any);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-200',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.action).toBe('SYNCED');
        expect(value.data.contactId).toBe('existing-contact');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: order with no clientProfileData When: syncing Then: should use defaultContactId', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-300',
      sequence: '1',
      status: 'handling',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'SKU-1',
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 5000,
          sellingPrice: 5000,
          imageUrl: '',
        },
      ],
      clientProfileData: undefined as any,
      shippingData: undefined as any,
      paymentData: { transactions: [] },
    });
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-300',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.action).toBe('SYNCED');
        expect(value.data.contactId).toBe('contact-1');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: order with document-matched contact When: syncing Then: should use document contact', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-400',
      sequence: '1',
      status: 'handling',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'SKU-1',
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 5000,
          sellingPrice: 5000,
          imageUrl: '',
        },
      ],
      clientProfileData: {
        email: 'new@test.com',
        firstName: 'John',
        lastName: 'Doe',
        document: 'DOC-999',
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
    mockContactRepository.findByIdentification.mockResolvedValue({ id: 'doc-contact' } as any);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-400',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.contactId).toBe('doc-contact');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: corporate order When: syncing Then: should use corporateName', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-500',
      sequence: '1',
      status: 'handling',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'SKU-1',
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 5000,
          sellingPrice: 5000,
          imageUrl: '',
        },
      ],
      clientProfileData: {
        email: 'corp@company.com',
        firstName: 'John',
        lastName: 'Doe',
        document: 'NIT-001',
        documentType: 'NIT',
        phone: '555-0100',
        isCorporate: true,
        corporateName: 'Big Corp Inc',
      },
      shippingData: undefined as any,
      paymentData: { transactions: [] },
    });
    mockContactRepository.findByEmail.mockResolvedValue(null);
    mockContactRepository.findByIdentification.mockResolvedValue(null);
    mockContactRepository.save.mockImplementation(async c => c);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-500',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    // Contact was created (save was called)
    expect(mockContactRepository.save).toHaveBeenCalled();
  });

  it('Given: VTEX API fetch fails When: syncing Then: should log failure and return error', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockRejectedValue(new Error('API timeout'));
    mockSyncLogRepository.save.mockImplementation(async l => l);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-ERR',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('VTEX_ORDER_FETCH_ERROR');
      }
    );
    expect(mockSyncLogRepository.save).toHaveBeenCalled();
  });

  it('Given: product found by SKU directly When: syncing Then: should match without mapping', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-600',
      sequence: '1',
      status: 'handling',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'LOCAL-SKU',
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 5000,
          sellingPrice: 5000,
          imageUrl: '',
        },
      ],
      clientProfileData: undefined as any,
      shippingData: undefined as any,
      paymentData: { transactions: [] },
    });
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue(null);
    mockProductRepository.findBySku.mockResolvedValue({ id: 'direct-product' } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-600',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.action).toBe('SYNCED');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: item without refId When: syncing Then: should fall back to item.id for SKU matching', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-700',
      sequence: '1',
      status: 'handling',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'vtex-item-id-fallback',
          productId: 'vtex-prod-1',
          refId: undefined as any,
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 5000,
          sellingPrice: 5000,
          imageUrl: '',
        },
      ],
      clientProfileData: undefined as any,
      shippingData: undefined as any,
      paymentData: { transactions: [] },
    });
    // Should use item.id as refId fallback
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-fallback',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-700',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    expect(mockSkuMappingRepository.findByExternalSku).toHaveBeenCalledWith(
      'conn-1',
      'vtex-item-id-fallback'
    );
  });

  it('Given: contact resolution throws error When: syncing Then: should fall back to defaultContactId', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-800',
      sequence: '1',
      status: 'handling',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'SKU-1',
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 5000,
          sellingPrice: 5000,
          imageUrl: '',
        },
      ],
      clientProfileData: {
        email: 'error@test.com',
        firstName: 'John',
        lastName: 'Doe',
        document: '999',
        documentType: 'CC',
        phone: '555',
        isCorporate: false,
      },
      shippingData: undefined as any,
      paymentData: { transactions: [] },
    });
    // Contact resolution will throw
    mockContactRepository.findByEmail.mockRejectedValue(new Error('Contact DB error'));
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-800',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        // Falls back to defaultContactId from connection
        expect(value.data.contactId).toBe('contact-1');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: existing FAILED sync log When: syncing successfully Then: should update existing log', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);

    const existingLog = IntegrationSyncLog.reconstitute(
      {
        connectionId: 'conn-1',
        externalOrderId: 'ORD-900',
        action: 'FAILED',
        errorMessage: 'Previous failure',
        processedAt: new Date(),
      },
      'log-existing',
      mockOrgId
    );
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(existingLog);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-900',
      sequence: '1',
      status: 'handling',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'SKU-1',
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 5000,
          sellingPrice: 5000,
          imageUrl: '',
        },
      ],
      clientProfileData: undefined as any,
      shippingData: undefined as any,
      paymentData: { transactions: [] },
    });
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.update.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-900',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    // Should have called update (not save) on the existing log
    expect(mockSyncLogRepository.update).toHaveBeenCalled();
    expect(mockSyncLogRepository.save).not.toHaveBeenCalled();
  });

  it('Given: unexpected error during sync When: syncing Then: should return generic error', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockImplementation(() => {
      throw new Error('Decryption failed');
    });

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-ERR2',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('VTEX_SYNC_ORDER_ERROR');
        expect(error.message).toContain('Decryption failed');
      }
    );
  });

  it('Given: non-Error thrown during sync When: syncing Then: should return Unknown error', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockRejectedValue('string error');

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-ERR3',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.message).toContain('Unknown error');
      }
    );
  });

  it('Given: VTEX API fetch fails with existing log When: syncing Then: should update existing log with failure', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);

    const existingLog = IntegrationSyncLog.reconstitute(
      {
        connectionId: 'conn-1',
        externalOrderId: 'ORD-FAIL2',
        action: 'FAILED',
        processedAt: new Date(),
      },
      'log-existing',
      mockOrgId
    );
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(existingLog);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockRejectedValue(new Error('VTEX 500'));
    mockSyncLogRepository.update.mockImplementation(async l => l);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-FAIL2',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    // Should call update on existing log (not save)
    expect(mockSyncLogRepository.update).toHaveBeenCalled();
  });

  it('Given: order with new contact without document When: syncing Then: should create contact with email as identification', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-CONTACT1',
      sequence: '1',
      status: 'handling',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'SKU-1',
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 5000,
          sellingPrice: 5000,
          imageUrl: '',
        },
      ],
      clientProfileData: {
        email: 'newuser@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
        document: undefined as any,
        documentType: undefined as any,
        phone: '555-1234',
        isCorporate: false,
      },
      shippingData: {
        address: {
          street: '5th Ave',
          number: '100',
          neighborhood: 'Midtown',
          city: 'NYC',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      },
      paymentData: { transactions: [] },
    });
    mockContactRepository.findByEmail.mockResolvedValue(null);
    // No document, so findByIdentification should not be called or returns null
    mockContactRepository.findByIdentification.mockResolvedValue(null);
    mockContactRepository.save.mockImplementation(async c => c);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-CONTACT1',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    expect(mockContactRepository.save).toHaveBeenCalled();
  });

  it('Given: order with payment-pending status When: syncing Then: should skip and not create sale', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-PENDING',
      sequence: '1',
      status: 'payment-pending',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'SKU-1',
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 5000,
          sellingPrice: 5000,
          imageUrl: '',
        },
      ],
      clientProfileData: undefined as any,
      shippingData: undefined as any,
      paymentData: { transactions: [] },
    });

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-PENDING',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.action).toBe('SKIPPED');
        expect(value.message).toContain('payment not yet confirmed');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    // Should NOT create a sale
    expect(mockCreateSaleUseCase.execute).not.toHaveBeenCalled();
  });

  it('Given: order with payment-approved status When: syncing Then: should sync successfully', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-key');
    mockEncryptionService.decrypt.mockReturnValueOnce('plain-token');
    mockVtexApiClient.getOrder.mockResolvedValue({
      orderId: 'ORD-PAID',
      sequence: '1',
      status: 'payment-approved',
      creationDate: new Date().toISOString(),
      value: 5000,
      totals: [],
      items: [
        {
          id: 'item-1',
          productId: 'vtex-prod-1',
          refId: 'SKU-1',
          name: 'Product',
          skuName: 'SKU',
          quantity: 1,
          price: 5000,
          sellingPrice: 5000,
          imageUrl: '',
        },
      ],
      clientProfileData: undefined as any,
      shippingData: undefined as any,
      paymentData: { transactions: [] },
    });
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: 'ORD-PAID',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.action).toBe('SYNCED');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockCreateSaleUseCase.execute).toHaveBeenCalled();
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
