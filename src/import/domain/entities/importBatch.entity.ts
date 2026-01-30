import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

import { ImportCompletedEvent } from '../events/importCompleted.event';
import { ImportStartedEvent } from '../events/importStarted.event';
import { ImportValidatedEvent } from '../events/importValidated.event';
import { ImportStatus } from '../valueObjects/importStatus.valueObject';
import { ImportType } from '../valueObjects/importType.valueObject';

import { ImportRow } from './importRow.entity';

export interface IImportBatchProps {
  type: ImportType;
  status: ImportStatus;
  fileName: string;
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  startedAt?: Date;
  validatedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  note?: string;
  createdBy: string;
}

export class ImportBatch extends AggregateRoot<IImportBatchProps> {
  private rows: ImportRow[] = [];

  private constructor(props: IImportBatchProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IImportBatchProps, orgId: string): ImportBatch {
    const batch = new ImportBatch(props, undefined, orgId);
    return batch;
  }

  public static reconstitute(props: IImportBatchProps, id: string, orgId: string): ImportBatch {
    return new ImportBatch(props, id, orgId);
  }

  // Business Methods

  public start(): void {
    if (!this.props.status.canValidate()) {
      throw new Error('Import batch can only be started when status is PENDING');
    }

    this.props.status = ImportStatus.create('VALIDATING');
    this.props.startedAt = new Date();
    this.updateTimestamp();

    // Emit ImportStartedEvent
    const event = new ImportStartedEvent(this);
    this.addDomainEvent(event);
  }

  public addRow(row: ImportRow): void {
    // Rows can only be added when status is PENDING or VALIDATING
    if (!this.props.status.isPending() && !this.props.status.isValidating()) {
      throw new Error('Rows can only be added when status is PENDING or VALIDATING');
    }

    this.rows.push(row);
    this.props.totalRows = this.rows.length;
    this.updateTimestamp();
  }

  public setRows(rows: ImportRow[]): void {
    if (!this.props.status.isPending() && !this.props.status.isValidating()) {
      throw new Error('Rows can only be set when status is PENDING or VALIDATING');
    }

    this.rows = [...rows];
    this.props.totalRows = this.rows.length;
    this.updateTimestamp();
  }

  /**
   * Restore rows from persistence without status validation.
   * This is used only when reconstituting the entity from the database.
   * Do not use this method for business operations - use setRows() instead.
   */
  public restoreRows(rows: ImportRow[]): void {
    this.rows = [...rows];
  }

  public markAsValidated(): void {
    if (!this.props.status.isValidating()) {
      throw new Error('Import batch can only be marked as validated when status is VALIDATING');
    }

    // Calculate valid and invalid row counts
    this.props.validRows = this.rows.filter(row => row.isValid()).length;
    this.props.invalidRows = this.rows.filter(row => !row.isValid()).length;
    this.props.status = ImportStatus.create('VALIDATED');
    this.props.validatedAt = new Date();
    this.updateTimestamp();

    // Emit ImportValidatedEvent
    const event = new ImportValidatedEvent(this);
    this.addDomainEvent(event);
  }

  public markAsProcessing(): void {
    if (!this.props.status.canProcess()) {
      throw new Error('Import batch can only be processed when status is VALIDATED');
    }

    this.props.status = ImportStatus.create('PROCESSING');
    this.updateTimestamp();
  }

  public incrementProcessedRows(): void {
    if (!this.props.status.isProcessing()) {
      throw new Error('Can only increment processed rows when status is PROCESSING');
    }

    this.props.processedRows++;
    this.updateTimestamp();
  }

  public updateProgress(processedRows: number): void {
    if (!this.props.status.isProcessing()) {
      throw new Error('Can only update progress when status is PROCESSING');
    }

    this.props.processedRows = processedRows;
    this.updateTimestamp();
  }

  public complete(): void {
    if (!this.props.status.canComplete()) {
      throw new Error('Import batch can only be completed when status is PROCESSING');
    }

    this.props.status = ImportStatus.create('COMPLETED');
    this.props.completedAt = new Date();
    this.updateTimestamp();

    // Emit ImportCompletedEvent
    const event = new ImportCompletedEvent(this);
    this.addDomainEvent(event);
  }

  public fail(errorMessage: string): void {
    if (!this.props.status.canFail()) {
      throw new Error('Import batch cannot be marked as failed in current status');
    }

    this.props.status = ImportStatus.create('FAILED');
    this.props.errorMessage = errorMessage;
    this.props.completedAt = new Date();
    this.updateTimestamp();
  }

  // Query Methods

  public getRows(): ImportRow[] {
    return [...this.rows];
  }

  public getValidRows(): ImportRow[] {
    return this.rows.filter(row => row.isValid());
  }

  public getInvalidRows(): ImportRow[] {
    return this.rows.filter(row => !row.isValid());
  }

  public getRowByNumber(rowNumber: number): ImportRow | undefined {
    return this.rows.find(row => row.rowNumber === rowNumber);
  }

  public getProgress(): number {
    if (this.props.totalRows === 0) return 0;
    return Math.round((this.props.processedRows / this.props.totalRows) * 100);
  }

  public canBeRetried(): boolean {
    return this.props.status.isFailed();
  }

  // Getters
  get type(): ImportType {
    return this.props.type;
  }

  get status(): ImportStatus {
    return this.props.status;
  }

  get fileName(): string {
    return this.props.fileName;
  }

  get totalRows(): number {
    return this.props.totalRows;
  }

  get processedRows(): number {
    return this.props.processedRows;
  }

  get validRows(): number {
    return this.props.validRows;
  }

  get invalidRows(): number {
    return this.props.invalidRows;
  }

  get startedAt(): Date | undefined {
    return this.props.startedAt;
  }

  get validatedAt(): Date | undefined {
    return this.props.validatedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get note(): string | undefined {
    return this.props.note;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }
}
