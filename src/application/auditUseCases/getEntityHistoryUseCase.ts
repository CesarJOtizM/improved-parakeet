import { Inject, Injectable, Logger } from '@nestjs/common';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { DomainError, Result, ok } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

export interface IGetEntityHistoryRequest {
  entityType: string;
  entityId: string;
  orgId: string;
  page?: number;
  limit?: number;
}

export interface IEntityHistoryItem {
  id: string;
  action: string;
  performedBy: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export type IGetEntityHistoryResponse = IPaginatedResponse<IEntityHistoryItem>;

@Injectable()
export class GetEntityHistoryUseCase {
  private readonly logger = new Logger(GetEntityHistoryUseCase.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async execute(
    request: IGetEntityHistoryRequest
  ): Promise<Result<IGetEntityHistoryResponse, DomainError>> {
    this.logger.log('Getting entity history', {
      entityType: request.entityType,
      entityId: request.entityId,
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
    });

    const page = request.page || 1;
    const limit = request.limit || 50;
    const offset = (page - 1) * limit;

    const entityType = EntityType.create(request.entityType as EntityType['props']['value']);

    // Get entity history
    const auditLogs = await this.auditRepository.findByEntity(
      entityType,
      request.entityId,
      request.orgId,
      limit,
      offset
    );

    // Estimate total (in a real scenario, we'd have a count method)
    const total =
      auditLogs.length === limit ? limit * page + 1 : auditLogs.length + (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    return ok({
      success: true,
      message: 'Entity history retrieved successfully',
      data: auditLogs.map(log => ({
        id: log.id,
        action: log.action.getValue(),
        performedBy: log.performedBy || null,
        metadata: log.metadata.toJSON(),
        ipAddress: log.ipAddress || null,
        userAgent: log.userAgent || null,
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: auditLogs.length === limit,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
