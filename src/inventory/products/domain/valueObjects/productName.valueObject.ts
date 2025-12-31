import { ValueObject } from '@shared/domain/base/valueObject.base';
import { ValidationError, Result, err, ok } from '@shared/domain/result';

export interface IProductNameProps {
  value: string;
}

export class ProductName extends ValueObject<IProductNameProps> {
  private constructor(props: IProductNameProps) {
    super(props);
  }

  public static create(value: string): Result<ProductName, ValidationError> {
    const trimmed = value.trim();
    const validationResult = this.validate(trimmed);

    if (validationResult.isErr()) {
      const error = validationResult.unwrapErr();
      return err(error);
    }

    return ok(new ProductName({ value: trimmed }));
  }

  /**
   * Reconstitute ProductName from persistence (bypasses validation)
   * Use only when loading from database where data is already validated
   */
  public static reconstitute(value: string): ProductName {
    return new ProductName({ value });
  }

  private static validate(value: string): Result<void, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('Product name cannot be empty'));
    }

    const trimmed = value.trim();

    if (trimmed.length < 2) {
      return err(new ValidationError('Product name must be at least 2 characters long'));
    }

    if (trimmed.length > 200) {
      return err(new ValidationError('Product name must be at most 200 characters long'));
    }

    return ok(undefined);
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: ProductName): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }
}
