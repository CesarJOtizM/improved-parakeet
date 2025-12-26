import { SaleCancelledEventHandler } from '@application/eventHandlers/saleCancelledEventHandler';
import { SaleConfirmedEventHandler } from '@application/eventHandlers/saleConfirmedEventHandler';
import { SaleCreatedEventHandler } from '@application/eventHandlers/saleCreatedEventHandler';
import { AuthenticationModule } from '@auth/authentication.module';
import { Module, OnModuleInit } from '@nestjs/common';
import { SalesModule } from '@sales/sales.module';
import { DomainEventBus } from '@shared/domain/events/domainEventBus.service';

import { SalesController } from './sales.controller';

@Module({
  imports: [AuthenticationModule, SalesModule],
  controllers: [SalesController],
  providers: [SaleCreatedEventHandler, SaleConfirmedEventHandler, SaleCancelledEventHandler],
})
export class SalesHttpModule implements OnModuleInit {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly saleCreatedHandler: SaleCreatedEventHandler,
    private readonly saleConfirmedHandler: SaleConfirmedEventHandler,
    private readonly saleCancelledHandler: SaleCancelledEventHandler
  ) {}

  onModuleInit() {
    // Register sale event handlers
    this.eventBus.registerHandler('SaleCreated', this.saleCreatedHandler);
    this.eventBus.registerHandler('SaleConfirmed', this.saleConfirmedHandler);
    this.eventBus.registerHandler('SaleCancelled', this.saleCancelledHandler);
  }
}
