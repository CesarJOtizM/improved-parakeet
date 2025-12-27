import { Injectable, Logger } from '@nestjs/common';
import {
  ReportTemplate,
  IReportTemplateProps,
} from '@report/domain/entities/reportTemplate.entity';
import { IReportTemplateRepository } from '@report/domain/ports/repositories';
import { ReportParameters, ReportType } from '@report/domain/valueObjects';

import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaReportTemplateRepository implements IReportTemplateRepository {
  private readonly logger = new Logger(PrismaReportTemplateRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<ReportTemplate | null> {
    const template = await this.prisma.reportTemplate.findFirst({
      where: { id, orgId, deletedAt: null },
    });

    if (!template) {
      return null;
    }

    return this.toDomain(template);
  }

  async findAll(orgId: string): Promise<ReportTemplate[]> {
    const templates = await this.prisma.reportTemplate.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: 'asc' },
    });

    return templates.map(template => this.toDomain(template));
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    const count = await this.prisma.reportTemplate.count({
      where: { id, orgId, deletedAt: null },
    });
    return count > 0;
  }

  async save(entity: ReportTemplate): Promise<ReportTemplate> {
    const data = this.toPersistence(entity);

    const existing = await this.prisma.reportTemplate.findFirst({
      where: { id: entity.id, orgId: entity.orgId!, deletedAt: null },
    });

    if (existing) {
      const updated = await this.prisma.reportTemplate.update({
        where: { id: entity.id },
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          defaultParameters: data.defaultParameters,
          isActive: data.isActive,
          updatedAt: new Date(),
        },
      });
      return this.toDomain(updated);
    }

    const created = await this.prisma.reportTemplate.create({
      data: {
        id: entity.id,
        orgId: entity.orgId!,
        name: data.name,
        description: data.description,
        type: data.type,
        defaultParameters: data.defaultParameters,
        isActive: data.isActive,
        createdBy: data.createdBy,
      },
    });

    return this.toDomain(created);
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.prisma.reportTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log('Report template soft deleted', { id, orgId });
  }

  async findByType(type: string, orgId: string): Promise<ReportTemplate[]> {
    const templates = await this.prisma.reportTemplate.findMany({
      where: { type, orgId, deletedAt: null },
      orderBy: { name: 'asc' },
    });

    return templates.map(template => this.toDomain(template));
  }

  async findActive(orgId: string): Promise<ReportTemplate[]> {
    const templates = await this.prisma.reportTemplate.findMany({
      where: { isActive: true, orgId, deletedAt: null },
      orderBy: { name: 'asc' },
    });

    return templates.map(template => this.toDomain(template));
  }

  async findByName(name: string, orgId: string): Promise<ReportTemplate | null> {
    const template = await this.prisma.reportTemplate.findFirst({
      where: { name, orgId, deletedAt: null },
    });

    if (!template) {
      return null;
    }

    return this.toDomain(template);
  }

  async existsByName(name: string, orgId: string): Promise<boolean> {
    const count = await this.prisma.reportTemplate.count({
      where: { name, orgId, deletedAt: null },
    });
    return count > 0;
  }

  async findByCreatedBy(userId: string, orgId: string): Promise<ReportTemplate[]> {
    const templates = await this.prisma.reportTemplate.findMany({
      where: { createdBy: userId, orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map(template => this.toDomain(template));
  }

  private toDomain(data: {
    id: string;
    orgId: string;
    name: string;
    description: string | null;
    type: string;
    defaultParameters: unknown;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): ReportTemplate {
    const props: IReportTemplateProps = {
      name: data.name,
      description: data.description ?? undefined,
      type: ReportType.create(data.type),
      defaultParameters: ReportParameters.create(data.defaultParameters as Record<string, unknown>),
      isActive: data.isActive,
      createdBy: data.createdBy,
    };

    return ReportTemplate.reconstitute(props, data.id, data.orgId);
  }

  private toPersistence(entity: ReportTemplate): {
    name: string;
    description: string | null;
    type: string;
    defaultParameters: unknown;
    isActive: boolean;
    createdBy: string;
  } {
    return {
      name: entity.name,
      description: entity.description ?? null,
      type: entity.type.getValue(),
      defaultParameters: entity.defaultParameters.getValue(),
      isActive: entity.isActive,
      createdBy: entity.createdBy,
    };
  }
}
