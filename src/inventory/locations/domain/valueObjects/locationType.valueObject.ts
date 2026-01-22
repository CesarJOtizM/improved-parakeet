import { ValueObject } from '@shared/domain/base/valueObject.base';

export enum LocationTypeEnum {
  ZONE = 'ZONE',
  AISLE = 'AISLE',
  RACK = 'RACK',
  SHELF = 'SHELF',
  BIN = 'BIN',
}

interface ILocationTypeProps {
  value: LocationTypeEnum;
}

export class LocationType extends ValueObject<ILocationTypeProps> {
  private constructor(props: ILocationTypeProps) {
    super(props);
  }

  public static create(type: string): LocationType {
    const normalizedType = type.toUpperCase() as LocationTypeEnum;

    if (!Object.values(LocationTypeEnum).includes(normalizedType)) {
      throw new Error(
        `Invalid location type: ${type}. Valid types are: ${Object.values(LocationTypeEnum).join(', ')}`
      );
    }

    return new LocationType({ value: normalizedType });
  }

  public static zone(): LocationType {
    return new LocationType({ value: LocationTypeEnum.ZONE });
  }

  public static aisle(): LocationType {
    return new LocationType({ value: LocationTypeEnum.AISLE });
  }

  public static rack(): LocationType {
    return new LocationType({ value: LocationTypeEnum.RACK });
  }

  public static shelf(): LocationType {
    return new LocationType({ value: LocationTypeEnum.SHELF });
  }

  public static bin(): LocationType {
    return new LocationType({ value: LocationTypeEnum.BIN });
  }

  public getValue(): LocationTypeEnum {
    return this.props.value;
  }

  public isZone(): boolean {
    return this.props.value === LocationTypeEnum.ZONE;
  }

  public isAisle(): boolean {
    return this.props.value === LocationTypeEnum.AISLE;
  }

  public isRack(): boolean {
    return this.props.value === LocationTypeEnum.RACK;
  }

  public isShelf(): boolean {
    return this.props.value === LocationTypeEnum.SHELF;
  }

  public isBin(): boolean {
    return this.props.value === LocationTypeEnum.BIN;
  }

  protected equalsCore(other: LocationType): boolean {
    return this.props.value === other.props.value;
  }
}
