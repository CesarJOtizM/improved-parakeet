import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MeliTokenService } from './meliTokenService.js';
import { IntegrationConnection } from '../../shared/domain/entities/integrationConnection.entity.js';

import type {
  MeliOrderDetail,
  MeliOrderSearchResponse,
  MeliShipmentDetail,
  MeliUserResponse,
} from '../dto/meli-api.types.js';

const MELI_API_BASE = 'https://api.mercadolibre.com';

@Injectable()
export class MeliApiClient {
  private readonly logger = new Logger(MeliApiClient.name);

  constructor(private readonly tokenService: MeliTokenService) {}

  private async createAuthenticatedClient(connection: IntegrationConnection) {
    const accessToken = await this.tokenService.getValidAccessToken(connection);
    return axios.create({
      baseURL: MELI_API_BASE,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 30000,
    });
  }

  async ping(connection: IntegrationConnection): Promise<boolean> {
    try {
      const client = await this.createAuthenticatedClient(connection);
      const response = await client.get<MeliUserResponse>('/users/me');
      return response.status === 200 && !!response.data.id;
    } catch (error) {
      this.logger.error(
        `MeLi ping failed for connection ${connection.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  async getOrder(connection: IntegrationConnection, orderId: string): Promise<MeliOrderDetail> {
    try {
      const client = await this.createAuthenticatedClient(connection);
      const response = await client.get<MeliOrderDetail>(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error fetching MeLi order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async listOrders(
    connection: IntegrationConnection,
    params: {
      sort?: string;
      order?: string;
      dateFrom?: string;
      dateTo?: string;
      offset?: number;
      limit?: number;
    }
  ): Promise<MeliOrderSearchResponse> {
    try {
      const client = await this.createAuthenticatedClient(connection);
      const sellerId = connection.meliUserId;

      const queryParams: Record<string, string | number> = {
        seller: sellerId || '',
        sort: params.sort || 'date_desc',
        limit: params.limit || 50,
        offset: params.offset || 0,
      };

      if (params.dateFrom) {
        queryParams['order.date_created.from'] = params.dateFrom;
      }
      if (params.dateTo) {
        queryParams['order.date_created.to'] = params.dateTo;
      }

      const response = await client.get<MeliOrderSearchResponse>('/orders/search', {
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error listing MeLi orders: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  async getShipping(
    connection: IntegrationConnection,
    shippingId: string
  ): Promise<MeliShipmentDetail> {
    try {
      const client = await this.createAuthenticatedClient(connection);
      const response = await client.get<MeliShipmentDetail>(`/shipments/${shippingId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error fetching MeLi shipping ${shippingId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }
}
