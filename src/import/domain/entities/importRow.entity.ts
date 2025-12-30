import { Entity } from '@shared/domain/base/entity.base';

import { ValidationResult } from '../valueObjects/validationResult.valueObject';

export interface IImportRowProps {
  rowNumber: number;
  data: Record<string, unknown>;
  validationResult: ValidationResult;
}

export class ImportRow extends Entity<IImportRowProps> {
  private constructor(props: IImportRowProps, id?: string, orgId?: string) {
    super(props, id, orgId);
    this.validate(props);
  }

  public static create(props: IImportRowProps, orgId: string): ImportRow {
    return new ImportRow(props, undefined, orgId);
  }

  public static reconstitute(props: IImportRowProps, id: string, orgId: string): ImportRow {
    return new ImportRow(props, id, orgId);
  }

  private validate(props: IImportRowProps): void {
    if (props.rowNumber < 1) {
      throw new Error('Row number must be at least 1');
    }

    if (!props.data) {
      throw new Error('Row data is required');
    }

    if (!props.validationResult) {
      throw new Error('Validation result is required');
    }
  }

  public updateValidation(validationResult: ValidationResult): void {
    this.props.validationResult = validationResult;
    this.updateTimestamp();
  }

  public isValid(): boolean {
    return this.props.validationResult.isValid();
  }

  public hasErrors(): boolean {
    return this.props.validationResult.hasErrors();
  }

  public hasWarnings(): boolean {
    return this.props.validationResult.hasWarnings();
  }

  public getColumnValue(columnName: string): unknown {
    return this.props.data[columnName];
  }

  public setColumnValue(columnName: string, value: unknown): void {
    this.props.data[columnName] = value;
    this.updateTimestamp();
  }

  // Getters
  get rowNumber(): number {
    return this.props.rowNumber;
  }

  get data(): Record<string, unknown> {
    return { ...this.props.data };
  }

  get validationResult(): ValidationResult {
    return this.props.validationResult;
  }

  get errors(): string[] {
    return this.props.validationResult.getErrors();
  }

  get warnings(): string[] {
    return this.props.validationResult.getWarnings();
  }
}
