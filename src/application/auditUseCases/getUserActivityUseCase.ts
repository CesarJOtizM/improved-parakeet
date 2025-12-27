import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

export interface IGetUserActivityRequest {
  userId: string;
  orgId: string;
  page?: number;
  limit?: number;
}

export interface IUserActivityItem {
  id: string;
  entityType: string;
  entityId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  httpMethod: string | null;
  httpUrl: string | null;
  httpStatusCode: number | null;
  duration: number | null;
  createdAt: Date;
}

export type IGetUserActivityResponse = IPaginatedResponse<IUserActivityItem>;

@Injectable()
export class GetUserActivityUseCase {
  private readonly logger = new Logger(GetUserActivityUseCase.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async execute(
    request: IGetUserActivityRequest
  ): Promise<Result<IGetUserActivityResponse, DomainError>> {
    this.logger.log('Getting user activity', {
      userId: request.userId,
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
    });

    const page = request.page || 1;
    const limit = request.limit || 50;
    const offset = (page - 1) * limit;

    // Get user activity
    const auditLogs = await this.auditRepository.findByUser(
      request.userId,
      request.orgId,
      limit,
      offset
    );

    // Count total (we need to get all and count, or add a count method to repository)
    // For now, we'll estimate based on returned results
    const total =
      auditLogs.length === limit ? limit * page + 1 : auditLogs.length + (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    return ok({
      success: true,
      message: 'User activity retrieved successfully',
      data: auditLogs.map(log => ({
        id: log.id,
        entityType: log.entityType.getValue(),
        entityId: log.entityId || null,
        action: log.action.getValue(),
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
        hasNext: auditLogs.length === limit,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
