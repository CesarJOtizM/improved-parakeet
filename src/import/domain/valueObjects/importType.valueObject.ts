import { ValueObject } from '@shared/domain/base/valueObject.base';

export type ImportTypeValue = 'PRODUCTS' | 'MOVEMENTS' | 'WAREHOUSES' | 'STOCK' | 'TRANSFERS';

export const IMPORT_TYPES: Record<string, ImportTypeValue> = {
  PRODUCTS: 'PRODUCTS',
  MOVEMENTS: 'MOVEMENTS',
  WAREHOUSES: 'WAREHOUSES',
  STOCK: 'STOCK',
  TRANSFERS: 'TRANSFERS',
};

export class ImportType extends ValueObject<{ value: ImportTypeValue }> {
  private constructor(value: ImportTypeValue) {
    super({ value });
  }

  public static create(value: string): ImportType {
    if (!this.isValid(value)) {
      throw new Error(
        `Invalid import type: ${value}. Valid types: ${Object.values(IMPORT_TYPES).join(', ')}`
      );
    }
    return new ImportType(value as ImportTypeValue);
  }

  private static isValid(value: string): value is ImportTypeValue {
    return Object.values(IMPORT_TYPES).includes(value as ImportTypeValue);
  }

  public isProducts(): boolean {
    return this.props.value === 'PRODUCTS';
  }

  public isMovements(): boolean {
    return this.props.value === 'MOVEMENTS';
  }

  public isWarehouses(): boolean {
    return this.props.value === 'WAREHOUSES';
  }

  public isStock(): boolean {
    return this.props.value === 'STOCK';
  }

  public isTransfers(): boolean {
    return this.props.value === 'TRANSFERS';
  }

  public getValue(): ImportTypeValue {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }
}
