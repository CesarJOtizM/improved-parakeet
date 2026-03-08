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
import { DeleteMovementUseCase } from '@application/movementUseCases/deleteMovementUseCase';
import { GetMovementByIdUseCase } from '@application/movementUseCases/getMovementByIdUseCase';
import { GetMovementsUseCase } from '@application/movementUseCases/getMovementsUseCase';
import { MarkMovementReturnedUseCase } from '@application/movementUseCases/markMovementReturnedUseCase';
import { PostMovementUseCase } from '@application/movementUseCases/postMovementUseCase';
import { UpdateMovementUseCase } from '@application/movementUseCases/updateMovementUseCase';
import { VoidMovementUseCase } from '@application/movementUseCases/voidMovementUseCase';
import { CreateCategoryUseCase } from '@application/categoryUseCases/createCategoryUseCase';
import { DeleteCategoryUseCase } from '@application/categoryUseCases/deleteCategoryUseCase';
import { GetCategoriesUseCase } from '@application/categoryUseCases/getCategoriesUseCase';
import { GetCategoryByIdUseCase } from '@application/categoryUseCases/getCategoryByIdUseCase';
import { UpdateCategoryUseCase } from '@application/categoryUseCases/updateCategoryUseCase';
import { CreateCompanyUseCase } from '@application/companyUseCases/createCompanyUseCase';
import { DeleteCompanyUseCase } from '@application/companyUseCases/deleteCompanyUseCase';
import { GetCompaniesUseCase } from '@application/companyUseCases/getCompaniesUseCase';
import { GetCompanyByIdUseCase } from '@application/companyUseCases/getCompanyByIdUseCase';
import { UpdateCompanyUseCase } from '@application/companyUseCases/updateCompanyUseCase';
import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { GetProductByIdUseCase } from '@application/productUseCases/getProductByIdUseCase';
import { GetProductsUseCase } from '@application/productUseCases/getProductsUseCase';
import { UpdateProductUseCase } from '@application/productUseCases/updateProductUseCase';
import { CreateReorderRuleUseCase } from '@application/reorderRuleUseCases/createReorderRuleUseCase';
import { DeleteReorderRuleUseCase } from '@application/reorderRuleUseCases/deleteReorderRuleUseCase';
import { GetReorderRulesUseCase } from '@application/reorderRuleUseCases/getReorderRulesUseCase';
import { UpdateReorderRuleUseCase } from '@application/reorderRuleUseCases/updateReorderRuleUseCase';
import { GetStockUseCase } from '@application/stockUseCases/getStockUseCase';
import { CancelTransferUseCase } from '@application/transferUseCases/cancelTransferUseCase';
import { ConfirmTransferUseCase } from '@application/transferUseCases/confirmTransferUseCase';
import { GetTransferByIdUseCase } from '@application/transferUseCases/getTransferByIdUseCase';
import { GetTransfersUseCase } from '@application/transferUseCases/getTransfersUseCase';
import { InitiateTransferUseCase } from '@application/transferUseCases/initiateTransferUseCase';
import { ReceiveTransferUseCase } from '@application/transferUseCases/receiveTransferUseCase';
import { RejectTransferUseCase } from '@application/transferUseCases/rejectTransferUseCase';
import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { GetWarehouseByIdUseCase } from '@application/warehouseUseCases/getWarehouseByIdUseCase';
import { GetWarehousesUseCase } from '@application/warehouseUseCases/getWarehousesUseCase';
import { UpdateWarehouseUseCase } from '@application/warehouseUseCases/updateWarehouseUseCase';
import { AuthenticationModule } from '@auth/authentication.module';
import { ContactsModule } from '@contacts/contacts.module';
import {
  PrismaCategoryRepository,
  PrismaCompanyRepository,
  PrismaLocationRepository,
  PrismaMovementRepository,
  PrismaProductRepository,
  PrismaReorderRuleRepository,
  PrismaStockRepository,
  PrismaTransferRepository,
  PrismaWarehouseRepository,
} from '@infrastructure/database/repositories';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { NotificationService } from '@infrastructure/externalServices/notificationService';
import { StockValidationJob } from '@infrastructure/jobs/stockValidationJob';
import { CacheModule } from '@nestjs/cache-manager';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { OrganizationModule } from '@organization/organization.module';
import { DomainEventBus } from '@shared/domain/events/domainEventBus.service';
import { createCacheModuleOptions, FunctionalCacheService } from '@shared/infrastructure/cache';

