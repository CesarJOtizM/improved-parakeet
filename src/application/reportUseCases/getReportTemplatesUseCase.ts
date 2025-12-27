import { Injectable, Logger, Inject } from '@nestjs/common';
import { IReportTemplateRepository } from '@report/domain/ports/repositories';
import { IReportTemplateData, ReportTemplateMapper } from '@report/mappers';
import { ok, Result } from '@shared/domain/result';
import { DomainError } from '@shared/domain/result/domainError';

export interface IGetReportTemplatesRequest {
  orgId: string;
  type?: string;
  activeOnly?: boolean;
  createdBy?: string;
}

export interface IGetReportTemplatesResponse {
  success: boolean;
  message: string;
  data: IReportTemplateData[];
  timestamp: string;
}

@Injectable()
export class GetReportTemplatesUseCase {
  private readonly logger = new Logger(GetReportTemplatesUseCase.name);

  constructor(
    @Inject('ReportTemplateRepository')
    private readonly reportTemplateRepository: IReportTemplateRepository
  ) {}

  async execute(
    request: IGetReportTemplatesRequest
  ): Promise<Result<IGetReportTemplatesResponse, DomainError>> {
    this.logger.log('Getting report templates', {
      orgId: request.orgId,
      type: request.type,
      activeOnly: request.activeOnly,
    });

    let templates;

    if (request.activeOnly) {
      templates = await this.reportTemplateRepository.findActive(request.orgId);
    } else if (request.type) {
      templates = await this.reportTemplateRepository.findByType(request.type, request.orgId);
    } else if (request.createdBy) {
      templates = await this.reportTemplateRepository.findByCreatedBy(
        request.createdBy,
        request.orgId
      );
    } else {
      templates = await this.reportTemplateRepository.findAll(request.orgId);
    }

    // Apply additional filters
    if (request.type && !request.activeOnly) {
      templates = templates.filter(t => t.type.getValue() === request.type);
    }

    if (request.activeOnly && request.type) {
      templates = templates.filter(t => t.type.getValue() === request.type);
    }

    this.logger.log('Report templates retrieved', {
      count: templates.length,
      orgId: request.orgId,
    });

    return ok({
      success: true,
      message: 'Report templates retrieved successfully',
      data: ReportTemplateMapper.toResponseDataList(templates),
      timestamp: new Date().toISOString(),
    });
  }
}
