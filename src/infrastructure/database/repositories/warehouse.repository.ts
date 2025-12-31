import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { cacheEntity, getCachedEntity, invalidateEntityCache } from '@shared/infrastructure/cache';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { ICacheService } from '@shared/ports/cache';

@Injectable()
export class PrismaWarehouseRepository implements IWarehouseRepository {
  private readonly logger = new Logger(PrismaWarehouseRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('CacheService')
    @Optional()
    private readonly cacheService?: ICacheService
  ) {}

  async findById(id: string, orgId: string): Promise<Warehouse | null> {
    try {
      // Try to get from cache first
      if (this.cacheService) {
        const cached = await getCachedEntity<Warehouse>(this.cacheService, 'warehouse', id, orgId);
        if (cached) {
          return cached;
        }
      }

      const warehouseData = await this.prisma.warehouse.findFirst({
        where: { id, orgId },
      });

      if (!warehouseData) return null;

      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create(warehouseData.code),
          name: warehouseData.name,
          address: warehouseData.address ? Address.create(warehouseData.address) : undefined,
          isActive: warehouseData.isActive,
        },
        warehouseData.id,
        warehouseData.orgId
      );

      // Cache the warehouse
      if (this.cacheService) {
        await cacheEntity(this.cacheService, 'warehouse', warehouse.id, warehouse, orgId);
      }

      return warehouse;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding warehouse by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding warehouse by ID: ${error}`);
      }
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Warehouse[]> {
    try {
      const warehousesData = await this.prisma.warehouse.findMany({
        where: { orgId },
      });

      return warehousesData.map(warehouseData =>
        Warehouse.reconstitute(
          {
            code: WarehouseCode.create(warehouseData.code),
            name: warehouseData.name,
            address: warehouseData.address ? Address.create(warehouseData.address) : undefined,
            isActive: warehouseData.isActive,
          },
          warehouseData.id,
          warehouseData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all warehouses: ${error.message}`);
      } else {
        this.logger.error(`Error finding all warehouses: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.warehouse.count({
        where: { id, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking warehouse existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking warehouse existence: ${error}`);
      }
      throw error;
    }
  }

  async save(warehouse: Warehouse): Promise<Warehouse> {
    try {
      this.logger.debug('Saving warehouse', {
        warehouseId: warehouse.id,
        code: warehouse.code.getValue(),
        orgId: warehouse.orgId,
        hasId: !!warehouse.id,
      });

      const warehouseData = {
        code: warehouse.code.getValue(),
        name: warehouse.name,
        description: null, // Not in domain entity
        address: warehouse.address?.getValue() || null,
        isActive: warehouse.isActive,
        orgId: warehouse.orgId,
      };

      if (warehouse.id) {
        const existingWarehouse = await this.prisma.warehouse.findUnique({
          where: { id: warehouse.id },
        });

        if (existingWarehouse) {
          const updatedWarehouse = await this.prisma.warehouse.update({
            where: { id: warehouse.id },
            data: warehouseData,
          });

          const savedWarehouse = Warehouse.reconstitute(
            {
              code: WarehouseCode.create(updatedWarehouse.code),
              name: updatedWarehouse.name,
              address: updatedWarehouse.address
                ? Address.create(updatedWarehouse.address)
                : undefined,
              isActive: updatedWarehouse.isActive,
            },
            updatedWarehouse.id,
            updatedWarehouse.orgId
          );

          // Invalidate and update cache
          if (this.cacheService) {
            await invalidateEntityCache(
              this.cacheService,
              'warehouse',
              savedWarehouse.id,
              savedWarehouse.orgId
            );
            await cacheEntity(
              this.cacheService,
              'warehouse',
              savedWarehouse.id,
              savedWarehouse,
              savedWarehouse.orgId
            );
          }

          return savedWarehouse;
        }
      }

      const newWarehouse = await this.prisma.warehouse.create({
        data: warehouseData,
      });

      const savedWarehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create(newWarehouse.code),
          name: newWarehouse.name,
          address: newWarehouse.address ? Address.create(newWarehouse.address) : undefined,
          isActive: newWarehouse.isActive,
        },
        newWarehouse.id,
        newWarehouse.orgId
      );

      // Cache the new warehouse
      if (this.cacheService) {
        await cacheEntity(
          this.cacheService,
          'warehouse',
          savedWarehouse.id,
          savedWarehouse,
          savedWarehouse.orgId
        );
      }

      return savedWarehouse;
    } catch (error) {
      this.logger.error('Error saving warehouse', {
        error: error instanceof Error ? error.message : 'Unknown error',
        warehouseId: warehouse.id,
        code: warehouse.code.getValue(),
        orgId: warehouse.orgId,
      });
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.warehouse.updateMany({
        where: { id, orgId },
        data: { isActive: false },
      });

      // Invalidate cache
      if (this.cacheService) {
        await invalidateEntityCache(this.cacheService, 'warehouse', id, orgId);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting warehouse: ${error.message}`);
      } else {
        this.logger.error(`Error deleting warehouse: ${error}`);
      }
      throw error;
    }
  }

  async findByCode(code: string, orgId: string): Promise<Warehouse | null> {
    try {
      const warehouseData = await this.prisma.warehouse.findFirst({
        where: { code, orgId },
      });

      if (!warehouseData) return null;

      // Try cache by ID first
      if (this.cacheService) {
        const cached = await getCachedEntity<Warehouse>(
          this.cacheService,
          'warehouse',
          warehouseData.id,
          orgId
        );
        if (cached) {
          return cached;
        }
      }

      const warehouse = Warehouse.reconstitute(
        {
          code: WarehouseCode.create(warehouseData.code),
          name: warehouseData.name,
          address: warehouseData.address ? Address.create(warehouseData.address) : undefined,
          isActive: warehouseData.isActive,
        },
        warehouseData.id,
        warehouseData.orgId
      );

      // Cache the warehouse
      if (this.cacheService) {
        await cacheEntity(this.cacheService, 'warehouse', warehouse.id, warehouse, orgId);
      }

      return warehouse;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding warehouse by code: ${error.message}`);
      } else {
        this.logger.error(`Error finding warehouse by code: ${error}`);
      }
      throw error;
    }
  }

  async existsByCode(code: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.warehouse.count({
        where: { code, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking warehouse code existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking warehouse code existence: ${error}`);
      }
      throw error;
    }
  }

  async findActive(orgId: string): Promise<Warehouse[]> {
    try {
      const warehousesData = await this.prisma.warehouse.findMany({
        where: { orgId, isActive: true },
      });

      return warehousesData.map(warehouseData =>
        Warehouse.reconstitute(
          {
            code: WarehouseCode.create(warehouseData.code),
            name: warehouseData.name,
            address: warehouseData.address ? Address.create(warehouseData.address) : undefined,
            isActive: warehouseData.isActive,
          },
          warehouseData.id,
          warehouseData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding active warehouses: ${error.message}`);
      } else {
        this.logger.error(`Error finding active warehouses: ${error}`);
      }
      throw error;
    }
  }
}
