import { ValueObject } from '@shared/domain/base/valueObject.base';

export const REPORT_FORMATS = {
  JSON: 'JSON',
  PDF: 'PDF',
  EXCEL: 'EXCEL',
  CSV: 'CSV',
} as const;

export type ReportFormatValue = (typeof REPORT_FORMATS)[keyof typeof REPORT_FORMATS];

export interface IReportFormatProps {
  value: ReportFormatValue;
}

export class ReportFormat extends ValueObject<IReportFormatProps> {
  private static readonly validFormats = Object.values(REPORT_FORMATS);

  private constructor(props: IReportFormatProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): ReportFormat {
    return new ReportFormat({ value: value.toUpperCase() as ReportFormatValue });
  }

  private validate(props: IReportFormatProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Report format cannot be empty');
    }

    if (!ReportFormat.validFormats.includes(props.value)) {
      throw new Error(
        `Invalid report format: ${props.value}. Valid formats are: ${ReportFormat.validFormats.join(', ')}`
      );
    }
  }

  public getValue(): ReportFormatValue {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: ReportFormat): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }

  public isExportFormat(): boolean {
    return (
      this.props.value === REPORT_FORMATS.PDF ||
      this.props.value === REPORT_FORMATS.EXCEL ||
      this.props.value === REPORT_FORMATS.CSV
    );
  }

  public getMimeType(): string {
    switch (this.props.value) {
      case REPORT_FORMATS.JSON:
        return 'application/json';
      case REPORT_FORMATS.PDF:
        return 'application/pdf';
      case REPORT_FORMATS.EXCEL:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case REPORT_FORMATS.CSV:
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }

  public getFileExtension(): string {
    switch (this.props.value) {
      case REPORT_FORMATS.JSON:
        return '.json';
      case REPORT_FORMATS.PDF:
        return '.pdf';
      case REPORT_FORMATS.EXCEL:
        return '.xlsx';
      case REPORT_FORMATS.CSV:
        return '.csv';
      default:
        return '';
    }
  }
}
