import { AuthenticationModule } from '@auth/authentication.module';
import { InventoryModule } from '@inventory/inventory.module';
import { Module } from '@nestjs/common';

import { CategoriesController } from './categories.controller';
import { CompaniesController } from './companies.controller';
import { MovementsController } from './movements.controller';
import { ProductsController } from './products.controller';
import { ReorderRulesController } from './reorderRules.controller';
import { StockController } from './stock.controller';
import { TransfersController } from './transfers.controller';
import { WarehousesController } from './warehouses.controller';

@Module({
  imports: [
    AuthenticationModule, // Import AuthenticationModule to access DomainEventDispatcher and DomainEventBus
    InventoryModule,
  ],
  controllers: [
    CategoriesController,
    CompaniesController,
    ProductsController,
    WarehousesController,
    MovementsController,
    TransfersController,
    StockController,
    ReorderRulesController,
  ],
})
export class InventoryHttpModule {}
