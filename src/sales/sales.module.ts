import { AddSaleLineUseCase } from '@application/saleUseCases/addSaleLineUseCase';
import { CancelSaleUseCase } from '@application/saleUseCases/cancelSaleUseCase';
import { CompleteSaleUseCase } from '@application/saleUseCases/completeSaleUseCase';
import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
import { MarkSaleReturnedUseCase } from '@application/saleUseCases/markSaleReturnedUseCase';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { GetSaleByIdUseCase } from '@application/saleUseCases/getSaleByIdUseCase';
import { GetSaleMovementUseCase } from '@application/saleUseCases/getSaleMovementUseCase';
import { GetSalesUseCase } from '@application/saleUseCases/getSalesUseCase';
import { RemoveSaleLineUseCase } from '@application/saleUseCases/removeSaleLineUseCase';
import { ShipSaleUseCase } from '@application/saleUseCases/shipSaleUseCase';
import { StartPickingSaleUseCase } from '@application/saleUseCases/startPickingSaleUseCase';
import { SwapSaleLineUseCase } from '@application/saleUseCases/swapSaleLineUseCase';
import { UpdateSaleUseCase } from '@application/saleUseCases/updateSaleUseCase';
import { AuthenticationModule } from '@auth/authentication.module';
import { PrismaSaleRepository } from '@infrastructure/database/repositories/sale.repository';
import { InventoryModule } from '@inventory/inventory.module';
import { Module } from '@nestjs/common';
import { OrganizationModule } from '@organization/organization.module';

@Module({
  imports: [
    AuthenticationModule, // Import AuthenticationModule to access DomainEventDispatcher
    InventoryModule, // Import InventoryModule to access MovementRepository, StockRepository, ProductRepository, WarehouseRepository
    OrganizationModule, // Import OrganizationModule to access OrganizationRepository (for picking/shipping validation)
  ],
  providers: [
    // Repository
    {
      provide: 'SaleRepository',
      useClass: PrismaSaleRepository,
    },
    // Sale Use Cases
    CreateSaleUseCase,
    GetSalesUseCase,
    GetSaleByIdUseCase,
    UpdateSaleUseCase,
    ConfirmSaleUseCase,
    CancelSaleUseCase,
    AddSaleLineUseCase,
    RemoveSaleLineUseCase,
    GetSaleMovementUseCase,
    StartPickingSaleUseCase,
    ShipSaleUseCase,
    CompleteSaleUseCase,
    MarkSaleReturnedUseCase,
    SwapSaleLineUseCase,
  ],
  exports: [
    // Export use cases for controller
    CreateSaleUseCase,
    GetSalesUseCase,
    GetSaleByIdUseCase,
    UpdateSaleUseCase,
    ConfirmSaleUseCase,
    CancelSaleUseCase,
    AddSaleLineUseCase,
    RemoveSaleLineUseCase,
    GetSaleMovementUseCase,
    StartPickingSaleUseCase,
    ShipSaleUseCase,
    CompleteSaleUseCase,
    MarkSaleReturnedUseCase,
    SwapSaleLineUseCase,
    // Export repository for cross-module access (e.g., ReturnsModule)
    'SaleRepository',
  ],
})
export class SalesModule {}
