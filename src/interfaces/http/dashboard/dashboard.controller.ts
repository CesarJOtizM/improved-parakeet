import { GetDashboardMetricsUseCase } from '@application/dashboardUseCases';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { PermissionGuard } from '@shared/guards/permission.guard';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly getDashboardMetricsUseCase: GetDashboardMetricsUseCase) {}

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dashboard metrics (aggregated)' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    type: String,
    description: 'Filter by company ID',
  })
  async getMetrics(@OrgId() orgId: string, @Query('companyId') companyId?: string) {
    const result = await this.getDashboardMetricsUseCase.execute({ orgId, companyId });
    return resultToHttpResponse(result);
  }
}
