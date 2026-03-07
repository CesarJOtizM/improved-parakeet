import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ImportProcessingService,
  ImportType,
  type ImportRow,
  type RowProcessor,
} from '@import/domain';
import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { CreateMovementUseCase } from '@application/movementUseCases/createMovementUseCase';
import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { InitiateTransferUseCase } from '@application/transferUseCases/initiateTransferUseCase';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';
import type { ILocationRepository } from '@warehouse/domain/repositories/locationRepository.interface';
import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

@Injectable()
export class ImportRowProcessorFactory {
  private readonly logger = new Logger(ImportRowProcessorFactory.name);

  constructor(
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject('LocationRepository')
    private readonly locationRepository: ILocationRepository,
    @Inject('CompanyRepository')
    private readonly companyRepository: ICompanyRepository,
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly createMovementUseCase: CreateMovementUseCase,
    private readonly createWarehouseUseCase: CreateWarehouseUseCase,
    private readonly initiateTransferUseCase: InitiateTransferUseCase
  ) {}

  createProcessor(type: ImportType): RowProcessor {
    this.logger.log(`Creating row processor for import type: ${type.getValue()}`);

    switch (type.getValue()) {
      case 'PRODUCTS':
        return this.processProduct.bind(this);
      case 'MOVEMENTS':
        return this.processMovement.bind(this);
      case 'WAREHOUSES':
        return this.processWarehouse.bind(this);
      case 'STOCK':
        return this.processStock.bind(this);
      case 'TRANSFERS':
        return this.processTransfer.bind(this);
      default:
        throw new Error(`Unsupported import type: ${type.getValue()}`);
    }
  }

