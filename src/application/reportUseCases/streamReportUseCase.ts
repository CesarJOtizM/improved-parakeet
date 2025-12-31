import { Injectable, Logger } from '@nestjs/common';
import { ReportGenerationService } from '@report/domain/services/reportGeneration.service';
import { IReportParametersInput, ReportType } from '@report/domain/valueObjects';
import { ValidationError } from '@shared/domain/result/domainError';

export interface IStreamReportRequest {
  type: string;
  parameters: IReportParametersInput;
  orgId: string;
}

@Injectable()
export class StreamReportUseCase {
  private readonly logger = new Logger(StreamReportUseCase.name);
  private readonly BATCH_SIZE = 100;

  constructor(private readonly reportGenerationService: ReportGenerationService) {}

  async *execute(request: IStreamReportRequest): AsyncGenerator<unknown[], void, unknown> {
    this.logger.log('Streaming report', {
      type: request.type,
      orgId: request.orgId,
    });

    try {
      // Validate report type
      let reportType: ReportType;
      try {
        reportType = ReportType.create(request.type);
      } catch {
        throw new ValidationError(`Invalid report type: ${request.type}`);
      }

      const reportTypeValue = reportType.getValue();

      // Stream report data in batches
      yield* this.reportGenerationService.generateReportStream(
        reportTypeValue,
        request.parameters,
        request.orgId,
        this.BATCH_SIZE
      );
    } catch (error) {
      this.logger.error('Failed to stream report', {
        type: request.type,
        orgId: request.orgId,
        error,
      });
      throw error;
    }
  }
}
