import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { ReportTypeValue } from '../valueObjects';

export class ReportTemplateCreatedEvent extends DomainEvent {
  private readonly _occurredOn: Date;

  constructor(
    private readonly _templateId: string,
    private readonly _name: string,
    private readonly _type: ReportTypeValue,
    private readonly _orgId: string,
    private readonly _createdBy: string
  ) {
    super();
    this._occurredOn = new Date();
  }

  get eventName(): string {
    return 'ReportTemplateCreated';
  }

  get occurredOn(): Date {
    return this._occurredOn;
  }

  get templateId(): string {
    return this._templateId;
  }

  get name(): string {
    return this._name;
  }

  get type(): ReportTypeValue {
    return this._type;
  }

  get orgId(): string {
    return this._orgId;
  }

  get createdBy(): string {
    return this._createdBy;
  }
}
