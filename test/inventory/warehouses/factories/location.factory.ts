import { Location } from '@warehouse/domain/entities/location.entity';
import { LocationCode } from '@warehouse/domain/valueObjects/locationCode.valueObject';

import { BaseFactory } from '../../../shared/factories/base.factory';

import type { ILocationProps } from '@warehouse/domain/entities/location.entity';

export class LocationFactory {
  /**
   * Creates a Location entity with default valid values
   */
  static create(overrides?: Partial<ILocationProps>, orgId?: string): Location {
    const props: ILocationProps = {
      code: LocationCode.create('LOC-001'),
      name: 'Test Location',
      warehouseId: BaseFactory.generateId(),
      isDefault: false,
      isActive: true,
      ...overrides,
    };

    return Location.create(props, orgId || BaseFactory.generateOrgId());
  }

  /**
   * Creates a Location entity with custom values
   */
  static createWith(overrides: Partial<ILocationProps>, orgId?: string): Location {
    return this.create(overrides, orgId);
  }

  /**
   * Creates multiple Location entities
   */
  static createMany(
    count: number,
    warehouseId: string,
    overrides?: Partial<ILocationProps>,
    orgId?: string
  ): Location[] {
    return BaseFactory.createMany(count, (index: number) => {
      const code = LocationCode.create(`LOC-${String(index + 1).padStart(3, '0')}`);
      return this.create(
        {
          ...overrides,
          code,
          warehouseId,
        },
        orgId
      );
    });
  }

  /**
   * Creates a Location props object for testing
   */
  static createProps(warehouseId: string, overrides?: Partial<ILocationProps>): ILocationProps {
    return {
      code: LocationCode.create('LOC-001'),
      name: 'Test Location',
      warehouseId,
      isDefault: false,
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Creates a default Location
   */
  static createDefault(
    warehouseId: string,
    overrides?: Partial<ILocationProps>,
    orgId?: string
  ): Location {
    return this.create(
      {
        warehouseId,
        isDefault: true,
        ...overrides,
      },
      orgId
    );
  }

  /**
   * Creates an inactive Location
   */
  static createInactive(
    warehouseId: string,
    overrides?: Partial<ILocationProps>,
    orgId?: string
  ): Location {
    return this.create(
      {
        warehouseId,
        isActive: false,
        ...overrides,
      },
      orgId
    );
  }
}
