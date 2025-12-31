import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IPaginatedResult,
  IPaginationOptions,
} from '@infrastructure/database/utils/queryOptimizer';
import { Injectable, Logger } from '@nestjs/common';
import { AuditLog } from '@shared/audit/domain/entities/auditLog.entity';
import { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { IPrismaSpecification } from '@shared/domain/specifications';

@Injectable()
export class PrismaAuditLogRepository implements IAuditLogRepository {
  private readonly logger = new Logger(PrismaAuditLogRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<AuditLog | null> {
    try {
      const auditLogData = await this.prisma.auditLog.findFirst({
        where: {
          id,
          orgId: orgId || null,
        },
      });

      if (!auditLogData) {
        return null;
      }

      return this.toDomain(auditLogData);
    } catch (error) {
      this.logger.error('Error finding audit log by ID', { id, orgId, error });
      throw error;
    }
  }

  async findAll(orgId: string): Promise<AuditLog[]> {
    try {
      const auditLogsData = await this.prisma.auditLog.findMany({
        where: {
          orgId: orgId || null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return auditLogsData.map((data: Parameters<typeof this.toDomain>[0]) => this.toDomain(data));
    } catch (error) {
      this.logger.error('Error finding all audit logs', { orgId, error });
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.auditLog.count({
        where: {
          id,
          orgId: orgId || null,
        },
      });

      return count > 0;
    } catch (error) {
      this.logger.error('Error checking audit log existence', { id, orgId, error });
      throw error;
    }
  }

  async save(auditLog: AuditLog): Promise<AuditLog> {
    try {
      const auditLogData = await this.prisma.auditLog.create({
        data: this.toPersistence(auditLog) as Parameters<
          typeof this.prisma.auditLog.create
        >[0]['data'],
      });

      return this.toDomain(auditLogData);
    } catch (error) {
      this.logger.error('Error saving audit log', { auditLogId: auditLog.id, error });
      throw error;
    }
  }

  async saveBatch(auditLogs: AuditLog[]): Promise<AuditLog[]> {
    if (auditLogs.length === 0) {
      return [];
    }

    try {
      const data = auditLogs.map(log => this.toPersistence(log));

      await this.prisma.auditLog.createMany({
        data: data as NonNullable<Parameters<typeof this.prisma.auditLog.createMany>[0]>['data'],
        skipDuplicates: true,
      });

      // Return the original logs since createMany doesn't return created records
      // In a real scenario, you might want to fetch them back or use a transaction
      return auditLogs;
    } catch (error) {
      this.logger.error('Error saving batch of audit logs', { count: auditLogs.length, error });
      throw error;
    }
  }

  async findByEntity(
    entityType: EntityType,
    entityId: string,
    orgId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      const auditLogsData = await this.prisma.auditLog.findMany({
        where: {
          entityType: entityType.getValue(),
          entityId,
          orgId: orgId || null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return auditLogsData.map((data: Parameters<typeof this.toDomain>[0]) => this.toDomain(data));
    } catch (error) {
      this.logger.error('Error finding audit logs by entity', {
        entityType: entityType.getValue(),
        entityId,
        orgId,
        error,
      });
      throw error;
    }
  }

  async findByUser(
    userId: string,
    orgId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      const auditLogsData = await this.prisma.auditLog.findMany({
        where: {
          performedBy: userId,
          orgId: orgId || null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return auditLogsData.map((data: Parameters<typeof this.toDomain>[0]) => this.toDomain(data));
    } catch (error) {
      this.logger.error('Error finding audit logs by user', { userId, orgId, error });
      throw error;
    }
  }

  async findByAction(
    action: AuditAction,
    orgId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      const auditLogsData = await this.prisma.auditLog.findMany({
        where: {
          action: action.getValue(),
          orgId: orgId || null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return auditLogsData.map((data: Parameters<typeof this.toDomain>[0]) => this.toDomain(data));
    } catch (error) {
      this.logger.error('Error finding audit logs by action', {
        action: action.getValue(),
        orgId,
        error,
      });
      throw error;
    }
  }

  async findByDateRange(
    orgId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      const auditLogsData = await this.prisma.auditLog.findMany({
        where: {
          orgId: orgId || null,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return auditLogsData.map((data: Parameters<typeof this.toDomain>[0]) => this.toDomain(data));
    } catch (error) {
      this.logger.error('Error finding audit logs by date range', {
        orgId,
        startDate,
        endDate,
        error,
      });
      throw error;
    }
  }

  async findByFilters(
    orgId: string,
    filters: {
      entityType?: EntityType;
      entityId?: string;
      action?: AuditAction;
      performedBy?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      const where: Record<string, unknown> = {
        orgId: orgId || null,
      };

      if (filters.entityType) {
        where.entityType = filters.entityType.getValue();
      }

      if (filters.entityId) {
        where.entityId = filters.entityId;
      }

      if (filters.action) {
        where.action = filters.action.getValue();
      }

      if (filters.performedBy) {
        where.performedBy = filters.performedBy;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {
          ...(filters.startDate && { gte: filters.startDate }),
          ...(filters.endDate && { lte: filters.endDate }),
        };
      }

      const auditLogsData = await this.prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return auditLogsData.map((data: Parameters<typeof this.toDomain>[0]) => this.toDomain(data));
    } catch (error) {
      this.logger.error('Error finding audit logs by filters', { orgId, filters, error });
      throw error;
    }
  }

  async countByFilters(
    orgId: string,
    filters: {
      entityType?: EntityType;
      entityId?: string;
      action?: AuditAction;
      performedBy?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<number> {
    try {
      const where: Record<string, unknown> = {
        orgId: orgId || null,
      };

      if (filters.entityType) {
        where.entityType = filters.entityType.getValue();
      }

      if (filters.entityId) {
        where.entityId = filters.entityId;
      }

      if (filters.action) {
        where.action = filters.action.getValue();
      }

      if (filters.performedBy) {
        where.performedBy = filters.performedBy;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {
          ...(filters.startDate && { gte: filters.startDate }),
          ...(filters.endDate && { lte: filters.endDate }),
        };
      }

      return await this.prisma.auditLog.count({ where });
    } catch (error) {
      this.logger.error('Error counting audit logs by filters', { orgId, filters, error });
      throw error;
    }
  }

  async findBySpecification(
    spec: IPrismaSpecification<AuditLog>,
    orgId: string,
    options?: IPaginationOptions
  ): Promise<IPaginatedResult<AuditLog>> {
    try {
      const where = spec.toPrismaWhere(orgId);
      const skip = options?.skip;
      const take = options?.take;

      const [auditLogsData, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      const auditLogs = auditLogsData.map((data: Parameters<typeof this.toDomain>[0]) =>
        this.toDomain(data)
      );

      return {
        data: auditLogs,
        total,
        hasMore: skip !== undefined && take !== undefined ? skip + take < total : false,
      };
    } catch (error) {
      this.logger.error('Error finding audit logs by specification', { orgId, error });
      throw error;
    }
  }

  private toDomain(data: {
    id: string;
    orgId: string | null;
    entityType: string;
    entityId: string | null;
    action: string;
    performedBy: string | null;
    metadata: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    httpMethod: string | null;
    httpUrl: string | null;
    httpStatusCode: number | null;
    duration: number | null;
    createdAt: Date;
  }): AuditLog {
    return AuditLog.reconstitute(
      {
        entityType: EntityType.create(data.entityType as EntityType['props']['value']),
        entityId: data.entityId || undefined,
        action: AuditAction.create(data.action as AuditAction['props']['value']),
        performedBy: data.performedBy || undefined,
        metadata: AuditMetadata.create((data.metadata as Record<string, unknown>) || {}),
        ipAddress: data.ipAddress || undefined,
        userAgent: data.userAgent || undefined,
        httpMethod: data.httpMethod || undefined,
        httpUrl: data.httpUrl || undefined,
        httpStatusCode: data.httpStatusCode || undefined,
        duration: data.duration || undefined,
      },
      data.id,
      data.orgId || undefined
    );
  }

  private toPersistence(auditLog: AuditLog) {
    return {
      id: auditLog.id,
      orgId: auditLog.orgId || null,
      entityType: auditLog.entityType.getValue(),
      entityId: auditLog.entityId || null,
      action: auditLog.action.getValue(),
      performedBy: auditLog.performedBy || null,
      metadata: auditLog.metadata.toJSON() as unknown,
      ipAddress: auditLog.ipAddress || null,
      userAgent: auditLog.userAgent || null,
      httpMethod: auditLog.httpMethod || null,
      httpUrl: auditLog.httpUrl || null,
      httpStatusCode: auditLog.httpStatusCode || null,
      duration: auditLog.duration || null,
    };
  }
}
