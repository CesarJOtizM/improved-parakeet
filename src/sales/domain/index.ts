// Domain exports
export * from './entities/sale.entity';
export * from './entities/saleLine.entity';
export * from './valueObjects/saleStatus.valueObject';
export * from './valueObjects/saleNumber.valueObject';
export * from './valueObjects/salePrice.valueObject';
export * from './events/saleCreated.event';
export * from './events/saleConfirmed.event';
export * from './events/saleCancelled.event';
export * from './events/inventoryOutGenerated.event';
export * from './repositories/saleRepository.interface';
export * from './services/saleValidation.service';
export * from './services/saleCalculation.service';
export * from './services/inventoryIntegration.service';
export * from './services/saleNumberGeneration.service';
