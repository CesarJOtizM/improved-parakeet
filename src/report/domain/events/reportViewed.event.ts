import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { ReportTypeValue } from '../valueObjects';

export class ReportViewedEvent extends DomainEvent {
  private readonly _occurredOn: Date;

  constructor(
    private readonly _reportId: string,
    private readonly _type: ReportTypeValue,
    private readonly _orgId: string,
    private readonly _viewedBy: string
  ) {
    super();
    this._occurredOn = new Date();
  }

  get eventName(): string {
    return 'ReportViewed';
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

  get viewedBy(): string {
    return this._viewedBy;
  }

  get viewedAt(): Date {
    return this._occurredOn;
  }
}
