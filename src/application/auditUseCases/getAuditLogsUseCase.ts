import { QueryPagination } from '@infrastructure/database/utils/queryOptimizer';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AuditLogByActionSpecification,
  AuditLogByDateRangeSpecification,
  AuditLogByEntityIdSpecification,
  AuditLogByEntityTypeSpecification,
  AuditLogByUserSpecification,
} from '@shared/audit/domain/specifications';
import { DomainError, Result, ok } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { AuditLog } from '@shared/audit/domain/entities/auditLog.entity';
import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';
import type { IPrismaSpecification } from '@shared/domain/specifications';

export interface IGetAuditLogsRequest {
  orgId: string;
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  action?: string;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IAuditLogListItem {
  id: string;
  orgId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  performedBy: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  httpMethod: string | null;
  httpUrl: string | null;
  httpStatusCode: number | null;
  duration: number | null;
  createdAt: Date;
}

export type IGetAuditLogsResponse = IPaginatedResponse<IAuditLogListItem>;

@Injectable()
export class GetAuditLogsUseCase {
  private readonly logger = new Logger(GetAuditLogsUseCase.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async execute(
    request: IGetAuditLogsRequest
  ): Promise<Result<IGetAuditLogsResponse, DomainError>> {
    this.logger.log('Getting audit logs', {
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
    });

    const page = request.page || 1;
    const limit = request.limit || 50;
    const { skip, take } = QueryPagination.fromPage(page, limit);

    // Compose specifications based on filters
    const specifications: IPrismaSpecification<AuditLog>[] = [];

    if (request.entityType) {
      specifications.push(new AuditLogByEntityTypeSpecification(request.entityType));
    }

    if (request.entityId) {
      specifications.push(new AuditLogByEntityIdSpecification(request.entityId));
    }

    if (request.action) {
      specifications.push(new AuditLogByActionSpecification(request.action));
    }

    if (request.performedBy) {
      specifications.push(new AuditLogByUserSpecification(request.performedBy));
    }

    if (request.startDate && request.endDate) {
      specifications.push(new AuditLogByDateRangeSpecification(request.startDate, request.endDate));
    }

    // Combine all specifications with AND logic
    let result;
    if (specifications.length > 0) {
      const finalSpec = specifications.reduce<IPrismaSpecification<AuditLog>>(
        (acc, spec) => acc.and(spec) as IPrismaSpecification<AuditLog>,
        specifications[0]
      );
      result = await this.auditRepository.findBySpecification(finalSpec, request.orgId, {
        skip,
        take,
      });
    } else {
      // Fallback to findAll for backward compatibility
      const allAuditLogs = await this.auditRepository.findAll(request.orgId);
      const total = allAuditLogs.length;
      const paginatedAuditLogs = allAuditLogs.slice(skip, skip + take);
      result = {
        data: paginatedAuditLogs,
        total,
        hasMore: skip + take < total,
      };
    }

    const totalPages = Math.ceil(result.total / limit);

    return ok({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: result.data.map(log => ({
        id: log.id,
        orgId: log.orgId || null,
        entityType: log.entityType.getValue(),
        entityId: log.entityId || null,
        action: log.action.getValue(),
        performedBy: log.performedBy || null,
        metadata: log.metadata.toJSON(),
        ipAddress: log.ipAddress || null,
        userAgent: log.userAgent || null,
        httpMethod: log.httpMethod || null,
        httpUrl: log.httpUrl || null,
        httpStatusCode: log.httpStatusCode || null,
        duration: log.duration || null,
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
