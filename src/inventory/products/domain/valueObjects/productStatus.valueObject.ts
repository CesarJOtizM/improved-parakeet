import { ValueObject } from '@shared/domain/base/valueObject.base';

export type ProductStatusValue = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';

export class ProductStatus extends ValueObject<ProductStatusValue> {
  constructor(value: ProductStatusValue) {
    super(value);
  }

  public static create(value: ProductStatusValue): ProductStatus {
    if (!this.isValid(value)) {
      throw new Error(`Invalid product status: ${value}`);
    }
    return new ProductStatus(value);
  }

  private static isValid(value: string): value is ProductStatusValue {
    return ['ACTIVE', 'INACTIVE', 'DISCONTINUED'].includes(value);
  }

  public isActive(): boolean {
    return this.props === 'ACTIVE';
  }

  public isInactive(): boolean {
    return this.props === 'INACTIVE';
  }

  public isDiscontinued(): boolean {
    return this.props === 'DISCONTINUED';
  }

  public getValue(): ProductStatusValue {
    return this.props;
  }
}
