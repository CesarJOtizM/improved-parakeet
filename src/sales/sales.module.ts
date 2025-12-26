import { AddSaleLineUseCase } from '@application/saleUseCases/addSaleLineUseCase';
import { CancelSaleUseCase } from '@application/saleUseCases/cancelSaleUseCase';
import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { GetSaleByIdUseCase } from '@application/saleUseCases/getSaleByIdUseCase';
import { GetSaleMovementUseCase } from '@application/saleUseCases/getSaleMovementUseCase';
import { GetSalesUseCase } from '@application/saleUseCases/getSalesUseCase';
import { RemoveSaleLineUseCase } from '@application/saleUseCases/removeSaleLineUseCase';
import { UpdateSaleUseCase } from '@application/saleUseCases/updateSaleUseCase';
import { PrismaSaleRepository } from '@infrastructure/database/repositories/sale.repository';
import { InventoryModule } from '@inventory/inventory.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [InventoryModule], // Import InventoryModule to access MovementRepository, StockRepository, ProductRepository, WarehouseRepository
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
  ],
})
export class SalesModule {}
