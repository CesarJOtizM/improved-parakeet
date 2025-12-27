import { IReportProps, Report } from '@report/domain/entities/report.entity';
import {
  IReportParametersInput,
  ReportFormatValue,
  ReportParameters,
  ReportStatus,
  ReportStatusValue,
  ReportType,
  ReportTypeValue,
} from '@report/domain/valueObjects';

/**
 * Input for creating a report
 */
export interface IReportCreateInput {
  type: string;
  parameters: IReportParametersInput;
  generatedBy: string;
  templateId?: string;
}

/**
 * Report data for response
 */
export interface IReportData {
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
}

/**
 * Mapper for Report entity
 * Handles conversion between DTO/request and domain entity
 */
export class ReportMapper {
  /**
   * Convert DTO/request to domain props (creates Value Objects)
   */
  public static toDomainProps(input: IReportCreateInput): IReportProps {
    return {
      type: ReportType.create(input.type),
      status: ReportStatus.pending(),
      parameters: ReportParameters.create(input.parameters),
      generatedBy: input.generatedBy,
      templateId: input.templateId,
    };
  }

  /**
   * Convert domain entity to response data (extracts primitives from Value Objects)
   */
  public static toResponseData(report: Report): IReportData {
    return {
      id: report.id,
      type: report.type.getValue(),
      status: report.status.getValue(),
      parameters: report.parameters.getValue(),
      templateId: report.templateId,
      generatedBy: report.generatedBy,
      generatedAt: report.generatedAt,
      format: report.format?.getValue(),
      exportedAt: report.exportedAt,
      errorMessage: report.errorMessage,
      orgId: report.orgId!,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  /**
   * Convert array of entities to response data array
   */
  public static toResponseDataList(reports: Report[]): IReportData[] {
    return reports.map(report => ReportMapper.toResponseData(report));
  }

  /**
   * Create a Report entity from input
   */
  public static createEntity(input: IReportCreateInput, orgId: string): Report {
    const props = ReportMapper.toDomainProps(input);
    return Report.create(props, orgId);
  }
}
