import { LocationAddedEventHandler } from '@application/eventHandlers/locationAddedEventHandler';
import { LowStockAlertEventHandler } from '@application/eventHandlers/lowStockAlertEventHandler';
import { MovementPostedAuditHandler } from '@application/eventHandlers/movementPostedAuditHandler';
import { MovementPostedEventHandler } from '@application/eventHandlers/movementPostedEventHandler';
import { MovementVoidedAuditHandler } from '@application/eventHandlers/movementVoidedAuditHandler';
import { ProductCreatedEventHandler } from '@application/eventHandlers/productCreatedEventHandler';
import { ProductUpdatedEventHandler } from '@application/eventHandlers/productUpdatedEventHandler';
import { StockThresholdExceededEventHandler } from '@application/eventHandlers/stockThresholdExceededEventHandler';
import { TransferInitiatedAuditHandler } from '@application/eventHandlers/transferInitiatedAuditHandler';
import { TransferReceivedAuditHandler } from '@application/eventHandlers/transferReceivedAuditHandler';
import { TransferRejectedAuditHandler } from '@application/eventHandlers/transferRejectedAuditHandler';
import { WarehouseCreatedEventHandler } from '@application/eventHandlers/warehouseCreatedEventHandler';
import { CreateMovementUseCase } from '@application/movementUseCases/createMovementUseCase';
import { GetMovementsUseCase } from '@application/movementUseCases/getMovementsUseCase';
import { PostMovementUseCase } from '@application/movementUseCases/postMovementUseCase';
import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { GetProductByIdUseCase } from '@application/productUseCases/getProductByIdUseCase';
import { GetProductsUseCase } from '@application/productUseCases/getProductsUseCase';
import { UpdateProductUseCase } from '@application/productUseCases/updateProductUseCase';
import { GetTransfersUseCase } from '@application/transferUseCases/getTransfersUseCase';
import { InitiateTransferUseCase } from '@application/transferUseCases/initiateTransferUseCase';
import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { GetWarehousesUseCase } from '@application/warehouseUseCases/getWarehousesUseCase';
import { AuthenticationModule } from '@auth/authentication.module';
import {
  PrismaMovementRepository,
  PrismaProductRepository,
  PrismaReorderRuleRepository,
  PrismaTransferRepository,
  PrismaWarehouseRepository,
} from '@infrastructure/database/repositories';
import { NotificationService } from '@infrastructure/externalServices/notificationService';
import { StockValidationJob } from '@infrastructure/jobs/stockValidationJob';
import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DomainEventBus } from '@shared/domain/events/domainEventBus.service';

@Module({
  imports: [
    AuthenticationModule, // Import to get access to DomainEventBus and EmailService
    ScheduleModule.forRoot(), // Import for scheduled jobs
  ],
  providers: [
    // Repositories
    {
      provide: 'ProductRepository',
      useClass: PrismaProductRepository,
    },
    {
      provide: 'WarehouseRepository',
      useClass: PrismaWarehouseRepository,
    },
    {
      provide: 'MovementRepository',
      useClass: PrismaMovementRepository,
    },
    {
      provide: 'TransferRepository',
      useClass: PrismaTransferRepository,
    },
    {
      provide: 'ReorderRuleRepository',
      useClass: PrismaReorderRuleRepository,
    },
    // Product Use Cases
    CreateProductUseCase,
    GetProductsUseCase,
    GetProductByIdUseCase,
    UpdateProductUseCase,
    // Warehouse Use Cases
    CreateWarehouseUseCase,
    GetWarehousesUseCase,
    // Movement Use Cases
    CreateMovementUseCase,
    GetMovementsUseCase,
    PostMovementUseCase,
    // Transfer Use Cases
    InitiateTransferUseCase,
    GetTransfersUseCase,
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
    // Alert event handlers
    LowStockAlertEventHandler,
    StockThresholdExceededEventHandler,
    // Infrastructure services
    NotificationService,
    // Scheduled jobs
    StockValidationJob,
  ],
  exports: [
    // Export use cases for controllers
    CreateProductUseCase,
    GetProductsUseCase,
    GetProductByIdUseCase,
    UpdateProductUseCase,
    CreateWarehouseUseCase,
    GetWarehousesUseCase,
    CreateMovementUseCase,
    GetMovementsUseCase,
    PostMovementUseCase,
    InitiateTransferUseCase,
    GetTransfersUseCase,
    // Export repositories for cross-module access (e.g., SalesModule)
    'ProductRepository',
    'WarehouseRepository',
    'MovementRepository',
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
    private readonly transferRejectedAuditHandler: TransferRejectedAuditHandler,
    private readonly lowStockAlertHandler: LowStockAlertEventHandler,
    private readonly stockThresholdExceededHandler: StockThresholdExceededEventHandler
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
    // Register alert event handlers
    this.eventBus.registerHandler('LowStockAlert', this.lowStockAlertHandler);
    this.eventBus.registerHandler('StockThresholdExceeded', this.stockThresholdExceededHandler);
  }
}
