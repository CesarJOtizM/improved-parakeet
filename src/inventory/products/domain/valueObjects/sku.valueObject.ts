import { ValueObject } from '@shared/domain/base/valueObject.base';
import { ValidationError, Result, err, ok } from '@shared/domain/result';

export interface ISkuProps {
  value: string;
}

export class SKU extends ValueObject<ISkuProps> {
  private constructor(props: ISkuProps) {
    super(props);
  }

  public static create(value: string): Result<SKU, ValidationError> {
    const trimmed = value.trim();
    const validationResult = this.validate(trimmed);

    if (validationResult.isErr()) {
      const error = validationResult.unwrapErr();
      return err(error);
    }

    return ok(new SKU({ value: trimmed }));
  }

  /**
   * Reconstitute SKU from persistence (bypasses validation)
   * Use only when loading from database where data is already validated
   */
  public static reconstitute(value: string): SKU {
    return new SKU({ value });
  }

  private static validate(value: string): Result<void, ValidationError> {
    if (!value || value.trim().length === 0) {
      return err(new ValidationError('SKU cannot be empty'));
    }

    const trimmed = value.trim();

    if (trimmed.length < 3) {
      return err(new ValidationError('SKU must be at least 3 characters long'));
    }

    if (trimmed.length > 50) {
      return err(new ValidationError('SKU must be at most 50 characters long'));
    }

    // Alphanumeric, underscore, and hyphen only
    const skuRegex = /^[a-zA-Z0-9_-]+$/;
    if (!skuRegex.test(trimmed)) {
      return err(
        new ValidationError('SKU can only contain letters, numbers, underscores, and hyphens')
      );
    }

    // Cannot start or end with underscore or hyphen
    if (trimmed.startsWith('_') || trimmed.startsWith('-')) {
      return err(new ValidationError('SKU cannot start with underscore or hyphen'));
    }

    if (trimmed.endsWith('_') || trimmed.endsWith('-')) {
      return err(new ValidationError('SKU cannot end with underscore or hyphen'));
    }

    return ok(undefined);
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: SKU): boolean {
    if (!other) {
      return false;
    }
    return this.props.value.toLowerCase() === other.props.value.toLowerCase();
  }
}
