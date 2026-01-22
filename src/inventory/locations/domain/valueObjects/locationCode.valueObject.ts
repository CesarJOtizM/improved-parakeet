import { ValueObject } from '@shared/domain/base/valueObject.base';

interface ILocationCodeProps {
  value: string;
}

export class LocationCode extends ValueObject<ILocationCodeProps> {
  private constructor(props: ILocationCodeProps) {
    super(props);
  }

  public static create(code: string): LocationCode {
    if (!code || code.trim().length === 0) {
      throw new Error('Location code cannot be empty');
    }

    const normalizedCode = code.trim().toUpperCase();

    if (normalizedCode.length > 50) {
      throw new Error('Location code cannot exceed 50 characters');
    }

    return new LocationCode({ value: normalizedCode });
  }

  public getValue(): string {
    return this.props.value;
  }

  protected equalsCore(other: LocationCode): boolean {
    return this.props.value === other.props.value;
  }
}
