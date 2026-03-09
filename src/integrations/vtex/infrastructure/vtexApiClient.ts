import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

import type { AxiosInstance } from 'axios';
import type {
  VtexOrderDetail,
  VtexOrderListResponse,
  VtexInvoiceData,
} from '../dto/vtex-api.types.js';

@Injectable()
export class VtexApiClient {
  private readonly logger = new Logger(VtexApiClient.name);

  private createClient(accountName: string, appKey: string, appToken: string): AxiosInstance {
    return axios.create({
      baseURL: `https://${accountName}.vtexcommercestable.com.br`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-VTEX-API-AppKey': appKey,
        'X-VTEX-API-AppToken': appToken,
      },
      timeout: 30000,
    });
  }

  async ping(accountName: string, appKey: string, appToken: string): Promise<boolean> {
    try {
      const client = this.createClient(accountName, appKey, appToken);
      const response = await client.get('/api/oms/pvt/orders?per_page=1&page=1');
      return response.status === 200;
    } catch (error) {
      this.logger.error(
        `VTEX ping failed for ${accountName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  async getOrder(
    accountName: string,
    appKey: string,
    appToken: string,
    orderId: string
  ): Promise<VtexOrderDetail> {
    try {
      const client = this.createClient(accountName, appKey, appToken);
      const response = await client.get<VtexOrderDetail>(`/api/oms/pvt/orders/${orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error fetching VTEX order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async listOrders(
    accountName: string,
    appKey: string,
    appToken: string,
    params: { page?: number; perPage?: number; creationDate?: string; orderBy?: string }
  ): Promise<VtexOrderListResponse> {
    try {
      const client = this.createClient(accountName, appKey, appToken);
      const queryParams: Record<string, string | number> = {
        page: params.page || 1,
        per_page: params.perPage || 50,
      };
      if (params.creationDate) queryParams.f_creationDate = params.creationDate;
      if (params.orderBy) queryParams.orderBy = params.orderBy;

      const response = await client.get<VtexOrderListResponse>('/api/oms/pvt/orders', {
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error listing VTEX orders: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async registerWebhook(
    accountName: string,
    appKey: string,
    appToken: string,
    hookUrl: string
  ): Promise<void> {
    try {
      const client = this.createClient(accountName, appKey, appToken);
      await client.post('/api/orders/hook/config', {
        filter: {
          status: ['order-completed', 'handling', 'invoiced', 'canceled'],
        },
        hook: {
          url: hookUrl,
          headers: {},
        },
      });
      this.logger.log(`Webhook registered for ${accountName}: ${hookUrl}`);
    } catch (error) {
      this.logger.error(
        `Error registering VTEX webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async startHandling(
    accountName: string,
    appKey: string,
    appToken: string,
    orderId: string
  ): Promise<void> {
    try {
      const client = this.createClient(accountName, appKey, appToken);
      await client.post(`/api/oms/pvt/orders/${orderId}/start-handling`);
      this.logger.log(`Started handling VTEX order ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Error starting handling: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async sendInvoice(
    accountName: string,
    appKey: string,
    appToken: string,
    orderId: string,
    invoice: VtexInvoiceData
  ): Promise<void> {
    try {
      const client = this.createClient(accountName, appKey, appToken);
      await client.post(`/api/oms/pvt/orders/${orderId}/invoice`, invoice);
      this.logger.log(`Invoice sent for VTEX order ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Error sending invoice: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async cancelOrder(
    accountName: string,
    appKey: string,
    appToken: string,
    orderId: string,
    reason: string
  ): Promise<void> {
    try {
      const client = this.createClient(accountName, appKey, appToken);
      await client.post(`/api/oms/pvt/orders/${orderId}/cancel`, { reason });
      this.logger.log(`VTEX order ${orderId} cancelled`);
    } catch (error) {
      this.logger.error(
        `Error cancelling order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }
}
