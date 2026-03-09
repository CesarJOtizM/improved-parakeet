import { VtexApiClient } from '../../../src/integrations/vtex/infrastructure/vtexApiClient';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VtexApiClient', () => {
  let client: VtexApiClient;
  let mockAxiosInstance: { get: jest.Mock; post: jest.Mock };

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
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const result = await client.ping('teststore', 'key', 'token');

      expect(result).toBe(true);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://teststore.vtexcommercestable.com.br',
        })
      );
    });

    it('Given: invalid credentials When: pinging Then: should return false on error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Unauthorized'));

      const result = await client.ping('teststore', 'bad-key', 'bad-token');

      expect(result).toBe(false);
    });
  });

  describe('getOrder', () => {
    it('Given: valid order ID When: fetching Then: should return order detail', async () => {
      const mockOrder = { orderId: 'ORD-123', status: 'handling' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockOrder });

      const result = await client.getOrder('teststore', 'key', 'token', 'ORD-123');

      expect(result).toEqual(mockOrder);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/oms/pvt/orders/ORD-123');
    });

    it('Given: API error When: fetching order Then: should throw error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Not Found'));

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
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await client.listOrders('teststore', 'key', 'token', { page: 1 });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('startHandling', () => {
    it('Given: valid order ID When: starting handling Then: should call API', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });

      await client.startHandling('teststore', 'key', 'token', 'ORD-123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/oms/pvt/orders/ORD-123/start-handling'
      );
    });
  });

  describe('cancelOrder', () => {
    it('Given: valid order ID When: cancelling Then: should call API with reason', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });

      await client.cancelOrder('teststore', 'key', 'token', 'ORD-123', 'Customer request');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/oms/pvt/orders/ORD-123/cancel', {
        reason: 'Customer request',
      });
    });
  });
});
