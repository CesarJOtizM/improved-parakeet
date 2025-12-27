import {
  IReportTemplateProps,
  ReportTemplate,
} from '@report/domain/entities/reportTemplate.entity';
import {
  IReportParametersInput,
  ReportParameters,
  ReportType,
  ReportTypeValue,
} from '@report/domain/valueObjects';

/**
 * Input for creating a report template
 */
export interface IReportTemplateCreateInput {
  name: string;
  description?: string;
  type: string;
  defaultParameters: IReportParametersInput;
  createdBy: string;
}

/**
 * Input for updating a report template
 */
export interface IReportTemplateUpdateInput {
  name?: string;
  description?: string;
  defaultParameters?: IReportParametersInput;
  isActive?: boolean;
  updatedBy: string;
}

/**
 * Report template data for response
 */
export interface IReportTemplateData {
  id: string;
  name: string;
  description?: string;
  type: ReportTypeValue;
  defaultParameters: IReportParametersInput;
  isActive: boolean;
  createdBy: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mapper for ReportTemplate entity
 * Handles conversion between DTO/request and domain entity
 */
export class ReportTemplateMapper {
  /**
   * Convert DTO/request to domain props (creates Value Objects)
   */
  public static toDomainProps(input: IReportTemplateCreateInput): IReportTemplateProps {
    return {
      name: input.name.trim(),
      description: input.description?.trim(),
      type: ReportType.create(input.type),
      defaultParameters: ReportParameters.create(input.defaultParameters),
      isActive: true,
      createdBy: input.createdBy,
    };
  }

  /**
   * Convert domain entity to response data (extracts primitives from Value Objects)
   */
  public static toResponseData(template: ReportTemplate): IReportTemplateData {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type.getValue(),
      defaultParameters: template.defaultParameters.getValue(),
      isActive: template.isActive,
      createdBy: template.createdBy,
      orgId: template.orgId!,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Convert array of entities to response data array
   */
  public static toResponseDataList(templates: ReportTemplate[]): IReportTemplateData[] {
    return templates.map(template => ReportTemplateMapper.toResponseData(template));
  }

  /**
   * Create a ReportTemplate entity from input
   */
  public static createEntity(input: IReportTemplateCreateInput, orgId: string): ReportTemplate {
    const props = ReportTemplateMapper.toDomainProps(input);
    return ReportTemplate.create(props, orgId);
  }
}
