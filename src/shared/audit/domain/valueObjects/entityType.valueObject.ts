import { ValueObject } from '@shared/domain/base/valueObject.base';

export type EntityTypeValue =
  | 'User'
  | 'Role'
  | 'Permission'
  | 'Organization'
  | 'Product'
  | 'Warehouse'
  | 'Location'
  | 'Movement'
  | 'Transfer'
  | 'Stock'
  | 'Sale'
  | 'Return'
  | 'Report'
  | 'Session'
  | 'Otp'
  | 'System';

export interface IEntityTypeProps {
  value: EntityTypeValue;
}

export class EntityType extends ValueObject<IEntityTypeProps> {
  private constructor(props: IEntityTypeProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: EntityTypeValue): EntityType {
    return new EntityType({ value });
  }

  private validate(props: IEntityTypeProps): void {
    const validTypes: EntityTypeValue[] = [
      'User',
      'Role',
      'Permission',
      'Organization',
      'Product',
      'Warehouse',
      'Location',
      'Movement',
      'Transfer',
      'Stock',
      'Sale',
      'Return',
      'Report',
      'Session',
      'Otp',
      'System',
    ];

    if (!validTypes.includes(props.value)) {
      throw new Error(`Invalid entity type: ${props.value}`);
    }
  }

  public getValue(): EntityTypeValue {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: EntityType): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }
}