@Module({
  imports: [
    AuthenticationModule, // Import AuthenticationModule to access DomainEventDispatcher and DomainEventBus
    OrganizationModule, // Import OrganizationModule to access OrganizationRepository
    ContactsModule, // Import ContactsModule to access ContactRepository (for movement-contact association)
    ScheduleModule.forRoot(), // Import for scheduled jobs
    ConfigModule,
    CacheModule.registerAsync(createCacheModuleOptions()),
  ],
  providers: [
    // Repositories
    {
      provide: 'CategoryRepository',
      useClass: PrismaCategoryRepository,
    },
    {
      provide: 'CompanyRepository',
      useClass: PrismaCompanyRepository,
    },
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
    {
      provide: 'StockRepository',
      useClass: PrismaStockRepository,
    },
    {
      provide: 'LocationRepository',
      useClass: PrismaLocationRepository,
    },
    // Category Use Cases
    GetCategoriesUseCase,
    GetCategoryByIdUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    // Company Use Cases
    GetCompaniesUseCase,
    GetCompanyByIdUseCase,
    CreateCompanyUseCase,
    UpdateCompanyUseCase,
    DeleteCompanyUseCase,
    // Product Use Cases
    CreateProductUseCase,
    GetProductsUseCase,
    GetProductByIdUseCase,
    UpdateProductUseCase,
    // Warehouse Use Cases
    CreateWarehouseUseCase,
    GetWarehousesUseCase,
    GetWarehouseByIdUseCase,
    UpdateWarehouseUseCase,
    // Movement Use Cases
    CreateMovementUseCase,
    GetMovementsUseCase,
    GetMovementByIdUseCase,
    PostMovementUseCase,
    UpdateMovementUseCase,
    DeleteMovementUseCase,
    VoidMovementUseCase,
    MarkMovementReturnedUseCase,
    // Stock Use Cases
    GetStockUseCase,
    // Reorder Rule Use Cases
    GetReorderRulesUseCase,
    CreateReorderRuleUseCase,
    UpdateReorderRuleUseCase,
    DeleteReorderRuleUseCase,
    // Transfer Use Cases
    InitiateTransferUseCase,
    GetTransfersUseCase,
    GetTransferByIdUseCase,
    ConfirmTransferUseCase,
    ReceiveTransferUseCase,
    RejectTransferUseCase,
    CancelTransferUseCase,
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
    PrismaService,
    NotificationService,
    // Cache service
    {
      provide: 'CacheService',
      useClass: FunctionalCacheService,
    },
    // Scheduled jobs
    StockValidationJob,
  ],
  exports: [
    // Export use cases for controllers
    GetCategoriesUseCase,
    GetCategoryByIdUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    GetCompaniesUseCase,
    GetCompanyByIdUseCase,
    CreateCompanyUseCase,
    UpdateCompanyUseCase,
    DeleteCompanyUseCase,
    CreateProductUseCase,
    GetProductsUseCase,
    GetProductByIdUseCase,
    UpdateProductUseCase,
    CreateWarehouseUseCase,
    GetWarehousesUseCase,
    GetWarehouseByIdUseCase,
    UpdateWarehouseUseCase,
    CreateMovementUseCase,
    GetMovementsUseCase,
    GetMovementByIdUseCase,
    PostMovementUseCase,
    UpdateMovementUseCase,
    DeleteMovementUseCase,
    VoidMovementUseCase,
    MarkMovementReturnedUseCase,
    GetStockUseCase,
    GetReorderRulesUseCase,
    CreateReorderRuleUseCase,
    UpdateReorderRuleUseCase,
    DeleteReorderRuleUseCase,
    InitiateTransferUseCase,
    GetTransfersUseCase,
    GetTransferByIdUseCase,
    ConfirmTransferUseCase,
    ReceiveTransferUseCase,
    RejectTransferUseCase,
    CancelTransferUseCase,
    // Export repositories for cross-module access (e.g., SalesModule, ImportModule)
    'ProductRepository',
    'WarehouseRepository',
    'MovementRepository',
    'StockRepository',
    'LocationRepository',
    'CompanyRepository',
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
