import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

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
    const offset = (page - 1) * limit;

    // Build filters
    const filters: {
      entityType?: EntityType;
      entityId?: string;
      action?: AuditAction;
      performedBy?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (request.entityType) {
      filters.entityType = EntityType.create(request.entityType as EntityType['props']['value']);
    }

    if (request.entityId) {
      filters.entityId = request.entityId;
    }

    if (request.action) {
      filters.action = AuditAction.create(request.action as AuditAction['props']['value']);
    }

    if (request.performedBy) {
      filters.performedBy = request.performedBy;
    }

    if (request.startDate) {
      filters.startDate = request.startDate;
    }

    if (request.endDate) {
      filters.endDate = request.endDate;
    }

    // Get audit logs and count
    const [auditLogs, total] = await Promise.all([
      this.auditRepository.findByFilters(request.orgId, filters, limit, offset),
      this.auditRepository.countByFilters(request.orgId, filters),
    ]);

    const totalPages = Math.ceil(total / limit);

    return ok({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: auditLogs.map(log => ({
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
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
