import { Injectable, Logger, Inject } from '@nestjs/common';
import { ExportService, IExportOptions, ReportCacheService } from '@report/domain/services';
import {
  IReportParametersInput,
  ReportFormat,
  ReportType,
  REPORT_FORMATS,
} from '@report/domain/valueObjects';
import { ReportMapper } from '@report/mappers';
import { REPORT_GENERATION_ERROR, REPORT_INVALID_TYPE } from '@shared/constants/error-codes';
import { err, ok, Result } from '@shared/domain/result';
import { DomainError, ValidationError } from '@shared/domain/result/domainError';

import type { IReportRepository } from '@report/domain/ports/repositories';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface IExportReportRequest {
  type: string;
  format: string;
  parameters: IReportParametersInput;
  orgId: string;
  exportedBy: string;
  options?: IExportOptions;
  saveMetadata?: boolean; // Whether to save report metadata for audit
}

export interface IExportReportResponse {
  success: boolean;
  message: string;
  data: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
    reportId?: string; // Only if saveMetadata is true
  };
  timestamp: string;
  fromCache?: boolean;
}

@Injectable()
export class ExportReportUseCase {
  private readonly logger = new Logger(ExportReportUseCase.name);

  constructor(
    private readonly exportService: ExportService,
    @Inject('ReportRepository')
    private readonly reportRepository: IReportRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher,
    private readonly reportCacheService: ReportCacheService
  ) {}

  async execute(
    request: IExportReportRequest
  ): Promise<Result<IExportReportResponse, DomainError>> {
    this.logger.log('Exporting report', {
      type: request.type,
      format: request.format,
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

      // Validate export format
      let reportFormat: ReportFormat;
      try {
        reportFormat = ReportFormat.create(request.format);
      } catch {
        return err(
          new ValidationError(
            `Invalid export format: ${request.format}. Valid formats: ${Object.values(REPORT_FORMATS).join(', ')}`,
            REPORT_GENERATION_ERROR
          )
        );
      }

      const reportTypeValue = reportType.getValue();
      const reportFormatValue = reportFormat.getValue();
      let exportResult: { buffer: Buffer; filename: string; mimeType: string; size: number };
      let fromCache = false;

      // Exports are always cacheable
      const cacheKey = this.reportCacheService.generateKey(
        reportTypeValue,
        request.parameters,
        reportFormatValue,
        true
      );

      // Try to get from cache
      const cachedExport = await this.reportCacheService.get<{
        buffer: Buffer;
        filename: string;
        mimeType: string;
        size: number;
      }>(cacheKey);

      if (cachedExport) {
        this.logger.log('Export retrieved from cache', {
          type: request.type,
          format: request.format,
          orgId: request.orgId,
          cacheKey,
        });
        exportResult = cachedExport;
        fromCache = true;
      } else {
        // Cache miss - generate export
        this.logger.log('Cache miss - generating export', {
          type: request.type,
          format: request.format,
          orgId: request.orgId,
          cacheKey,
        });
        exportResult = await this.exportService.exportReport(
          reportTypeValue,
          reportFormatValue,
          request.parameters,
          request.orgId,
          request.options
        );

        // Save to cache with TTL
        const ttl = this.reportCacheService.getTtlForExport(reportTypeValue);
        await this.reportCacheService.set(cacheKey, exportResult, ttl);
        this.logger.log('Export cached successfully', {
          type: request.type,
          format: request.format,
          orgId: request.orgId,
          cacheKey,
          ttl,
        });
      }

      let reportId: string | undefined;

      // Optionally save metadata for audit
      if (request.saveMetadata) {
        const reportEntity = ReportMapper.createEntity(
          {
            type: request.type,
            parameters: request.parameters,
            generatedBy: request.exportedBy,
          },
          request.orgId
        );

        // Mark as generating and complete
        reportEntity.markAsGenerating();
        reportEntity.complete();
        reportEntity.markAsExported(reportFormat, request.exportedBy);

        // Save the report metadata
        const savedReport = await this.reportRepository.save(reportEntity);
        reportId = savedReport.id;

        // Dispatch domain events
        savedReport.markEventsForDispatch();
        await this.eventDispatcher.dispatchEvents(savedReport.domainEvents);
        savedReport.clearEvents();
      }

      this.logger.log('Report exported successfully', {
        type: request.type,
        format: request.format,
        filename: exportResult.filename,
        size: exportResult.size,
        orgId: request.orgId,
        reportId,
        fromCache,
      });

      return ok({
        success: true,
        message: 'Report exported successfully',
        data: {
          buffer: exportResult.buffer,
          filename: exportResult.filename,
          mimeType: exportResult.mimeType,
          size: exportResult.size,
          reportId,
        },
        timestamp: new Date().toISOString(),
        fromCache,
      });
    } catch (error) {
      this.logger.error('Failed to export report', {
        type: request.type,
        format: request.format,
        orgId: request.orgId,
        error,
      });
      return err(
        new ValidationError(
          error instanceof Error ? error.message : 'Failed to export report',
          REPORT_GENERATION_ERROR
        )
      );
    }
  }
}
