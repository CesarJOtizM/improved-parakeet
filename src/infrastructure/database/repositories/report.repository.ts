import { Injectable, Logger } from '@nestjs/common';
import { Report, IReportProps } from '@report/domain/entities/report.entity';
import { IReportRepository } from '@report/domain/ports/repositories';
import {
  ReportFormat,
  ReportParameters,
  ReportStatus,
  ReportType,
} from '@report/domain/valueObjects';

import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaReportRepository implements IReportRepository {
  private readonly logger = new Logger(PrismaReportRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Report | null> {
    const report = await this.prisma.report.findFirst({
      where: { id, orgId, deletedAt: null },
    });

    if (!report) {
      return null;
    }

    return this.toDomain(report);
  }

  async findAll(orgId: string): Promise<Report[]> {
    const reports = await this.prisma.report.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map(report => this.toDomain(report));
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    const count = await this.prisma.report.count({
      where: { id, orgId, deletedAt: null },
    });
    return count > 0;
  }

  async save(entity: Report): Promise<Report> {
    const data = this.toPersistence(entity);

    const existing = await this.prisma.report.findFirst({
      where: { id: entity.id, orgId: entity.orgId!, deletedAt: null },
    });

    if (existing) {
      const updated = await this.prisma.report.update({
        where: { id: entity.id },
        data: {
          type: data.type,
          status: data.status,
          parameters: data.parameters,
          templateId: data.templateId,
          generatedAt: data.generatedAt,
          format: data.format,
          exportedAt: data.exportedAt,
          errorMessage: data.errorMessage,
          updatedAt: new Date(),
        },
      });
      return this.toDomain(updated);
    }

    const created = await this.prisma.report.create({
      data: {
        id: entity.id,
        orgId: entity.orgId!,
        type: data.type,
        status: data.status,
        parameters: data.parameters,
        templateId: data.templateId,
        generatedBy: data.generatedBy,
        generatedAt: data.generatedAt,
        format: data.format,
        exportedAt: data.exportedAt,
        errorMessage: data.errorMessage,
      },
    });

    return this.toDomain(created);
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.prisma.report.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log('Report soft deleted', { id, orgId });
  }

  async findByType(type: string, orgId: string): Promise<Report[]> {
    const reports = await this.prisma.report.findMany({
      where: { type, orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map(report => this.toDomain(report));
  }

  async findByTemplate(templateId: string, orgId: string): Promise<Report[]> {
    const reports = await this.prisma.report.findMany({
      where: { templateId, orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map(report => this.toDomain(report));
  }

  async findByStatus(status: string, orgId: string): Promise<Report[]> {
    const reports = await this.prisma.report.findMany({
      where: { status, orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map(report => this.toDomain(report));
  }

  async findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Report[]> {
    const reports = await this.prisma.report.findMany({
      where: {
        orgId,
        deletedAt: null,
        generatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { generatedAt: 'desc' },
    });

    return reports.map(report => this.toDomain(report));
  }

  async findByGeneratedBy(userId: string, orgId: string): Promise<Report[]> {
    const reports = await this.prisma.report.findMany({
      where: { generatedBy: userId, orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map(report => this.toDomain(report));
  }

  private toDomain(data: {
    id: string;
    orgId: string;
    type: string;
    status: string;
    parameters: unknown;
    templateId: string | null;
    generatedBy: string;
    generatedAt: Date | null;
    format: string | null;
    exportedAt: Date | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Report {
    const props: IReportProps = {
      type: ReportType.create(data.type),
      status: ReportStatus.create(data.status),
      parameters: ReportParameters.create(data.parameters as Record<string, unknown>),
      templateId: data.templateId ?? undefined,
      generatedBy: data.generatedBy,
      generatedAt: data.generatedAt ?? undefined,
      format: data.format ? ReportFormat.create(data.format) : undefined,
      exportedAt: data.exportedAt ?? undefined,
      errorMessage: data.errorMessage ?? undefined,
    };

    return Report.reconstitute(props, data.id, data.orgId);
  }

  private toPersistence(entity: Report): {
    type: string;
    status: string;
    parameters: unknown;
    templateId: string | null;
    generatedBy: string;
    generatedAt: Date | null;
    format: string | null;
    exportedAt: Date | null;
    errorMessage: string | null;
  } {
    return {
      type: entity.type.getValue(),
      status: entity.status.getValue(),
      parameters: entity.parameters.getValue(),
      templateId: entity.templateId ?? null,
      generatedBy: entity.generatedBy,
      generatedAt: entity.generatedAt ?? null,
      format: entity.format?.getValue() ?? null,
      exportedAt: entity.exportedAt ?? null,
      errorMessage: entity.errorMessage ?? null,
    };
  }
}
