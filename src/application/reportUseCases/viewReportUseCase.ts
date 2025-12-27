import { Injectable, Logger } from '@nestjs/common';
import { IReportViewResult, ReportViewService } from '@report/domain/services';
import { IReportParametersInput, ReportType } from '@report/domain/valueObjects';
import { err, ok, Result } from '@shared/domain/result';
import { DomainError, ValidationError } from '@shared/domain/result/domainError';

export interface IViewReportRequest {
  type: string;
  parameters: IReportParametersInput;
  orgId: string;
  viewedBy: string;
}

export interface IViewReportResponse {
  success: boolean;
  message: string;
  data: IReportViewResult<unknown>;
  timestamp: string;
}

@Injectable()
export class ViewReportUseCase {
  private readonly logger = new Logger(ViewReportUseCase.name);

  constructor(private readonly reportViewService: ReportViewService) {}

  async execute(request: IViewReportRequest): Promise<Result<IViewReportResponse, DomainError>> {
    this.logger.log('Viewing report', {
      type: request.type,
      orgId: request.orgId,
    });

    try {
      // Validate report type
      let reportType: ReportType;
      try {
        reportType = ReportType.create(request.type);
      } catch {
        return err(new ValidationError(`Invalid report type: ${request.type}`));
      }

      // Generate report view data (on-demand, no persistence)
      const viewResult = await this.reportViewService.viewReport(
        reportType.getValue(),
        request.parameters,
        request.orgId
      );

      this.logger.log('Report viewed successfully', {
        type: request.type,
        totalRecords: viewResult.metadata.totalRecords,
        orgId: request.orgId,
      });

      return ok({
        success: true,
        message: 'Report generated successfully',
        data: viewResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to view report', {
        type: request.type,
        orgId: request.orgId,
        error,
      });
      return err(
        new ValidationError(error instanceof Error ? error.message : 'Failed to generate report')
      );
    }
  }
}
