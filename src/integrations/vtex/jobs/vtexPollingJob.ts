import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VtexPollOrdersUseCase } from '../application/vtexPollOrdersUseCase.js';

@Injectable()
export class VtexPollingJob {
  private readonly logger = new Logger(VtexPollingJob.name);

  constructor(private readonly vtexPollOrdersUseCase: VtexPollOrdersUseCase) {}

  /**
   * Polls VTEX orders for all connected integrations
   * Runs every 10 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async pollOrders(): Promise<void> {
    try {
      this.logger.log('Starting VTEX order polling job...');

      const result = await this.vtexPollOrdersUseCase.execute({});

      result.match(
        value => {
          if (value.data.polled > 0) {
            this.logger.log('VTEX polling completed', {
              polled: value.data.polled,
              synced: value.data.synced,
              failed: value.data.failed,
            });
          } else {
            this.logger.debug('VTEX polling completed. No orders to sync.');
          }
        },
        error => {
          this.logger.error('VTEX polling failed', {
            error: error.message,
            code: error.code,
          });
        }
      );
    } catch (error) {
      this.logger.error('Error during VTEX polling job:', error);
    }
  }
}
