import {
  Inject,
  Controller,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { VtexSyncOrderUseCase } from '@integrations/vtex/application/vtexSyncOrderUseCase';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

import type { IIntegrationConnectionRepository } from '@integrations/shared/domain/ports/iIntegrationConnectionRepository.port';
import type { VtexWebhookPayload } from '@integrations/vtex/dto/vtex-api.types';

@ApiTags('VTEX Webhook')
@Controller('vtex/webhook')
export class VtexWebhookController {
  private readonly logger = new Logger(VtexWebhookController.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly vtexSyncOrderUseCase: VtexSyncOrderUseCase
  ) {}

  @Post(':accountName')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'VTEX webhook endpoint (public)' })
  @ApiParam({ name: 'accountName', description: 'VTEX account name' })
  @ApiQuery({ name: 'secret', description: 'Webhook secret for authentication', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook processed successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid webhook secret' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Connection not found' })
  async handleWebhook(
    @Param('accountName') accountName: string,
    @Query('secret') secret: string,
    @Body() payload: VtexWebhookPayload
  ) {
    this.logger.log('Received VTEX webhook', {
      accountName,
      orderId: payload.OrderId,
      state: payload.State,
    });

    // Find connection by accountName (global lookup - webhook is public, no orgId from auth)
    const connection = await this.connectionRepository.findByProviderAndAccountGlobal(
      'VTEX',
      accountName
    );

    if (!connection) {
      this.logger.warn('No connection found for VTEX account', { accountName });
      return { success: false, message: 'Connection not found' };
    }

    // Validate webhook secret
    if (connection.webhookSecret !== secret) {
      this.logger.warn('Invalid webhook secret', { accountName });
      return { success: false, message: 'Unauthorized' };
    }

    // Only process relevant states
    const relevantStates = [
      'payment-approved',
      'order-completed',
      'ready-for-handling',
      'handling',
      'invoiced',
      'canceled',
    ];
    if (!relevantStates.includes(payload.State)) {
      this.logger.debug('Ignoring webhook for state', { state: payload.State });
      return { success: true, message: 'State ignored' };
    }

    // Process the order
    const result = await this.vtexSyncOrderUseCase.execute({
      connectionId: connection.id,
      externalOrderId: payload.OrderId,
      orgId: connection.orgId,
    });

    return resultToHttpResponse(result);
  }
}
