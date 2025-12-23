import { GetAuditLogsUseCase } from '@application/auditUseCases/getAuditLogsUseCase';
import { GetAuditLogUseCase } from '@application/auditUseCases/getAuditLogUseCase';
import { GetEntityHistoryUseCase } from '@application/auditUseCases/getEntityHistoryUseCase';
import { GetUserActivityUseCase } from '@application/auditUseCases/getUserActivityUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';

import { AuditLogResponseDto } from './dto/auditLogResponse.dto';
import { GetAuditLogsQueryDto, GetAuditLogsResponseDto } from './dto/getAuditLogs.dto';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
@ApiBearerAuth()
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(
    private readonly getAuditLogsUseCase: GetAuditLogsUseCase,
    private readonly getAuditLogUseCase: GetAuditLogUseCase,
    private readonly getUserActivityUseCase: GetUserActivityUseCase,
    private readonly getEntityHistoryUseCase: GetEntityHistoryUseCase
  ) {}

  @Get('logs')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.AUDIT_READ)
  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Retrieve audit logs with optional filters. Requires AUDIT:VIEW_LOGS permission.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetAuditLogsResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  async getAuditLogs(
    @Query() query: GetAuditLogsQueryDto,
    @OrgId() orgId: string
  ): Promise<GetAuditLogsResponseDto> {
    this.logger.log('Getting audit logs', { orgId, query });

    return await this.getAuditLogsUseCase.execute({
      orgId,
      page: query.page,
      limit: query.limit,
      entityType: query.entityType,
      entityId: query.entityId,
      action: query.action,
      performedBy: query.performedBy,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get('logs/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.AUDIT_READ)
  @ApiOperation({
    summary: 'Get audit log by ID',
    description: 'Retrieve a specific audit log by ID. Requires AUDIT:VIEW_LOGS permission.',
  })
  @ApiParam({ name: 'id', description: 'Audit log ID', example: 'clx1234567890' })
  @ApiResponse({ status: HttpStatus.OK, type: AuditLogResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Audit log not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  async getAuditLog(@Param('id') id: string, @OrgId() orgId: string): Promise<AuditLogResponseDto> {
    this.logger.log('Getting audit log', { id, orgId });

    return await this.getAuditLogUseCase.execute({ id, orgId });
  }

  @Get('users/:userId/activity')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.AUDIT_READ)
  @ApiOperation({
    summary: 'Get user activity',
    description: 'Retrieve activity logs for a specific user. Requires AUDIT:VIEW_LOGS permission.',
  })
  @ApiParam({ name: 'userId', description: 'User ID', example: 'clx1234567890' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: HttpStatus.OK, description: 'User activity retrieved successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @OrgId() orgId?: string
  ) {
    this.logger.log('Getting user activity', { userId, orgId, page, limit });

    return await this.getUserActivityUseCase.execute({
      userId,
      orgId: orgId || '',
      page: page ? parseInt(page.toString()) : undefined,
      limit: limit ? parseInt(limit.toString()) : undefined,
    });
  }

  @Get('entities/:entityType/:entityId/history')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.AUDIT_READ)
  @ApiOperation({
    summary: 'Get entity history',
    description:
      'Retrieve change history for a specific entity. Requires AUDIT:VIEW_LOGS permission.',
  })
  @ApiParam({ name: 'entityType', description: 'Entity type', example: 'User' })
  @ApiParam({ name: 'entityId', description: 'Entity ID', example: 'clx1234567890' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Entity history retrieved successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @OrgId() orgId?: string
  ) {
    this.logger.log('Getting entity history', { entityType, entityId, orgId, page, limit });

    return await this.getEntityHistoryUseCase.execute({
      entityType,
      entityId,
      orgId: orgId || '',
      page: page ? parseInt(page.toString()) : undefined,
      limit: limit ? parseInt(limit.toString()) : undefined,
    });
  }
}
