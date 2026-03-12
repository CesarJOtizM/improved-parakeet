import { MeliSyncOrderUseCase } from '../../../src/integrations/mercadolibre/application/meliSyncOrderUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { IntegrationSyncLog } from '../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';
import { MeliApiClient } from '../../../src/integrations/mercadolibre/infrastructure/meliApiClient';
import { MeliReauthRequiredError } from '../../../src/integrations/mercadolibre/domain/meliReauthRequired.error';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { NotFoundError } from '@shared/domain/result/domainError';
import { ok } from '@shared/domain/result';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { IIntegrationSyncLogRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSyncLogRepository.port';
import type { IIntegrationSkuMappingRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port';
import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

describe('MeliSyncOrderUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: MeliSyncOrderUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;
  let mockSyncLogRepository: jest.Mocked<IIntegrationSyncLogRepository>;
  let mockSkuMappingRepository: jest.Mocked<IIntegrationSkuMappingRepository>;
  let mockContactRepository: jest.Mocked<IContactRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockMeliApiClient: jest.Mocked<MeliApiClient>;
  let mockCreateSaleUseCase: jest.Mocked<CreateSaleUseCase>;

  const createMockConnection = () =>
    IntegrationConnection.reconstitute(
      {
        provider: 'MERCADOLIBRE',
        accountName: 'testaccount',
        storeName: 'Test Store',
        status: 'CONNECTED',
        syncStrategy: 'POLLING',
        syncDirection: 'INBOUND',
        encryptedAppKey: 'encrypted-key',
        encryptedAppToken: 'encrypted-token',
        webhookSecret: 'secret',
        defaultWarehouseId: 'wh-1',
        defaultContactId: 'default-contact-1',
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

  const createMockMeliOrder = (
    overrides: Partial<{
      id: number;
      buyer: any;
      order_items: any[];
    }> = {}
  ) => ({
    id: overrides.id ?? 9876543,
    status: 'paid',
    status_detail: null,
    date_created: '2025-06-01T10:00:00Z',
    date_closed: '2025-06-01T10:05:00Z',
    total_amount: 50000,
    currency_id: 'ARS',
    order_items: overrides.order_items ?? [
      {
        item: {
          id: 'MLA-ITEM-1',
          title: 'Test Product',
          seller_sku: 'SKU-MELI-001',
          category_id: 'MLA12345',
          variation_id: null,
        },
        quantity: 2,
        unit_price: 25000,
        full_unit_price: 25000,
        currency_id: 'ARS',
      },
    ],
    payments: [
      {
        id: 111,
        status: 'approved',
        status_detail: 'accredited',
        payment_type: 'credit_card',
        payment_method_id: 'visa',
        transaction_amount: 50000,
        currency_id: 'ARS',
        date_approved: '2025-06-01T10:05:00Z',
      },
    ],
    buyer: overrides.buyer ?? {
      id: 555,
      nickname: 'TEST_BUYER',
      first_name: 'Juan',
      last_name: 'Perez',
      email: 'juan.perez@test.com',
      phone: { area_code: '11', number: '55551234' },
      billing_info: {
        doc_type: 'DNI',
        doc_number: '30123456',
      },
    },
    shipping: { id: 44444 },
    tags: ['paid'],
    pack_id: null,
  });

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

    mockMeliApiClient = {
      ping: jest.fn(),
      getOrder: jest.fn(),
      listOrders: jest.fn(),
      getShipping: jest.fn(),
    } as unknown as jest.Mocked<MeliApiClient>;

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

    useCase = new MeliSyncOrderUseCase(
      mockConnectionRepository,
      mockSyncLogRepository,
      mockSkuMappingRepository,
      mockContactRepository,
      mockProductRepository,
      mockMeliApiClient,
      mockCreateSaleUseCase
    );
  });

  it('Given: non-existent connection When: syncing order Then: should return NotFoundError', async () => {
    mockConnectionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      connectionId: 'non-existent',
      externalOrderId: '12345',
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
        externalOrderId: '9876543',
        action: 'SYNCED',
        saleId: 'meli-9876543',
        contactId: 'contact-123',
        processedAt: new Date(),
      },
      'log-1',
      mockOrgId
    );
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(existingLog);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.action).toBe('ALREADY_SYNCED');
        expect(value.data.saleId).toBe('meli-9876543');
        expect(value.data.contactId).toBe('contact-123');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    // Should NOT have called MeLi API
    expect(mockMeliApiClient.getOrder).not.toHaveBeenCalled();
  });

  it('Given: valid order with matched SKUs via mapping When: syncing Then: should sync successfully', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockMeliApiClient.getOrder.mockResolvedValue(createMockMeliOrder());
    mockContactRepository.findByIdentification.mockResolvedValue({
      id: 'existing-contact',
    } as any);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.action).toBe('SYNCED');
        expect(value.data.contactId).toBe('existing-contact');
        expect(value.data.saleId).toBe('sale-uuid-123');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: order with unmatched SKUs When: syncing Then: should fail with MELI_SKU_MISMATCH', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockMeliApiClient.getOrder.mockResolvedValue(createMockMeliOrder());
    mockContactRepository.findByIdentification.mockResolvedValue({
      id: 'existing-contact',
    } as any);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue(null);
    mockProductRepository.findBySku.mockResolvedValue(null);
    mockSyncLogRepository.save.mockImplementation(async l => l);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('MELI_SKU_MISMATCH');
        expect(error.message).toContain('SKU-MELI-001');
      }
    );
    expect(mockSyncLogRepository.save).toHaveBeenCalled();
  });

  it('Given: order with buyer data When: syncing Then: should create contact from buyer data', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockMeliApiClient.getOrder.mockResolvedValue(
      createMockMeliOrder({
        buyer: {
          id: 555,
          nickname: 'NEW_BUYER',
          first_name: 'Maria',
          last_name: 'Garcia',
          email: 'maria@test.com',
          phone: { area_code: '11', number: '99998888' },
          billing_info: {
            doc_type: 'DNI',
            doc_number: '40567890',
          },
        },
      })
    );
    // Not found by doc, not found by email -> creates new
    mockContactRepository.findByIdentification.mockResolvedValue(null);
    mockContactRepository.findByEmail.mockResolvedValue(null);
    mockContactRepository.save.mockImplementation(async c => c);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    expect(mockContactRepository.save).toHaveBeenCalled();
  });

  it('Given: buyer resolution fails When: syncing Then: should use default contact', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockMeliApiClient.getOrder.mockResolvedValue(createMockMeliOrder());
    // Contact resolution throws
    mockContactRepository.findByIdentification.mockRejectedValue(new Error('DB error'));
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        // Falls back to defaultContactId from connection
        expect(value.data.contactId).toBe('default-contact-1');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: MeliReauthRequiredError during fetch When: syncing Then: should return MELI_REAUTH_REQUIRED', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockMeliApiClient.getOrder.mockRejectedValue(new MeliReauthRequiredError('conn-1'));
    mockSyncLogRepository.save.mockImplementation(async l => l);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('MELI_REAUTH_REQUIRED');
      }
    );
  });

  describe('resolveContact', () => {
    it('Given: buyer with doc_number When: resolving contact Then: should find by doc_number first', async () => {
      const connection = createMockConnection();
      mockConnectionRepository.findById.mockResolvedValue(connection);
      mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
      mockMeliApiClient.getOrder.mockResolvedValue(
        createMockMeliOrder({
          buyer: {
            id: 555,
            nickname: 'BUYER',
            first_name: 'Test',
            last_name: 'User',
            email: 'test@test.com',
            phone: null,
            billing_info: {
              doc_type: 'DNI',
              doc_number: 'DOC-999',
            },
          },
        })
      );
      mockContactRepository.findByIdentification.mockResolvedValue({ id: 'doc-contact' } as any);
      mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
        productId: 'local-product-1',
      } as any);
      mockSyncLogRepository.save.mockImplementation(async l => l);
      mockConnectionRepository.update.mockImplementation(async c => c);

      const result = await useCase.execute({
        connectionId: 'conn-1',
        externalOrderId: '9876543',
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
      expect(mockContactRepository.findByIdentification).toHaveBeenCalledWith('DOC-999', mockOrgId);
      // Should NOT have tried email lookup since doc matched
      expect(mockContactRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('Given: buyer without doc but with email When: resolving contact Then: should find by email', async () => {
      const connection = createMockConnection();
      mockConnectionRepository.findById.mockResolvedValue(connection);
      mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
      mockMeliApiClient.getOrder.mockResolvedValue(
        createMockMeliOrder({
          buyer: {
            id: 555,
            nickname: 'BUYER',
            first_name: 'Test',
            last_name: 'User',
            email: 'found@email.com',
            phone: null,
            billing_info: null,
          },
        })
      );
      mockContactRepository.findByEmail.mockResolvedValue({ id: 'email-contact' } as any);
      mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
        productId: 'local-product-1',
      } as any);
      mockSyncLogRepository.save.mockImplementation(async l => l);
      mockConnectionRepository.update.mockImplementation(async c => c);

      const result = await useCase.execute({
        connectionId: 'conn-1',
        externalOrderId: '9876543',
        orgId: mockOrgId,
      });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.contactId).toBe('email-contact');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockContactRepository.findByEmail).toHaveBeenCalledWith('found@email.com', mockOrgId);
    });

    it('Given: buyer not found by doc or email When: resolving contact Then: should create new contact', async () => {
      const connection = createMockConnection();
      mockConnectionRepository.findById.mockResolvedValue(connection);
      mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
      mockMeliApiClient.getOrder.mockResolvedValue(
        createMockMeliOrder({
          buyer: {
            id: 777,
            nickname: 'NEW_BUYER',
            first_name: 'Carlos',
            last_name: 'Lopez',
            email: 'carlos@newuser.com',
            phone: { area_code: '11', number: '12345678' },
            billing_info: {
              doc_type: 'CUIT',
              doc_number: '20-33333333-4',
            },
          },
        })
      );
      mockContactRepository.findByIdentification.mockResolvedValue(null);
      mockContactRepository.findByEmail.mockResolvedValue(null);
      mockContactRepository.save.mockImplementation(async c => c);
      mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
        productId: 'local-product-1',
      } as any);
      mockSyncLogRepository.save.mockImplementation(async l => l);
      mockConnectionRepository.update.mockImplementation(async c => c);

      const result = await useCase.execute({
        connectionId: 'conn-1',
        externalOrderId: '9876543',
        orgId: mockOrgId,
      });

      expect(result.isOk()).toBe(true);
      expect(mockContactRepository.save).toHaveBeenCalled();
    });
  });

  it('Given: order item with seller_sku null When: syncing Then: should fall back to item.id for SKU matching', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockMeliApiClient.getOrder.mockResolvedValue(
      createMockMeliOrder({
        order_items: [
          {
            item: {
              id: 'MLA-FALLBACK-ID',
              title: 'Product',
              seller_sku: null,
              category_id: 'MLA123',
              variation_id: null,
            },
            quantity: 1,
            unit_price: 1000,
            full_unit_price: 1000,
            currency_id: 'ARS',
          },
        ],
      })
    );
    mockContactRepository.findByIdentification.mockResolvedValue({ id: 'contact-1' } as any);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-fallback',
    } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    expect(mockSkuMappingRepository.findByExternalSku).toHaveBeenCalledWith(
      'conn-1',
      'MLA-FALLBACK-ID'
    );
  });

  it('Given: product found by SKU directly When: syncing Then: should match without mapping', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockMeliApiClient.getOrder.mockResolvedValue(createMockMeliOrder());
    mockContactRepository.findByIdentification.mockResolvedValue({ id: 'contact-1' } as any);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue(null);
    mockProductRepository.findBySku.mockResolvedValue({ id: 'direct-product' } as any);
    mockSyncLogRepository.save.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
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
    expect(mockProductRepository.findBySku).toHaveBeenCalledWith('SKU-MELI-001', mockOrgId);
  });

  it('Given: MeLi API fetch fails with generic error When: syncing Then: should log failure and return error', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(null);
    mockMeliApiClient.getOrder.mockRejectedValue(new Error('API timeout'));
    mockSyncLogRepository.save.mockImplementation(async l => l);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('MELI_ORDER_FETCH_ERROR');
      }
    );
    expect(mockSyncLogRepository.save).toHaveBeenCalled();
  });

  it('Given: existing FAILED sync log When: syncing successfully Then: should update existing log', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);

    const existingLog = IntegrationSyncLog.reconstitute(
      {
        connectionId: 'conn-1',
        externalOrderId: '9876543',
        action: 'FAILED',
        errorMessage: 'Previous failure',
        processedAt: new Date(),
      },
      'log-existing',
      mockOrgId
    );
    mockSyncLogRepository.findByExternalOrderId.mockResolvedValue(existingLog);
    mockMeliApiClient.getOrder.mockResolvedValue(createMockMeliOrder());
    mockContactRepository.findByIdentification.mockResolvedValue({ id: 'contact-1' } as any);
    mockSkuMappingRepository.findByExternalSku.mockResolvedValue({
      productId: 'local-product-1',
    } as any);
    mockSyncLogRepository.update.mockImplementation(async l => l);
    mockConnectionRepository.update.mockImplementation(async c => c);

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
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
    mockSyncLogRepository.findByExternalOrderId.mockRejectedValue(new Error('DB crashed'));

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('MELI_SYNC_ORDER_ERROR');
        expect(error.message).toContain('DB crashed');
      }
    );
  });

  it('Given: MeliReauthRequiredError thrown at top level When: syncing Then: should return MELI_REAUTH_REQUIRED', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockRejectedValue(
      new MeliReauthRequiredError('conn-1')
    );

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.code).toBe('MELI_REAUTH_REQUIRED');
      }
    );
  });

  it('Given: non-Error thrown during sync When: syncing Then: should return Unknown error', async () => {
    const connection = createMockConnection();
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockSyncLogRepository.findByExternalOrderId.mockRejectedValue('string error');

    const result = await useCase.execute({
      connectionId: 'conn-1',
      externalOrderId: '9876543',
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
});
