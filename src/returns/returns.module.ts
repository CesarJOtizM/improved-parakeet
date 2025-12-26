import { InventoryModule } from '@inventory/inventory.module';
import { Module } from '@nestjs/common';
import { SalesModule } from '@sales/sales.module';

@Module({
  imports: [
    InventoryModule, // Import InventoryModule to access MovementRepository, StockRepository, ProductRepository, WarehouseRepository
    SalesModule, // Import SalesModule to access SaleRepository (for customer returns validation)
  ],
  providers: [
    // Repository will be added when implementing PrismaReturnRepository
    // {
    //   provide: 'ReturnRepository',
    //   useClass: PrismaReturnRepository,
    // },
    // Return Use Cases will be added in next phase
  ],
  exports: [
    // Export use cases for controller (to be added in next phase)
  ],
})
export class ReturnsModule {}
