import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IValidationResultProps {
  value: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export class ValidationResult extends ValueObject<IValidationResultProps> {
  private constructor(props: IValidationResultProps) {
    super(props);
  }

  public static create(
    isValid: boolean,
    errors: string[] = [],
    warnings: string[] = []
  ): ValidationResult {
    return new ValidationResult({
      value: {
        isValid,
        errors: [...errors],
        warnings: [...warnings],
      },
    });
  }

  public static valid(): ValidationResult {
    return new ValidationResult({
      value: {
        isValid: true,
        errors: [],
        warnings: [],
      },
    });
  }

  public static invalid(errors: string[], warnings: string[] = []): ValidationResult {
    return new ValidationResult({
      value: {
        isValid: false,
        errors: [...errors],
        warnings: [...warnings],
      },
    });
  }

  public static fromErrors(errors: string[]): ValidationResult {
    return new ValidationResult({
      value: {
        isValid: errors.length === 0,
        errors: [...errors],
        warnings: [],
      },
    });
  }

  public isValid(): boolean {
    return this.props.value.isValid;
  }

  public hasErrors(): boolean {
    return this.props.value.errors.length > 0;
  }

  public hasWarnings(): boolean {
    return this.props.value.warnings.length > 0;
  }

  public getErrors(): string[] {
    return [...this.props.value.errors];
  }

  public getWarnings(): string[] {
    return [...this.props.value.warnings];
  }

  public getAllMessages(): string[] {
    return [...this.props.value.errors, ...this.props.value.warnings];
  }

  public getErrorCount(): number {
    return this.props.value.errors.length;
  }

  public getWarningCount(): number {
    return this.props.value.warnings.length;
  }

  public merge(other: ValidationResult): ValidationResult {
    const isValid = this.props.value.isValid && other.props.value.isValid;
    const errors = [...this.props.value.errors, ...other.props.value.errors];
    const warnings = [...this.props.value.warnings, ...other.props.value.warnings];
    return ValidationResult.create(isValid, errors, warnings);
  }

  public addError(error: string): ValidationResult {
    return ValidationResult.create(
      false,
      [...this.props.value.errors, error],
      this.props.value.warnings
    );
  }

  public addWarning(warning: string): ValidationResult {
    return ValidationResult.create(this.props.value.isValid, this.props.value.errors, [
      ...this.props.value.warnings,
      warning,
    ]);
  }

  public getValue(): { isValid: boolean; errors: string[]; warnings: string[] } {
    return {
      isValid: this.props.value.isValid,
      errors: [...this.props.value.errors],
      warnings: [...this.props.value.warnings],
    };
  }

  public toString(): string {
    if (this.props.value.isValid) {
      return 'Valid';
    }
    return `Invalid: ${this.props.value.errors.join(', ')}`;
  }
}
