import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIT_LOG_NOT_FOUND } from '@shared/constants/error-codes';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

export interface IGetAuditLogRequest {
  id: string;
  orgId: string;
}

export interface IAuditLogData {
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

export type IGetAuditLogResponse = IApiResponseSuccess<IAuditLogData>;

@Injectable()
export class GetAuditLogUseCase {
  private readonly logger = new Logger(GetAuditLogUseCase.name);

  constructor(
    @Inject('AuditLogRepository')
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async execute(request: IGetAuditLogRequest): Promise<Result<IGetAuditLogResponse, DomainError>> {
    this.logger.log('Getting audit log', {
      id: request.id,
      orgId: request.orgId,
    });

    const auditLog = await this.auditRepository.findById(request.id, request.orgId);

    if (!auditLog) {
      return err(new NotFoundError('Audit log not found', AUDIT_LOG_NOT_FOUND));
    }

    return ok({
      success: true,
      message: 'Audit log retrieved successfully',
      data: {
        id: auditLog.id,
        orgId: auditLog.orgId || null,
        entityType: auditLog.entityType.getValue(),
        entityId: auditLog.entityId || null,
        action: auditLog.action.getValue(),
        performedBy: auditLog.performedBy || null,
        metadata: auditLog.metadata.toJSON(),
        ipAddress: auditLog.ipAddress || null,
        userAgent: auditLog.userAgent || null,
        httpMethod: auditLog.httpMethod || null,
        httpUrl: auditLog.httpUrl || null,
        httpStatusCode: auditLog.httpStatusCode || null,
        duration: auditLog.duration || null,
        createdAt: auditLog.createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
