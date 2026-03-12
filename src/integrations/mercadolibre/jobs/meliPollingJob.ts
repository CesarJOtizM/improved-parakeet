import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MeliPollOrdersUseCase } from '../application/meliPollOrdersUseCase.js';

import type { IIntegrationConnectionRepository } from '../../shared/domain/ports/iIntegrationConnectionRepository.port.js';

@Injectable()
export class MeliPollingJob {
  private readonly logger = new Logger(MeliPollingJob.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly meliPollOrdersUseCase: MeliPollOrdersUseCase
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async pollOrders(): Promise<void> {
    try {
      const connections = await this.connectionRepository.findAllConnectedForPolling();
      const meliConnections = connections.filter(c => c.provider === 'MERCADOLIBRE');

      if (meliConnections.length === 0) {
        return;
      }

      this.logger.log(`Starting MeLi order polling for ${meliConnections.length} connection(s)...`);

      const result = await this.meliPollOrdersUseCase.execute({});

      result.match(
        value => {
          if (value.data.polled > 0) {
            this.logger.log('MeLi polling completed', {
              polled: value.data.polled,
              synced: value.data.synced,
              failed: value.data.failed,
            });
          } else {
            this.logger.debug('MeLi polling completed. No orders to sync.');
          }
        },
        error => {
          this.logger.error('MeLi polling failed', {
            error: error.message,
            code: error.code,
          });
        }
      );
    } catch (error) {
      this.logger.error('Error during MeLi polling job:', error);
    }
  }
}
