import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { ReportTypeValue } from '../valueObjects';

export class ReportGeneratedEvent extends DomainEvent {
  private readonly _occurredOn: Date;

  constructor(
    private readonly _reportId: string,
    private readonly _type: ReportTypeValue,
    private readonly _orgId: string,
    private readonly _generatedBy: string
  ) {
    super();
    this._occurredOn = new Date();
  }

  get eventName(): string {
    return 'ReportGenerated';
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

  get orgId(): string {
    return this._orgId;
  }

  get generatedBy(): string {
    return this._generatedBy;
  }

  get generatedAt(): Date {
    return this._occurredOn;
  }
}
