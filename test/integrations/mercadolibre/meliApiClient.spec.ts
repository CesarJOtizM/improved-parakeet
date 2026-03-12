import { MeliApiClient } from '../../../src/integrations/mercadolibre/infrastructure/meliApiClient';
import { MeliTokenService } from '../../../src/integrations/mercadolibre/infrastructure/meliTokenService';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MeliApiClient', () => {
  const mockOrgId = 'test-org-id';

  let client: MeliApiClient;
  let mockTokenService: jest.Mocked<MeliTokenService>;
  let mockAxiosInstance: { get: jest.Mock<any>; post: jest.Mock<any> };

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

    mockTokenService = {
      getValidAccessToken: jest.fn(),
      exchangeAuthCode: jest.fn(),
    } as unknown as jest.Mocked<MeliTokenService>;

    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    mockTokenService.getValidAccessToken.mockResolvedValue('valid-access-token');

    client = new MeliApiClient(mockTokenService);
  });

  describe('ping', () => {
    it('Given: valid connection When: pinging Then: should return true on 200 response', async () => {
      const connection = createMockConnection();
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { id: 12345, nickname: 'TEST_USER', site_id: 'MLA' },
      } as any);

      const result = await client.ping(connection);

      expect(result).toBe(true);
      expect(mockTokenService.getValidAccessToken).toHaveBeenCalledWith(connection);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.mercadolibre.com',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token',
          }),
        })
      );
    });

    it('Given: API error When: pinging Then: should return false', async () => {
      const connection = createMockConnection();
      mockAxiosInstance.get.mockRejectedValue(new Error('Unauthorized') as any);

      const result = await client.ping(connection);

      expect(result).toBe(false);
    });
  });

  describe('getOrder', () => {
    it('Given: valid order ID When: fetching Then: should return order data', async () => {
      const connection = createMockConnection();
      const mockOrder = {
        id: 12345678,
        status: 'paid',
        total_amount: 50000,
        currency_id: 'ARS',
        order_items: [],
        buyer: { id: 999, nickname: 'BUYER' },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockOrder } as any);

      const result = await client.getOrder(connection, '12345678');

      expect(result).toEqual(mockOrder);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/orders/12345678');
    });

    it('Given: API error When: fetching order Then: should throw error', async () => {
      const connection = createMockConnection();
      mockAxiosInstance.get.mockRejectedValue(new Error('Not Found') as any);

      await expect(client.getOrder(connection, '999')).rejects.toThrow('Not Found');
    });
  });

  describe('listOrders', () => {
    it('Given: valid params When: listing orders Then: should return search results', async () => {
      const connection = createMockConnection();
      const mockResponse = {
        query: '',
        results: [{ id: 1, status: 'paid' }],
        sort: { id: 'date_desc', name: 'Date descending' },
        paging: { total: 1, offset: 0, limit: 50 },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse } as any);

      const result = await client.listOrders(connection, { sort: 'date_desc', limit: 50 });

      expect(result).toEqual(mockResponse);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/orders/search', {
        params: expect.objectContaining({
          seller: '12345',
          sort: 'date_desc',
          limit: 50,
          offset: 0,
        }),
      });
    });

    it('Given: date filters When: listing orders Then: should include date params', async () => {
      const connection = createMockConnection();
      const mockResponse = {
        query: '',
        results: [],
        sort: { id: 'date_desc', name: 'Date descending' },
        paging: { total: 0, offset: 0, limit: 50 },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse } as any);

      await client.listOrders(connection, {
        dateFrom: '2025-01-01T00:00:00Z',
        dateTo: '2025-12-31T23:59:59Z',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/orders/search', {
        params: expect.objectContaining({
          'order.date_created.from': '2025-01-01T00:00:00Z',
          'order.date_created.to': '2025-12-31T23:59:59Z',
        }),
      });
    });

    it('Given: API error When: listing orders Then: should throw error', async () => {
      const connection = createMockConnection();
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error') as any);

      await expect(client.listOrders(connection, {})).rejects.toThrow('API Error');
    });
  });

  describe('getShipping', () => {
    it('Given: valid shipping ID When: fetching Then: should return shipment data', async () => {
      const connection = createMockConnection();
      const mockShipment = {
        id: 99999,
        status: 'delivered',
        receiver_address: {
          street_name: 'Av. Corrientes',
          street_number: '1234',
          city: { name: 'Buenos Aires' },
          state: { name: 'Buenos Aires' },
          country: { name: 'Argentina' },
          zip_code: '1000',
        },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockShipment } as any);

      const result = await client.getShipping(connection, '99999');

      expect(result).toEqual(mockShipment);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/shipments/99999');
    });

    it('Given: API error When: fetching shipping Then: should throw error', async () => {
      const connection = createMockConnection();
      mockAxiosInstance.get.mockRejectedValue(new Error('Shipment not found') as any);

      await expect(client.getShipping(connection, '99999')).rejects.toThrow('Shipment not found');
    });
  });
});
