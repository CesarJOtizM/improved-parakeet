import { AddReturnLineUseCase } from '@application/returnUseCases/addReturnLineUseCase';
import { CancelReturnUseCase } from '@application/returnUseCases/cancelReturnUseCase';
import { ConfirmReturnUseCase } from '@application/returnUseCases/confirmReturnUseCase';
import { CreateReturnUseCase } from '@application/returnUseCases/createReturnUseCase';
import { GetReturnByIdUseCase } from '@application/returnUseCases/getReturnByIdUseCase';
import { GetReturnsByMovementUseCase } from '@application/returnUseCases/getReturnsByMovementUseCase';
import { GetReturnsBySaleUseCase } from '@application/returnUseCases/getReturnsBySaleUseCase';
import { GetReturnsUseCase } from '@application/returnUseCases/getReturnsUseCase';
import { RemoveReturnLineUseCase } from '@application/returnUseCases/removeReturnLineUseCase';
import { UpdateReturnUseCase } from '@application/returnUseCases/updateReturnUseCase';
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
    // Return Use Cases
    CreateReturnUseCase,
    GetReturnsUseCase,
    GetReturnByIdUseCase,
    UpdateReturnUseCase,
    ConfirmReturnUseCase,
    CancelReturnUseCase,
    AddReturnLineUseCase,
    RemoveReturnLineUseCase,
    GetReturnsBySaleUseCase,
    GetReturnsByMovementUseCase,
  ],
  exports: [
    // Export use cases for controller
    CreateReturnUseCase,
    GetReturnsUseCase,
    GetReturnByIdUseCase,
    UpdateReturnUseCase,
    ConfirmReturnUseCase,
    CancelReturnUseCase,
    AddReturnLineUseCase,
    RemoveReturnLineUseCase,
    GetReturnsBySaleUseCase,
    GetReturnsByMovementUseCase,
  ],
})
export class ReturnsModule {}
