import { Inject, Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MeliSyncOrderUseCase } from '../../../integrations/mercadolibre/application/meliSyncOrderUseCase.js';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

import type { IIntegrationConnectionRepository } from '../../../integrations/shared/domain/ports/iIntegrationConnectionRepository.port.js';
import type { MeliNotificationPayload } from '../../../integrations/mercadolibre/dto/meli-api.types.js';

@ApiTags('MercadoLibre Webhook')
@Controller('integrations/meli/webhook')
export class MeliWebhookController {
  private readonly logger = new Logger(MeliWebhookController.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly meliSyncOrderUseCase: MeliSyncOrderUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MercadoLibre webhook endpoint (public)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook processed' })
  async handleWebhook(@Body() payload: MeliNotificationPayload) {
    this.logger.log('Received MeLi webhook', {
      topic: payload.topic,
      userId: payload.user_id,
      resource: payload.resource,
    });

    // Only process order-related topics
    const orderTopics = ['orders_v2', 'marketplace_orders'];
    if (!orderTopics.includes(payload.topic)) {
      this.logger.debug('Ignoring non-order webhook topic', { topic: payload.topic });
      return { success: true, message: 'Topic ignored' };
    }

    // Extract order ID from resource path (e.g., "/orders/12345" → "12345")
    const orderIdMatch = payload.resource.match(/\/orders\/(\d+)/);
    if (!orderIdMatch) {
      this.logger.warn('Could not extract order ID from resource', {
        resource: payload.resource,
      });
      return { success: false, message: 'Invalid resource format' };
    }
    const orderId = orderIdMatch[1];

    // Find connection by MeLi user ID (global lookup - webhook is public)
    const connection = await this.connectionRepository.findByMeliUserId(String(payload.user_id));

    if (!connection) {
      this.logger.warn('No connection found for MeLi user', { userId: payload.user_id });
      return { success: false, message: 'Connection not found' };
    }

    // Process the order
    const result = await this.meliSyncOrderUseCase.execute({
      connectionId: connection.id,
      externalOrderId: orderId,
      orgId: connection.orgId,
    });

    return resultToHttpResponse(result);
  }
}
