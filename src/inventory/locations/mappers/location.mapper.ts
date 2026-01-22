import { Location as PrismaLocation } from '@infrastructure/database/generated/prisma';

import { ILocationProps, Location } from '../domain/entities/location.entity';
import { LocationCode } from '../domain/valueObjects/locationCode.valueObject';
import { LocationType } from '../domain/valueObjects/locationType.valueObject';

export interface ILocationResponseData {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  warehouseId: string;
  parentId?: string;
  isActive: boolean;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LocationMapper {
  public static toDomain(prismaLocation: PrismaLocation): Location {
    const props: ILocationProps = {
      code: LocationCode.create(prismaLocation.code),
      name: prismaLocation.name,
      description: prismaLocation.description ?? undefined,
      type: LocationType.create(prismaLocation.type),
      warehouseId: prismaLocation.warehouseId,
      parentId: prismaLocation.parentId ?? undefined,
      isActive: prismaLocation.isActive,
    };

    return Location.reconstitute(props, prismaLocation.id, prismaLocation.orgId);
  }

  public static toPersistence(location: Location): Omit<PrismaLocation, 'createdAt' | 'updatedAt'> {
    return {
      id: location.id,
      code: location.code.getValue(),
      name: location.name,
      description: location.description ?? null,
      type: location.type.getValue(),
      warehouseId: location.warehouseId,
      parentId: location.parentId ?? null,
      isActive: location.isActive,
      orgId: location.orgId,
    };
  }

  public static toResponseData(location: Location): ILocationResponseData {
    return {
      id: location.id,
      code: location.code.getValue(),
      name: location.name,
      description: location.description,
      type: location.type.getValue(),
      warehouseId: location.warehouseId,
      parentId: location.parentId,
      isActive: location.isActive,
      orgId: location.orgId,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }
}
