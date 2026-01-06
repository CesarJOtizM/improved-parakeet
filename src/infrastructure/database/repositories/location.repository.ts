import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { IPrismaSpecification } from '@shared/domain/specifications';
import { Location } from '@warehouse/domain/entities/location.entity';
import { ILocationRepository } from '@warehouse/domain/repositories/locationRepository.interface';
import { LocationCode } from '@warehouse/domain/valueObjects/locationCode.valueObject';

import type { PrismaClient } from '@infrastructure/database/generated/prisma';

interface ILocationData {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  isDefault: boolean;
  isActive: boolean;
  orgId: string;
}

@Injectable()
export class PrismaLocationRepository implements ILocationRepository {
  private readonly logger = new Logger(PrismaLocationRepository.name);
  private readonly prisma: PrismaClient;

  constructor(private readonly prismaService: PrismaService) {
    this.prisma = this.prismaService as unknown as PrismaClient;
  }

  async findById(id: string, orgId: string): Promise<Location | null> {
    try {
      // Note: This assumes a 'locations' table exists in Prisma
      // If it doesn't exist, you'll need to add it to the schema and run migrations
      const locationData = (await (
        this.prisma as unknown as {
          location: {
            findFirst: (args: {
              where: { id: string; orgId: string };
            }) => Promise<ILocationData | null>;
          };
        }
      ).location.findFirst({
        where: { id, orgId },
      })) as ILocationData | null;

      if (!locationData) return null;

      return Location.reconstitute(
        {
          code: LocationCode.create(locationData.code),
          name: locationData.name,
          warehouseId: locationData.warehouseId,
          isDefault: locationData.isDefault || false,
          isActive: locationData.isActive !== undefined ? locationData.isActive : true,
        },
        locationData.id,
        locationData.orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding location by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding location by ID: ${error}`);
      }
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Location[]> {
    try {
      const locationsData = (await (
        this.prisma as unknown as {
          location: { findMany: (args: { where: { orgId: string } }) => Promise<ILocationData[]> };
        }
      ).location.findMany({
        where: { orgId },
      })) as ILocationData[];

      return locationsData.map((locationData: ILocationData) =>
        Location.reconstitute(
          {
            code: LocationCode.create(locationData.code),
            name: locationData.name,
            warehouseId: locationData.warehouseId,
            isDefault: locationData.isDefault || false,
            isActive: locationData.isActive !== undefined ? locationData.isActive : true,
          },
          locationData.id,
          locationData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all locations: ${error.message}`);
      } else {
        this.logger.error(`Error finding all locations: ${error}`);
      }
      throw error;
    }
  }

  async findBySpecification(
    specification: IPrismaSpecification<Location>,
    orgId: string
  ): Promise<Location[]> {
    try {
      // Basic implementation - can be extended with proper specification handling
      const whereClause = specification.toPrismaWhere
        ? specification.toPrismaWhere(orgId)
        : { orgId };
      const locationsData = (await (
        this.prisma as unknown as {
          location: {
            findMany: (args: { where: Record<string, unknown> }) => Promise<ILocationData[]>;
          };
        }
      ).location.findMany({
        where: whereClause,
      })) as ILocationData[];

      return locationsData.map((locationData: ILocationData) =>
        Location.reconstitute(
          {
            code: LocationCode.create(locationData.code),
            name: locationData.name,
            warehouseId: locationData.warehouseId,
            isDefault: locationData.isDefault || false,
            isActive: locationData.isActive !== undefined ? locationData.isActive : true,
          },
          locationData.id,
          locationData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding locations by specification: ${error.message}`);
      } else {
        this.logger.error(`Error finding locations by specification: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = (await (
        this.prisma as unknown as {
          location: { count: (args: { where: { id: string; orgId: string } }) => Promise<number> };
        }
      ).location.count({
        where: { id, orgId },
      })) as number;
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking location existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking location existence: ${error}`);
      }
      throw error;
    }
  }

  async save(location: Location, orgId?: string): Promise<Location> {
    try {
      const locationOrgId = orgId || location.orgId;
      if (!locationOrgId) {
        throw new Error('Organization ID is required to save location');
      }

      const locationData = {
        code: location.code.getValue(),
        name: location.name,
        warehouseId: location.warehouseId,
        isDefault: location.isDefault,
        isActive: location.isActive,
        orgId: locationOrgId,
      };

      if (location.id) {
        // Update existing location
        const updated = (await (
          this.prisma as unknown as {
            location: {
              update: (args: {
                where: { id: string };
                data: Record<string, unknown>;
              }) => Promise<ILocationData>;
            };
          }
        ).location.update({
          where: { id: location.id },
          data: locationData,
        })) as ILocationData;

        return Location.reconstitute(
          {
            code: LocationCode.create(updated.code),
            name: updated.name,
            warehouseId: updated.warehouseId,
            isDefault: updated.isDefault || false,
            isActive: updated.isActive !== undefined ? updated.isActive : true,
          },
          updated.id,
          updated.orgId
        );
      } else {
        // Create new location
        const created = (await (
          this.prisma as unknown as {
            location: {
              create: (args: { data: Record<string, unknown> }) => Promise<ILocationData>;
            };
          }
        ).location.create({
          data: locationData,
        })) as ILocationData;

        return Location.reconstitute(
          {
            code: LocationCode.create(created.code),
            name: created.name,
            warehouseId: created.warehouseId,
            isDefault: created.isDefault || false,
            isActive: created.isActive !== undefined ? created.isActive : true,
          },
          created.id,
          created.orgId
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error saving location: ${error.message}`);
      } else {
        this.logger.error(`Error saving location: ${error}`);
      }
      throw error;
    }
  }

  async delete(id: string, _orgId: string): Promise<void> {
    try {
      await (
        this.prisma as unknown as {
          location: { delete: (args: { where: { id: string } }) => Promise<void> };
        }
      ).location.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting location: ${error.message}`);
      } else {
        this.logger.error(`Error deleting location: ${error}`);
      }
      throw error;
    }
  }

  async findByCode(code: string, warehouseId: string, orgId: string): Promise<Location | null> {
    try {
      const locationData = (await (
        this.prisma as unknown as {
          location: {
            findFirst: (args: {
              where: { code: string; warehouseId: string; orgId: string };
            }) => Promise<ILocationData | null>;
          };
        }
      ).location.findFirst({
        where: {
          code,
          warehouseId,
          orgId,
        },
      })) as ILocationData | null;

      if (!locationData) return null;

      return Location.reconstitute(
        {
          code: LocationCode.create(locationData.code),
          name: locationData.name,
          warehouseId: locationData.warehouseId,
          isDefault: locationData.isDefault || false,
          isActive: locationData.isActive !== undefined ? locationData.isActive : true,
        },
        locationData.id,
        locationData.orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding location by code: ${error.message}`);
      } else {
        this.logger.error(`Error finding location by code: ${error}`);
      }
      throw error;
    }
  }

  async findByWarehouse(warehouseId: string, orgId: string): Promise<Location[]> {
    try {
      const locationsData = (await (
        this.prisma as unknown as {
          location: {
            findMany: (args: {
              where: { warehouseId: string; orgId: string };
            }) => Promise<ILocationData[]>;
          };
        }
      ).location.findMany({
        where: {
          warehouseId,
          orgId,
        },
      })) as ILocationData[];

      return locationsData.map((locationData: ILocationData) =>
        Location.reconstitute(
          {
            code: LocationCode.create(locationData.code),
            name: locationData.name,
            warehouseId: locationData.warehouseId,
            isDefault: locationData.isDefault || false,
            isActive: locationData.isActive !== undefined ? locationData.isActive : true,
          },
          locationData.id,
          locationData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding locations by warehouse: ${error.message}`);
      } else {
        this.logger.error(`Error finding locations by warehouse: ${error}`);
      }
      throw error;
    }
  }

  async findDefaultLocation(warehouseId: string, orgId: string): Promise<Location | null> {
    try {
      const locationData = (await (
        this.prisma as unknown as {
          location: {
            findFirst: (args: {
              where: { warehouseId: string; orgId: string; isDefault: boolean; isActive: boolean };
            }) => Promise<ILocationData | null>;
          };
        }
      ).location.findFirst({
        where: {
          warehouseId,
          orgId,
          isDefault: true,
          isActive: true,
        },
      })) as ILocationData | null;

      if (!locationData) return null;

      return Location.reconstitute(
        {
          code: LocationCode.create(locationData.code),
          name: locationData.name,
          warehouseId: locationData.warehouseId,
          isDefault: locationData.isDefault || false,
          isActive: locationData.isActive !== undefined ? locationData.isActive : true,
        },
        locationData.id,
        locationData.orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding default location: ${error.message}`);
      } else {
        this.logger.error(`Error finding default location: ${error}`);
      }
      throw error;
    }
  }

  async existsByCode(code: string, warehouseId: string, orgId: string): Promise<boolean> {
    try {
      const count = (await (
        this.prisma as unknown as {
          location: {
            count: (args: {
              where: { code: string; warehouseId: string; orgId: string };
            }) => Promise<number>;
          };
        }
      ).location.count({
        where: {
          code,
          warehouseId,
          orgId,
        },
      })) as number;
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking location code existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking location code existence: ${error}`);
      }
      throw error;
    }
  }
}
