import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { ImportBatch } from '../entities/importBatch.entity';

export class ImportValidatedEvent extends DomainEvent {
  private readonly _occurredOn: Date;

  constructor(private readonly batch: ImportBatch) {
    super();
    this._occurredOn = new Date();
  }

  get eventName(): string {
    return 'ImportValidated';
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

  get validRows(): number {
    return this.batch.validRows;
  }

  get invalidRows(): number {
    return this.batch.invalidRows;
  }

  get validatedAt(): Date | undefined {
    return this.batch.validatedAt;
  }
}
