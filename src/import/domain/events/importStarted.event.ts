import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { ImportBatch } from '../entities/importBatch.entity';

export class ImportStartedEvent extends DomainEvent {
  private readonly _occurredOn: Date;

  constructor(private readonly batch: ImportBatch) {
    super();
    this._occurredOn = new Date();
  }

  get eventName(): string {
    return 'ImportStarted';
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

  get fileName(): string {
    return this.batch.fileName;
  }

  get totalRows(): number {
    return this.batch.totalRows;
  }

  get createdBy(): string {
    return this.batch.createdBy;
  }
}
