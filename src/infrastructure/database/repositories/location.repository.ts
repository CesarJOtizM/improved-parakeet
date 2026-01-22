import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  ILocationFilters,
  ILocationRepository,
  Location,
  LocationCode,
  LocationType,
} from '@location/domain';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PrismaLocationRepository implements ILocationRepository {
  private readonly logger = new Logger(PrismaLocationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Location | null> {
    try {
      const locationData = await this.prisma.location.findFirst({
        where: { id, orgId },
      });

      if (!locationData) return null;

      return this.mapToDomain(locationData);
    } catch (error) {
      this.logger.error(
        `Error finding location by ID: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByCode(code: string, warehouseId: string, orgId: string): Promise<Location | null> {
    try {
      const locationData = await this.prisma.location.findFirst({
        where: { code, warehouseId, orgId },
      });

      if (!locationData) return null;

      return this.mapToDomain(locationData);
    } catch (error) {
      this.logger.error(
        `Error finding location by code: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findAll(orgId: string, filters?: ILocationFilters): Promise<Location[]> {
    try {
      const where: Record<string, unknown> = { orgId };

      if (filters?.warehouseId) {
        where.warehouseId = filters.warehouseId;
      }
      if (filters?.type) {
        where.type = filters.type;
      }
      if (filters?.parentId !== undefined) {
        where.parentId = filters.parentId;
      }
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const locationsData = await this.prisma.location.findMany({
        where,
        orderBy: [{ warehouseId: 'asc' }, { code: 'asc' }],
      });

      return locationsData.map(loc => this.mapToDomain(loc));
    } catch (error) {
      this.logger.error(
        `Error finding all locations: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByWarehouse(warehouseId: string, orgId: string): Promise<Location[]> {
    try {
      const locationsData = await this.prisma.location.findMany({
        where: { warehouseId, orgId },
        orderBy: { code: 'asc' },
      });

      return locationsData.map(loc => this.mapToDomain(loc));
    } catch (error) {
      this.logger.error(
        `Error finding locations by warehouse: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findChildren(parentId: string, orgId: string): Promise<Location[]> {
    try {
      const locationsData = await this.prisma.location.findMany({
        where: { parentId, orgId },
        orderBy: { code: 'asc' },
      });

      return locationsData.map(loc => this.mapToDomain(loc));
    } catch (error) {
      this.logger.error(
        `Error finding child locations: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async save(location: Location): Promise<Location> {
    try {
      const data = {
        code: location.code.getValue(),
        name: location.name,
        description: location.description ?? null,
        type: location.type.getValue(),
        warehouseId: location.warehouseId,
        parentId: location.parentId ?? null,
        isActive: location.isActive,
        orgId: location.orgId,
      };

      // Check if exists
      const existing = await this.prisma.location.findUnique({
        where: { id: location.id },
      });

      let savedData;
      if (existing) {
        savedData = await this.prisma.location.update({
          where: { id: location.id },
          data,
        });
      } else {
        savedData = await this.prisma.location.create({
          data: {
            id: location.id,
            ...data,
          },
        });
      }

      return this.mapToDomain(savedData);
    } catch (error) {
      this.logger.error(`Error saving location: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      // Soft delete by deactivating
      await this.prisma.location.updateMany({
        where: { id, orgId },
        data: { isActive: false },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting location: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  private mapToDomain(data: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    type: string;
    warehouseId: string;
    parentId: string | null;
    isActive: boolean;
    orgId: string;
  }): Location {
    return Location.reconstitute(
      {
        code: LocationCode.create(data.code),
        name: data.name,
        description: data.description ?? undefined,
        type: LocationType.create(data.type),
        warehouseId: data.warehouseId,
        parentId: data.parentId ?? undefined,
        isActive: data.isActive,
      },
      data.id,
      data.orgId
    );
  }
}
