import { Injectable, Logger, Inject } from '@nestjs/common';
import { IReportData, ReportMapper } from '@report/mappers';
import { ok, Result } from '@shared/domain/result';
import { DomainError } from '@shared/domain/result/domainError';

import type { IReportRepository } from '@report/domain/ports/repositories';

export interface IGetReportsRequest {
  orgId: string;
  type?: string;
  status?: string;
  generatedBy?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IGetReportsResponse {
  success: boolean;
  message: string;
  data: IReportData[];
  timestamp: string;
}

@Injectable()
export class GetReportsUseCase {
  private readonly logger = new Logger(GetReportsUseCase.name);

  constructor(
    @Inject('ReportRepository')
    private readonly reportRepository: IReportRepository
  ) {}

  async execute(request: IGetReportsRequest): Promise<Result<IGetReportsResponse, DomainError>> {
    this.logger.log('Getting reports', {
      orgId: request.orgId,
      type: request.type,
      status: request.status,
    });

    let reports;

    if (request.startDate && request.endDate) {
      reports = await this.reportRepository.findByDateRange(
        request.startDate,
        request.endDate,
        request.orgId
      );
    } else if (request.type) {
      reports = await this.reportRepository.findByType(request.type, request.orgId);
    } else if (request.status) {
      reports = await this.reportRepository.findByStatus(request.status, request.orgId);
    } else if (request.generatedBy) {
      reports = await this.reportRepository.findByGeneratedBy(request.generatedBy, request.orgId);
    } else {
      reports = await this.reportRepository.findAll(request.orgId);
    }

    // Apply additional filters
    if (request.type && request.startDate) {
      reports = reports.filter(r => r.type.getValue() === request.type);
    }

    if (request.status && (request.type || request.startDate)) {
      reports = reports.filter(r => r.status.getValue() === request.status);
    }

    if (request.generatedBy && (request.type || request.startDate || request.status)) {
      reports = reports.filter(r => r.generatedBy === request.generatedBy);
    }

    this.logger.log('Reports retrieved', {
      count: reports.length,
      orgId: request.orgId,
    });

    return ok({
      success: true,
      message: 'Reports retrieved successfully',
      data: ReportMapper.toResponseDataList(reports),
      timestamp: new Date().toISOString(),
    });
  }
}
