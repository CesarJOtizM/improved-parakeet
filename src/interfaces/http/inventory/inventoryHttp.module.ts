import { AuthenticationModule } from '@auth/authentication.module';
import { InventoryModule } from '@inventory/inventory.module';
import { Module } from '@nestjs/common';

import { MovementsController } from './movements.controller';
import { ProductsController } from './products.controller';
import { TransfersController } from './transfers.controller';
import { WarehousesController } from './warehouses.controller';

@Module({
  imports: [
    AuthenticationModule, // Import AuthenticationModule to access DomainEventDispatcher and DomainEventBus
    InventoryModule,
  ],
  controllers: [ProductsController, WarehousesController, MovementsController, TransfersController],
})
export class InventoryHttpModule {}
