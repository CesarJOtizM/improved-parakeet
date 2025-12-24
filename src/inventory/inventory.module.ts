import { LocationAddedEventHandler } from '@application/eventHandlers/locationAddedEventHandler';
import { MovementPostedAuditHandler } from '@application/eventHandlers/movementPostedAuditHandler';
import { MovementPostedEventHandler } from '@application/eventHandlers/movementPostedEventHandler';
import { MovementVoidedAuditHandler } from '@application/eventHandlers/movementVoidedAuditHandler';
import { ProductCreatedEventHandler } from '@application/eventHandlers/productCreatedEventHandler';
import { ProductUpdatedEventHandler } from '@application/eventHandlers/productUpdatedEventHandler';
import { TransferInitiatedAuditHandler } from '@application/eventHandlers/transferInitiatedAuditHandler';
import { TransferReceivedAuditHandler } from '@application/eventHandlers/transferReceivedAuditHandler';
import { TransferRejectedAuditHandler } from '@application/eventHandlers/transferRejectedAuditHandler';
import { WarehouseCreatedEventHandler } from '@application/eventHandlers/warehouseCreatedEventHandler';
import { AuthenticationModule } from '@auth/authentication.module';
import { Module, OnModuleInit } from '@nestjs/common';
import { DomainEventBus } from '@shared/domain/events/domainEventBus.service';

@Module({
  imports: [AuthenticationModule], // Import to get access to DomainEventBus
  providers: [
    // Event Handlers
    ProductCreatedEventHandler,
    ProductUpdatedEventHandler,
    WarehouseCreatedEventHandler,
    LocationAddedEventHandler,
    // Movement event handlers
    MovementPostedEventHandler,
    MovementPostedAuditHandler,
    MovementVoidedAuditHandler,
    // Transfer event handlers
    TransferInitiatedAuditHandler,
    TransferReceivedAuditHandler,
    TransferRejectedAuditHandler,
  ],
})
export class InventoryModule implements OnModuleInit {
  constructor(
    private readonly eventBus: DomainEventBus,
    private readonly productCreatedHandler: ProductCreatedEventHandler,
    private readonly productUpdatedHandler: ProductUpdatedEventHandler,
    private readonly warehouseCreatedHandler: WarehouseCreatedEventHandler,
    private readonly locationAddedHandler: LocationAddedEventHandler,
    private readonly movementPostedHandler: MovementPostedEventHandler,
    private readonly movementPostedAuditHandler: MovementPostedAuditHandler,
    private readonly movementVoidedAuditHandler: MovementVoidedAuditHandler,
    private readonly transferInitiatedAuditHandler: TransferInitiatedAuditHandler,
    private readonly transferReceivedAuditHandler: TransferReceivedAuditHandler,
    private readonly transferRejectedAuditHandler: TransferRejectedAuditHandler
  ) {}

  onModuleInit() {
    // Register event handlers
    this.eventBus.registerHandler('ProductCreated', this.productCreatedHandler);
    this.eventBus.registerHandler('ProductUpdated', this.productUpdatedHandler);
    this.eventBus.registerHandler('WarehouseCreated', this.warehouseCreatedHandler);
    this.eventBus.registerHandler('LocationAdded', this.locationAddedHandler);
    // Register movement event handlers
    this.eventBus.registerHandler('MovementPosted', this.movementPostedHandler);
    this.eventBus.registerHandler('MovementPosted', this.movementPostedAuditHandler);
    this.eventBus.registerHandler('MovementVoided', this.movementVoidedAuditHandler);
    // Register transfer event handlers
    this.eventBus.registerHandler('TransferInitiated', this.transferInitiatedAuditHandler);
    this.eventBus.registerHandler('TransferReceived', this.transferReceivedAuditHandler);
    this.eventBus.registerHandler('TransferRejected', this.transferRejectedAuditHandler);
  }
}
