import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import { BaseFactory } from '../../../shared/factories/base.factory';

import type { IWarehouseProps } from '@warehouse/domain/entities/warehouse.entity';

export class WarehouseFactory {
  /**
   * Creates a Warehouse entity with default valid values
   */
  static create(overrides?: Partial<IWarehouseProps>, orgId?: string): Warehouse {
    const props: IWarehouseProps = {
      code: WarehouseCode.create('WH-001'),
      name: 'Test Warehouse',
      isActive: true,
      ...overrides,
    };

    return Warehouse.create(props, orgId || BaseFactory.generateOrgId());
  }

  /**
   * Creates a Warehouse entity with custom values
   */
  static createWith(overrides: Partial<IWarehouseProps>, orgId?: string): Warehouse {
    return this.create(overrides, orgId);
  }

  /**
   * Creates multiple Warehouse entities
   */
  static createMany(
    count: number,
    overrides?: Partial<IWarehouseProps>,
    orgId?: string
  ): Warehouse[] {
    return BaseFactory.createMany(count, (index: number) => {
      const code = WarehouseCode.create(`WH-${String(index + 1).padStart(3, '0')}`);
      return this.create(
        {
          ...overrides,
          code,
        },
        orgId
      );
    });
  }

  /**
   * Creates a Warehouse props object for testing
   */
  static createProps(overrides?: Partial<IWarehouseProps>): IWarehouseProps {
    return {
      code: WarehouseCode.create('WH-001'),
      name: 'Test Warehouse',
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Creates an inactive Warehouse
   */
  static createInactive(overrides?: Partial<IWarehouseProps>, orgId?: string): Warehouse {
    return this.create(
      {
        isActive: false,
        ...overrides,
      },
      orgId
    );
  }

  /**
   * Creates a Warehouse with address
   */
  static createWithAddress(
    address: string,
    overrides?: Partial<IWarehouseProps>,
    orgId?: string
  ): Warehouse {
    return this.create(
      {
        address: Address.create(address),
        ...overrides,
      },
      orgId
    );
  }
}
