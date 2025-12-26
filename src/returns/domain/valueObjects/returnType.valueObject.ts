import { ValueObject } from '@shared/domain/base/valueObject.base';

export type ReturnTypeValue = 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER';

export class ReturnType extends ValueObject<{ value: ReturnTypeValue }> {
  constructor(value: ReturnTypeValue) {
    super({ value });
  }

  public static create(value: ReturnTypeValue): ReturnType {
    if (!this.isValid(value)) {
      throw new Error(`Invalid return type: ${value}`);
    }
    return new ReturnType(value);
  }

  private static isValid(value: string): value is ReturnTypeValue {
    return ['RETURN_CUSTOMER', 'RETURN_SUPPLIER'].includes(value);
  }

  public isCustomerReturn(): boolean {
    return this.props.value === 'RETURN_CUSTOMER';
  }

  public isSupplierReturn(): boolean {
    return this.props.value === 'RETURN_SUPPLIER';
  }

  public getValue(): ReturnTypeValue {
    return this.props.value;
  }
}
