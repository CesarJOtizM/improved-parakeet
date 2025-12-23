import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IUnitValueObjectProps {
  value: {
    code: string;
    name: string;
    precision: number;
  };
}

export class UnitValueObject extends ValueObject<IUnitValueObjectProps> {
  private constructor(props: IUnitValueObjectProps) {
    super(props);
    this.validate(props);
  }

  public static create(code: string, name: string, precision: number): UnitValueObject {
    return new UnitValueObject({
      value: { code: code.trim(), name: name.trim(), precision },
    });
  }

  private validate(props: IUnitValueObjectProps): void {
    // Validate code
    if (!props.value.code || props.value.code.trim().length === 0) {
      throw new Error('Unit code is required');
    }

    const trimmedCode = props.value.code.trim();

    if (trimmedCode.length < 1) {
      throw new Error('Unit code must be at least 1 character long');
    }

    if (trimmedCode.length > 20) {
      throw new Error('Unit code must be at most 20 characters long');
    }

    // Alphanumeric and hyphens only
    const codeRegex = /^[a-zA-Z0-9-]+$/;
    if (!codeRegex.test(trimmedCode)) {
      throw new Error('Unit code can only contain letters, numbers, and hyphens');
    }

    // Validate name
    if (!props.value.name || props.value.name.trim().length === 0) {
      throw new Error('Unit name is required');
    }

    const trimmedName = props.value.name.trim();

    if (trimmedName.length < 2) {
      throw new Error('Unit name must be at least 2 characters long');
    }

    if (trimmedName.length > 100) {
      throw new Error('Unit name must be at most 100 characters long');
    }

    // Validate precision
    if (props.value.precision < 0 || props.value.precision > 6) {
      throw new Error('Precision must be between 0 and 6');
    }
  }

  public getCode(): string {
    return this.props.value.code;
  }

  public getName(): string {
    return this.props.value.name;
  }

  public getPrecision(): number {
    return this.props.value.precision;
  }

  public equals(other?: UnitValueObject): boolean {
    if (!other) {
      return false;
    }
    return (
      this.props.value.code === other.props.value.code &&
      this.props.value.name === other.props.value.name &&
      this.props.value.precision === other.props.value.precision
    );
  }
}
