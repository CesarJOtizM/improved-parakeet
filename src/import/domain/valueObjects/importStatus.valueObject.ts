import { ValueObject } from '@shared/domain/base/valueObject.base';

export type ImportStatusValue =
  | 'PENDING'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export const IMPORT_STATUSES: Record<string, ImportStatusValue> = {
  PENDING: 'PENDING',
  VALIDATING: 'VALIDATING',
  VALIDATED: 'VALIDATED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

export class ImportStatus extends ValueObject<{ value: ImportStatusValue }> {
  private constructor(value: ImportStatusValue) {
    super({ value });
  }

  public static create(value: string): ImportStatus {
    if (!this.isValid(value)) {
      throw new Error(
        `Invalid import status: ${value}. Valid statuses: ${Object.values(IMPORT_STATUSES).join(', ')}`
      );
    }
    return new ImportStatus(value as ImportStatusValue);
  }

  private static isValid(value: string): value is ImportStatusValue {
    return Object.values(IMPORT_STATUSES).includes(value as ImportStatusValue);
  }

  public isPending(): boolean {
    return this.props.value === 'PENDING';
  }

  public isValidating(): boolean {
    return this.props.value === 'VALIDATING';
  }

  public isValidated(): boolean {
    return this.props.value === 'VALIDATED';
  }

  public isProcessing(): boolean {
    return this.props.value === 'PROCESSING';
  }

  public isCompleted(): boolean {
    return this.props.value === 'COMPLETED';
  }

  public isFailed(): boolean {
    return this.props.value === 'FAILED';
  }

  public canValidate(): boolean {
    return this.props.value === 'PENDING';
  }

  public canProcess(): boolean {
    return this.props.value === 'VALIDATED';
  }

  public canComplete(): boolean {
    return this.props.value === 'PROCESSING';
  }

  public canFail(): boolean {
    return (
      this.props.value === 'VALIDATING' ||
      this.props.value === 'PROCESSING' ||
      this.props.value === 'PENDING'
    );
  }

  public isTerminal(): boolean {
    return this.props.value === 'COMPLETED' || this.props.value === 'FAILED';
  }

  public getValue(): ImportStatusValue {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }
}
