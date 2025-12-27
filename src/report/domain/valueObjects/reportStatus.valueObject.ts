import { ValueObject } from '@shared/domain/base/valueObject.base';

export const REPORT_STATUSES = {
  PENDING: 'PENDING',
  GENERATING: 'GENERATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  EXPORTED: 'EXPORTED',
} as const;

export type ReportStatusValue = (typeof REPORT_STATUSES)[keyof typeof REPORT_STATUSES];

export interface IReportStatusProps {
  value: ReportStatusValue;
}

export class ReportStatus extends ValueObject<IReportStatusProps> {
  private static readonly validStatuses = Object.values(REPORT_STATUSES);

  private static readonly validTransitions: Record<ReportStatusValue, ReportStatusValue[]> = {
    [REPORT_STATUSES.PENDING]: [REPORT_STATUSES.GENERATING, REPORT_STATUSES.FAILED],
    [REPORT_STATUSES.GENERATING]: [REPORT_STATUSES.COMPLETED, REPORT_STATUSES.FAILED],
    [REPORT_STATUSES.COMPLETED]: [REPORT_STATUSES.EXPORTED],
    [REPORT_STATUSES.FAILED]: [],
    [REPORT_STATUSES.EXPORTED]: [],
  };

  private constructor(props: IReportStatusProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): ReportStatus {
    return new ReportStatus({ value: value as ReportStatusValue });
  }

  public static pending(): ReportStatus {
    return new ReportStatus({ value: REPORT_STATUSES.PENDING });
  }

  public static generating(): ReportStatus {
    return new ReportStatus({ value: REPORT_STATUSES.GENERATING });
  }

  public static completed(): ReportStatus {
    return new ReportStatus({ value: REPORT_STATUSES.COMPLETED });
  }

  public static failed(): ReportStatus {
    return new ReportStatus({ value: REPORT_STATUSES.FAILED });
  }

  public static exported(): ReportStatus {
    return new ReportStatus({ value: REPORT_STATUSES.EXPORTED });
  }

  private validate(props: IReportStatusProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Report status cannot be empty');
    }

    if (!ReportStatus.validStatuses.includes(props.value)) {
      throw new Error(
        `Invalid report status: ${props.value}. Valid statuses are: ${ReportStatus.validStatuses.join(', ')}`
      );
    }
  }

  public getValue(): ReportStatusValue {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: ReportStatus): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }

  public canTransitionTo(newStatus: ReportStatus): boolean {
    const allowedTransitions = ReportStatus.validTransitions[this.props.value];
    return allowedTransitions.includes(newStatus.props.value);
  }

  public isPending(): boolean {
    return this.props.value === REPORT_STATUSES.PENDING;
  }

  public isGenerating(): boolean {
    return this.props.value === REPORT_STATUSES.GENERATING;
  }

  public isCompleted(): boolean {
    return this.props.value === REPORT_STATUSES.COMPLETED;
  }

  public isFailed(): boolean {
    return this.props.value === REPORT_STATUSES.FAILED;
  }

  public isExported(): boolean {
    return this.props.value === REPORT_STATUSES.EXPORTED;
  }

  public isFinal(): boolean {
    return this.isFailed() || this.isExported();
  }
}
