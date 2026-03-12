import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@auth/authentication.module';
import { IntegrationsModule } from '@integrations/integrations.module';
import { InventoryModule } from '@inventory/inventory.module';
import { SalesModule } from '@sales/sales.module';
import { IntegrationsController } from './integrations.controller.js';
import { VtexWebhookController } from './vtex-webhook.controller.js';
import { MeliOAuthController } from './meli-oauth.controller.js';
import { MeliWebhookController } from './meli-webhook.controller.js';

@Module({
  imports: [AuthenticationModule, IntegrationsModule, InventoryModule, SalesModule],
  controllers: [
    IntegrationsController,
    VtexWebhookController,
    MeliOAuthController,
    MeliWebhookController,
  ],
})
export class IntegrationsHttpModule {}
