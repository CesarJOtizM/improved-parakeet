import { Product } from '@product/domain/entities/product.entity';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';

import { BaseFactory } from '../../../shared/factories/base.factory';

import type { IProductProps } from '@product/domain/entities/product.entity';

export class ProductFactory {
  /**
   * Creates a Product entity with default valid values
   */
  static create(overrides?: Partial<IProductProps>, orgId?: string): Product {
    const props: IProductProps = {
      sku: SKU.create('TEST-SKU-001'),
      name: ProductName.create('Test Product'),
      unit: UnitValueObject.create('UNIT', 'Unit', 0),
      status: ProductStatus.create('ACTIVE'),
      costMethod: CostMethod.create('FIFO'),
      ...overrides,
    };

    return Product.create(props, orgId || BaseFactory.generateOrgId());
  }

  /**
   * Creates a Product entity with custom values
   */
  static createWith(overrides: Partial<IProductProps>, orgId?: string): Product {
    return this.create(overrides, orgId);
  }

  /**
   * Creates multiple Product entities
   */
  static createMany(count: number, overrides?: Partial<IProductProps>, orgId?: string): Product[] {
    return BaseFactory.createMany(count, (index: number) => {
      const sku = SKU.create(`TEST-SKU-${String(index + 1).padStart(3, '0')}`);
      return this.create(
        {
          ...overrides,
          sku,
        },
        orgId
      );
    });
  }

  /**
   * Creates a Product props object for testing
   */
  static createProps(overrides?: Partial<IProductProps>): IProductProps {
    return {
      sku: SKU.create('TEST-SKU-001'),
      name: ProductName.create('Test Product'),
      unit: UnitValueObject.create('UNIT', 'Unit', 0),
      status: ProductStatus.create('ACTIVE'),
      costMethod: CostMethod.create('FIFO'),
      ...overrides,
    };
  }

  /**
   * Creates an inactive Product
   */
  static createInactive(overrides?: Partial<IProductProps>, orgId?: string): Product {
    return this.create(
      {
        status: ProductStatus.create('INACTIVE'),
        ...overrides,
      },
      orgId
    );
  }

  /**
   * Creates a discontinued Product
   */
  static createDiscontinued(overrides?: Partial<IProductProps>, orgId?: string): Product {
    return this.create(
      {
        status: ProductStatus.create('DISCONTINUED'),
        ...overrides,
      },
      orgId
    );
  }

  /**
   * Creates a Product with AVG cost method
   */
  static createWithAvgCost(overrides?: Partial<IProductProps>, orgId?: string): Product {
    return this.create(
      {
        costMethod: CostMethod.create('AVG'),
        ...overrides,
      },
      orgId
    );
  }
}
