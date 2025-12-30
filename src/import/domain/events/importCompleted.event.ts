import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { ImportBatch } from '../entities/importBatch.entity';

export class ImportCompletedEvent extends DomainEvent {
  private readonly _occurredOn: Date;

  constructor(private readonly batch: ImportBatch) {
    super();
    this._occurredOn = new Date();
  }

  get eventName(): string {
    return 'ImportCompleted';
  }

  get occurredOn(): Date {
    return this._occurredOn;
  }

  get batchId(): string {
    return this.batch.id;
  }

  get orgId(): string {
    return this.batch.orgId!;
  }

  get importType(): string {
    return this.batch.type.getValue();
  }

  get totalRows(): number {
    return this.batch.totalRows;
  }

  get processedRows(): number {
    return this.batch.processedRows;
  }

  get validRows(): number {
    return this.batch.validRows;
  }

  get invalidRows(): number {
    return this.batch.invalidRows;
  }

  get completedAt(): Date | undefined {
    return this.batch.completedAt;
  }
}
