import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

import { ExportCompletedEvent, ReportGeneratedEvent, ReportViewedEvent } from '../events';
import {
  IReportParametersInput,
  ReportFormat,
  ReportFormatValue,
  ReportParameters,
  ReportStatus,
  ReportStatusValue,
  ReportType,
  ReportTypeValue,
  REPORT_STATUSES,
} from '../valueObjects';

export interface IReportProps {
  type: ReportType;
  status: ReportStatus;
  parameters: ReportParameters;
  templateId?: string;
  generatedBy: string;
  generatedAt?: Date;
  format?: ReportFormat;
  exportedAt?: Date;
  errorMessage?: string;
}

export class Report extends AggregateRoot<IReportProps> {
  private constructor(props: IReportProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IReportProps, orgId: string): Report {
    const report = new Report(props, undefined, orgId);
    return report;
  }

  public static reconstitute(props: IReportProps, id: string, orgId: string): Report {
    return new Report(props, id, orgId);
  }

  // Getters
  get type(): ReportType {
    return this.props.type;
  }

  get status(): ReportStatus {
    return this.props.status;
  }

  get parameters(): ReportParameters {
    return this.props.parameters;
  }

  get templateId(): string | undefined {
    return this.props.templateId;
  }

  get generatedBy(): string {
    return this.props.generatedBy;
  }

  get generatedAt(): Date | undefined {
    return this.props.generatedAt;
  }

  get format(): ReportFormat | undefined {
    return this.props.format;
  }

  get exportedAt(): Date | undefined {
    return this.props.exportedAt;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  // Business methods
  public markAsGenerating(): void {
    if (!this.props.status.canTransitionTo(ReportStatus.generating())) {
      throw new Error(`Cannot transition from ${this.props.status.getValue()} to GENERATING`);
    }
    this.props.status = ReportStatus.generating();
    this.updateTimestamp();
  }

  public complete(): void {
    if (!this.props.status.canTransitionTo(ReportStatus.completed())) {
      throw new Error(`Cannot transition from ${this.props.status.getValue()} to COMPLETED`);
    }
    this.props.status = ReportStatus.completed();
    this.props.generatedAt = new Date();
    this.updateTimestamp();
    this.addDomainEvent(
      new ReportGeneratedEvent(
        this.id,
        this.props.type.getValue(),
        this.orgId!,
        this.props.generatedBy
      )
    );
  }

  public fail(errorMessage: string): void {
    if (!this.props.status.canTransitionTo(ReportStatus.failed())) {
      throw new Error(`Cannot transition from ${this.props.status.getValue()} to FAILED`);
    }
    this.props.status = ReportStatus.failed();
    this.props.errorMessage = errorMessage;
    this.updateTimestamp();
  }

  public markAsViewed(viewedBy: string): void {
    this.addDomainEvent(
      new ReportViewedEvent(this.id, this.props.type.getValue(), this.orgId!, viewedBy)
    );
  }

  public markAsExported(format: ReportFormat, exportedBy: string): void {
    if (
      this.props.status.getValue() !== REPORT_STATUSES.COMPLETED &&
      this.props.status.getValue() !== REPORT_STATUSES.EXPORTED
    ) {
      throw new Error('Can only export completed reports');
    }
    this.props.status = ReportStatus.exported();
    this.props.format = format;
    this.props.exportedAt = new Date();
    this.updateTimestamp();
    this.addDomainEvent(
      new ExportCompletedEvent(
        this.id,
        this.props.type.getValue(),
        format.getValue(),
        this.orgId!,
        exportedBy
      )
    );
  }

  public canBeExported(): boolean {
    return (
      this.props.status.getValue() === REPORT_STATUSES.COMPLETED ||
      this.props.status.getValue() === REPORT_STATUSES.EXPORTED
    );
  }

  public isCompleted(): boolean {
    return this.props.status.isCompleted();
  }

  public isFailed(): boolean {
    return this.props.status.isFailed();
  }

  public toPlainObject(): {
    id: string;
    type: ReportTypeValue;
    status: ReportStatusValue;
    parameters: IReportParametersInput;
    templateId?: string;
    generatedBy: string;
    generatedAt?: Date;
    format?: ReportFormatValue;
    exportedAt?: Date;
    errorMessage?: string;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      type: this.props.type.getValue(),
      status: this.props.status.getValue(),
      parameters: this.props.parameters.getValue(),
      templateId: this.props.templateId,
      generatedBy: this.props.generatedBy,
      generatedAt: this.props.generatedAt,
      format: this.props.format?.getValue(),
      exportedAt: this.props.exportedAt,
      errorMessage: this.props.errorMessage,
      orgId: this.orgId!,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
