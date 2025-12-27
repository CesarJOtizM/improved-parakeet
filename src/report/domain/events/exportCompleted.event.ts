import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { ReportFormatValue, ReportTypeValue } from '../valueObjects';

export class ExportCompletedEvent extends DomainEvent {
  private readonly _occurredOn: Date;

  constructor(
    private readonly _reportId: string,
    private readonly _type: ReportTypeValue,
    private readonly _format: ReportFormatValue,
    private readonly _orgId: string,
    private readonly _exportedBy: string
  ) {
    super();
    this._occurredOn = new Date();
  }

  get eventName(): string {
    return 'ExportCompleted';
  }

  get occurredOn(): Date {
    return this._occurredOn;
  }

  get reportId(): string {
    return this._reportId;
  }

  get type(): ReportTypeValue {
    return this._type;
  }

  get format(): ReportFormatValue {
    return this._format;
  }

  get orgId(): string {
    return this._orgId;
  }

  get exportedBy(): string {
    return this._exportedBy;
  }

  get exportedAt(): Date {
    return this._occurredOn;
  }
}
