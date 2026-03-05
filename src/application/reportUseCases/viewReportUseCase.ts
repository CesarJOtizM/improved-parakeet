import { Injectable, Logger } from '@nestjs/common';
import { IReportViewResult, ReportViewService, ReportCacheService } from '@report/domain/services';
import { IReportParametersInput, ReportType } from '@report/domain/valueObjects';
import { REPORT_GENERATION_ERROR, REPORT_INVALID_TYPE } from '@shared/constants/error-codes';
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
  fromCache?: boolean;
}

@Injectable()
export class ViewReportUseCase {
  private readonly logger = new Logger(ViewReportUseCase.name);

  constructor(
    private readonly reportViewService: ReportViewService,
    private readonly reportCacheService: ReportCacheService
  ) {}

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
        return err(
          new ValidationError(`Invalid report type: ${request.type}`, REPORT_INVALID_TYPE)
        );
      }

      const reportTypeValue = reportType.getValue();
      let viewResult: IReportViewResult<unknown>;
      let fromCache = false;

      // Check if report is cacheable
      if (this.reportCacheService.isCacheable(reportTypeValue, request.parameters, false)) {
        const cacheKey = this.reportCacheService.generateKey(
          reportTypeValue,
          request.parameters,
          undefined,
          false
        );

        // Try to get from cache
        const cachedResult =
          await this.reportCacheService.get<IReportViewResult<unknown>>(cacheKey);
        if (cachedResult) {
          this.logger.log('Report retrieved from cache', {
            type: request.type,
            orgId: request.orgId,
            cacheKey,
          });
          viewResult = cachedResult;
          fromCache = true;
        } else {
          // Cache miss - generate report
          this.logger.log('Cache miss - generating report', {
            type: request.type,
            orgId: request.orgId,
            cacheKey,
          });
          viewResult = await this.reportViewService.viewReport(
            reportTypeValue,
            request.parameters,
            request.orgId
          );

          // Save to cache with TTL
          const ttl = this.reportCacheService.getTtlForView(reportTypeValue);
          await this.reportCacheService.set(cacheKey, viewResult, ttl);
          this.logger.log('Report cached successfully', {
            type: request.type,
            orgId: request.orgId,
            cacheKey,
            ttl,
          });
        }
      } else {
        // Not cacheable - generate directly
        this.logger.log('Report not cacheable - generating directly', {
          type: request.type,
          orgId: request.orgId,
        });
        viewResult = await this.reportViewService.viewReport(
          reportTypeValue,
          request.parameters,
          request.orgId
        );
      }

      this.logger.log('Report viewed successfully', {
        type: request.type,
        totalRecords: viewResult.metadata.totalRecords,
        orgId: request.orgId,
        fromCache,
      });

      return ok({
        success: true,
        message: 'Report generated successfully',
        data: viewResult,
        timestamp: new Date().toISOString(),
        fromCache,
      });
    } catch (error) {
      this.logger.error('Failed to view report', {
        type: request.type,
        orgId: request.orgId,
        error,
      });
      return err(
        new ValidationError(
          error instanceof Error ? error.message : 'Failed to generate report',
          REPORT_GENERATION_ERROR
        )
      );
    }
  }
}
