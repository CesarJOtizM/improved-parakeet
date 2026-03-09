import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@auth/authentication.module';
import { IntegrationsModule } from '../../../integrations/integrations.module.js';
import { InventoryModule } from '@inventory/inventory.module';
import { SalesModule } from '@sales/sales.module';
import { IntegrationsController } from './integrations.controller.js';
import { VtexWebhookController } from './vtex-webhook.controller.js';

@Module({
  imports: [AuthenticationModule, IntegrationsModule, InventoryModule, SalesModule],
  controllers: [IntegrationsController, VtexWebhookController],
})
export class IntegrationsHttpModule {}
