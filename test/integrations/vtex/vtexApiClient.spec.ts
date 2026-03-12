import { VtexApiClient } from '../../../src/integrations/vtex/infrastructure/vtexApiClient';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VtexApiClient', () => {
  let client: VtexApiClient;
  let mockAxiosInstance: { get: jest.Mock<any>; post: jest.Mock<any> };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new VtexApiClient();

    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
  });

  describe('ping', () => {
    it('Given: valid credentials When: pinging Then: should return true on 200 response', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 } as any);

      const result = await client.ping('teststore', 'key', 'token');

      expect(result).toBe(true);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://teststore.vtexcommercestable.com.br',
        })
      );
    });

    it('Given: invalid credentials When: pinging Then: should return false on error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Unauthorized') as any);

      const result = await client.ping('teststore', 'bad-key', 'bad-token');

      expect(result).toBe(false);
    });
  });

  describe('getOrder', () => {
    it('Given: valid order ID When: fetching Then: should return order detail', async () => {
      const mockOrder = { orderId: 'ORD-123', status: 'handling' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockOrder } as any);

      const result = await client.getOrder('teststore', 'key', 'token', 'ORD-123');

      expect(result).toEqual(mockOrder);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/oms/pvt/orders/ORD-123');
    });

    it('Given: API error When: fetching order Then: should throw error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Not Found') as any);

      await expect(client.getOrder('teststore', 'key', 'token', 'ORD-999')).rejects.toThrow(
        'Not Found'
      );
    });
  });

  describe('listOrders', () => {
    it('Given: valid params When: listing orders Then: should return order list', async () => {
      const mockResponse = {
        list: [],
        paging: { total: 0, pages: 0, currentPage: 1, perPage: 50 },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse } as any);

      const result = await client.listOrders('teststore', 'key', 'token', { page: 1 });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('startHandling', () => {
    it('Given: valid order ID When: starting handling Then: should call API', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200 } as any);

      await client.startHandling('teststore', 'key', 'token', 'ORD-123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/oms/pvt/orders/ORD-123/start-handling'
      );
    });
  });

  describe('cancelOrder', () => {
    it('Given: valid order ID When: cancelling Then: should call API with reason', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200 } as any);

      await client.cancelOrder('teststore', 'key', 'token', 'ORD-123', 'Customer request');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/oms/pvt/orders/ORD-123/cancel', {
        reason: 'Customer request',
      });
    });

    it('Given: API error When: cancelling order Then: should throw error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Cancel failed') as any);

      await expect(
        client.cancelOrder('teststore', 'key', 'token', 'ORD-123', 'reason')
      ).rejects.toThrow('Cancel failed');
    });
  });

  describe('listOrders - additional branches', () => {
    it('Given: no params When: listing orders Then: should use defaults (page=1, perPage=50)', async () => {
      const mockResponse = {
        list: [],
        paging: { total: 0, pages: 0, currentPage: 1, perPage: 50 },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse } as any);

      const result = await client.listOrders('teststore', 'key', 'token', {});

      expect(result).toEqual(mockResponse);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/oms/pvt/orders', {
        params: expect.objectContaining({
          page: 1,
          per_page: 50,
        }),
      });
    });

    it('Given: creationDate and orderBy params When: listing orders Then: should include them in query', async () => {
      const mockResponse = {
        list: [],
        paging: { total: 0, pages: 0, currentPage: 1, perPage: 10 },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse } as any);

      await client.listOrders('teststore', 'key', 'token', {
        page: 2,
        perPage: 10,
        creationDate: '2025-01-01T00:00:00Z TO 2025-12-31T23:59:59Z',
        orderBy: 'creationDate,desc',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/oms/pvt/orders', {
        params: expect.objectContaining({
          page: 2,
          per_page: 10,
          f_creationDate: '2025-01-01T00:00:00Z TO 2025-12-31T23:59:59Z',
          orderBy: 'creationDate,desc',
        }),
      });
    });

    it('Given: API error When: listing orders Then: should throw error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('List failed'));

      await expect(client.listOrders('teststore', 'key', 'token', { page: 1 })).rejects.toThrow(
        'List failed'
      );
    });
  });

  describe('registerWebhook', () => {
    it('Given: valid hookUrl When: registering webhook Then: should call API correctly', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200 } as any);

      await client.registerWebhook('teststore', 'key', 'token', 'https://example.com/hook');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/orders/hook/config', {
        filter: {
          status: ['order-completed', 'handling', 'invoiced', 'canceled'],
        },
        hook: {
          url: 'https://example.com/hook',
          headers: {},
        },
      });
    });

    it('Given: API error When: registering webhook Then: should throw error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Webhook registration failed'));

      await expect(
        client.registerWebhook('teststore', 'key', 'token', 'https://example.com/hook')
      ).rejects.toThrow('Webhook registration failed');
    });
  });

  describe('sendInvoice', () => {
    it('Given: valid invoice data When: sending invoice Then: should call API', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200 } as any);
      const invoiceData = {
        type: 'Output' as const,
        invoiceNumber: 'INV-001',
        invoiceValue: 10000,
        issuanceDate: '2025-01-01',
        invoiceUrl: 'https://example.com/inv',
        items: [{ id: 'item-1', quantity: 1, price: 10000 }],
      };

      await client.sendInvoice('teststore', 'key', 'token', 'ORD-123', invoiceData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/oms/pvt/orders/ORD-123/invoice',
        invoiceData
      );
    });

    it('Given: API error When: sending invoice Then: should throw error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Invoice failed'));

      await expect(
        client.sendInvoice('teststore', 'key', 'token', 'ORD-123', {} as any)
      ).rejects.toThrow('Invoice failed');
    });
  });

  describe('startHandling - error path', () => {
    it('Given: API error When: starting handling Then: should throw error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Start handling failed'));

      await expect(client.startHandling('teststore', 'key', 'token', 'ORD-123')).rejects.toThrow(
        'Start handling failed'
      );
    });
  });

  describe('createClient headers', () => {
    it('Given: different account When: creating client Then: should set correct baseURL and headers', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 } as any);

      await client.ping('myaccount', 'my-key', 'my-token');

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://myaccount.vtexcommercestable.com.br',
          timeout: 30000,
          headers: expect.objectContaining({
            'X-VTEX-API-AppKey': 'my-key',
            'X-VTEX-API-AppToken': 'my-token',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
        })
      );
    });
  });

  describe('ping - non-Error exception', () => {
    it('Given: non-Error thrown When: pinging Then: should return false', async () => {
      mockAxiosInstance.get.mockRejectedValue('not an error object');

      const result = await client.ping('teststore', 'key', 'token');

      expect(result).toBe(false);
    });
  });
});