  private async processProduct(row: ImportRow, _type: ImportType, orgId: string) {
    const data = ImportProcessingService.toProductData(row.data);

    try {
      // Resolve company code to ID if present
      let companyId: string | undefined;
      if (data.companyCode) {
        const company = await this.companyRepository.findByCode(data.companyCode, orgId);
        if (!company) {
          return {
            rowNumber: row.rowNumber,
            success: false,
            error: `Company code "${data.companyCode}" not found`,
          };
        }
        companyId = company.id;
      }

      const result = await this.createProductUseCase.execute({
        sku: data.sku,
        name: data.name,
        description: data.description,
        unit: {
          code: data.unitCode,
          name: data.unitName,
          precision: data.unitPrecision,
        },
        barcode: data.barcode,
        brand: data.brand,
        model: data.model,
        status: data.status as 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | undefined,
        costMethod: data.costMethod as 'AVG' | 'FIFO' | undefined,
        companyId,
        orgId,
      });

      if (result.isOk()) {
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: result.unwrap().data?.id,
        };
      }

      return {
        rowNumber: row.rowNumber,
        success: false,
        error: result.unwrapErr().message,
      };
    } catch (error) {
      return {
        rowNumber: row.rowNumber,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async processMovement(row: ImportRow, _type: ImportType, orgId: string) {
    const data = ImportProcessingService.toMovementData(row.data);

    try {
      // Resolve warehouse code to ID
      const warehouse = await this.warehouseRepository.findByCode(data.warehouseCode, orgId);
      if (!warehouse) {
        return {
          rowNumber: row.rowNumber,
          success: false,
          error: `Warehouse code "${data.warehouseCode}" not found`,
        };
      }

      // Resolve product SKU to ID
      const product = await this.productRepository.findBySku(data.productSku, orgId);
      if (!product) {
        return {
          rowNumber: row.rowNumber,
          success: false,
          error: `Product SKU "${data.productSku}" not found`,
        };
      }

      // Resolve location code to ID if present
      let locationId: string | undefined;
      if (data.locationCode) {
        const location = await this.locationRepository.findByCode(
          data.locationCode,
          warehouse.id,
          orgId
        );
        if (!location) {
          return {
            rowNumber: row.rowNumber,
            success: false,
            error: `Location code "${data.locationCode}" not found in warehouse "${data.warehouseCode}"`,
          };
        }
        locationId = location.id;
      }

      const result = await this.createMovementUseCase.execute({
        type: data.type as 'IN' | 'OUT' | 'ADJUST_IN' | 'ADJUST_OUT',
        warehouseId: warehouse.id,
        reference: data.reference,
        reason: data.reason,
        note: data.note,
        lines: [
          {
            productId: product.id,
            locationId,
            quantity: data.quantity,
            unitCost: data.unitCost,
            currency: data.currency,
          },
        ],
        createdBy: 'import-system',
        orgId,
      });

      if (result.isOk()) {
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: result.unwrap().data?.id,
        };
      }

      return {
        rowNumber: row.rowNumber,
        success: false,
        error: result.unwrapErr().message,
      };
    } catch (error) {
      return {
        rowNumber: row.rowNumber,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async processWarehouse(row: ImportRow, _type: ImportType, orgId: string) {
    const data = ImportProcessingService.toWarehouseData(row.data);

    try {
      const result = await this.createWarehouseUseCase.execute({
        code: data.code,
        name: data.name,
        description: data.description,
        address: data.address ? { street: data.address } : undefined,
        orgId,
      });

      if (result.isOk()) {
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: result.unwrap().data?.id,
        };
      }

      return {
        rowNumber: row.rowNumber,
        success: false,
        error: result.unwrapErr().message,
      };
    } catch (error) {
      return {
        rowNumber: row.rowNumber,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async processStock(row: ImportRow, _type: ImportType, orgId: string) {
    // Stock imports are handled as ADJUST_IN movements
    const data = ImportProcessingService.toStockData(row.data);

    try {
      // Resolve warehouse code to ID
      const warehouse = await this.warehouseRepository.findByCode(data.warehouseCode, orgId);
      if (!warehouse) {
        return {
          rowNumber: row.rowNumber,
          success: false,
          error: `Warehouse code "${data.warehouseCode}" not found`,
        };
      }

      // Resolve product SKU to ID
      const product = await this.productRepository.findBySku(data.productSku, orgId);
      if (!product) {
        return {
          rowNumber: row.rowNumber,
          success: false,
          error: `Product SKU "${data.productSku}" not found`,
        };
      }

      // Resolve location code to ID if present
      let locationId: string | undefined;
      if (data.locationCode) {
        const location = await this.locationRepository.findByCode(
          data.locationCode,
          warehouse.id,
          orgId
        );
        if (!location) {
          return {
            rowNumber: row.rowNumber,
            success: false,
            error: `Location code "${data.locationCode}" not found in warehouse "${data.warehouseCode}"`,
          };
        }
        locationId = location.id;
      }

      const result = await this.createMovementUseCase.execute({
        type: 'ADJUST_IN',
        warehouseId: warehouse.id,
        reference: `STOCK-IMPORT-${row.rowNumber}`,
        reason: 'Stock import adjustment',
        lines: [
          {
            productId: product.id,
            locationId,
            quantity: data.quantity,
            unitCost: data.unitCost,
            currency: data.currency,
          },
        ],
        createdBy: 'import-system',
        orgId,
      });

      if (result.isOk()) {
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: result.unwrap().data?.id,
        };
      }

      return {
        rowNumber: row.rowNumber,
        success: false,
        error: result.unwrapErr().message,
      };
    } catch (error) {
      return {
        rowNumber: row.rowNumber,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async processTransfer(row: ImportRow, _type: ImportType, orgId: string) {
    const data = ImportProcessingService.toTransferData(row.data);

    try {
      // Resolve from warehouse code to ID
      const fromWarehouse = await this.warehouseRepository.findByCode(
        data.fromWarehouseCode,
        orgId
      );
      if (!fromWarehouse) {
        return {
          rowNumber: row.rowNumber,
          success: false,
          error: `From warehouse code "${data.fromWarehouseCode}" not found`,
        };
      }

      // Resolve to warehouse code to ID
      const toWarehouse = await this.warehouseRepository.findByCode(data.toWarehouseCode, orgId);
      if (!toWarehouse) {
        return {
          rowNumber: row.rowNumber,
          success: false,
          error: `To warehouse code "${data.toWarehouseCode}" not found`,
        };
      }

      // Resolve product SKU to ID
      const product = await this.productRepository.findBySku(data.productSku, orgId);
      if (!product) {
        return {
          rowNumber: row.rowNumber,
          success: false,
          error: `Product SKU "${data.productSku}" not found`,
        };
      }

      // Resolve location codes
      let fromLocationId: string | undefined;
      if (data.fromLocationCode) {
        const fromLocation = await this.locationRepository.findByCode(
          data.fromLocationCode,
          fromWarehouse.id,
          orgId
        );
        if (!fromLocation) {
          return {
            rowNumber: row.rowNumber,
            success: false,
            error: `From location code "${data.fromLocationCode}" not found`,
          };
        }
        fromLocationId = fromLocation.id;
      }

      let toLocationId: string | undefined;
      if (data.toLocationCode) {
        const toLocation = await this.locationRepository.findByCode(
          data.toLocationCode,
          toWarehouse.id,
          orgId
        );
        if (!toLocation) {
          return {
            rowNumber: row.rowNumber,
            success: false,
            error: `To location code "${data.toLocationCode}" not found`,
          };
        }
        toLocationId = toLocation.id;
      }

      const result = await this.initiateTransferUseCase.execute({
        fromWarehouseId: fromWarehouse.id,
        toWarehouseId: toWarehouse.id,
        createdBy: 'import-system',
        note: data.note,
        lines: [
          {
            productId: product.id,
            quantity: data.quantity,
            fromLocationId,
            toLocationId,
          },
        ],
        orgId,
      });

      if (result.isOk()) {
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: result.unwrap().data?.id,
        };
      }

      return {
        rowNumber: row.rowNumber,
        success: false,
        error: result.unwrapErr().message,
      };
    } catch (error) {
      return {
        rowNumber: row.rowNumber,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
