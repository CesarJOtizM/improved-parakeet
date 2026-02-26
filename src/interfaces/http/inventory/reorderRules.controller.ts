import { CreateReorderRuleUseCase } from '@application/reorderRuleUseCases/createReorderRuleUseCase';
import { DeleteReorderRuleUseCase } from '@application/reorderRuleUseCases/deleteReorderRuleUseCase';
import { GetReorderRulesUseCase } from '@application/reorderRuleUseCases/getReorderRulesUseCase';
import { UpdateReorderRuleUseCase } from '@application/reorderRuleUseCases/updateReorderRuleUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { PermissionGuard } from '@shared/guards/permission.guard';
import { CreateReorderRuleDto, UpdateReorderRuleDto } from '@stock/dto/reorderRule.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Inventory - Reorder Rules')
@Controller('inventory/stock/reorder-rules')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class ReorderRulesController {
  private readonly logger = new Logger(ReorderRulesController.name);

  constructor(
    private readonly getReorderRulesUseCase: GetReorderRulesUseCase,
    private readonly createReorderRuleUseCase: CreateReorderRuleUseCase,
    private readonly updateReorderRuleUseCase: UpdateReorderRuleUseCase,
    private readonly deleteReorderRuleUseCase: DeleteReorderRuleUseCase
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_READ)
  @ApiOperation({
    summary: 'Get all reorder rules',
    description: 'Get all reorder rules for the organization. Requires INVENTORY:READ permission.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reorder rules retrieved successfully' })
  async getAll(@OrgId() orgId: string): Promise<unknown> {
    this.logger.log('Getting all reorder rules', { orgId });
    const result = await this.getReorderRulesUseCase.execute({ orgId });
    return resultToHttpResponse(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({
    summary: 'Create reorder rule',
    description:
      'Create a new reorder rule for a product-warehouse combination. Requires INVENTORY:ADJUST permission.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Reorder rule created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Rule already exists' })
  async create(@OrgId() orgId: string, @Body() dto: CreateReorderRuleDto): Promise<unknown> {
    this.logger.log('Creating reorder rule', { orgId, productId: dto.productId });
    const result = await this.createReorderRuleUseCase.execute({
      ...dto,
      orgId,
    });
    return resultToHttpResponse(result);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({
    summary: 'Update reorder rule',
    description: 'Update an existing reorder rule. Requires INVENTORY:ADJUST permission.',
  })
  @ApiParam({ name: 'id', description: 'Reorder rule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reorder rule updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Reorder rule not found' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReorderRuleDto
  ): Promise<unknown> {
    this.logger.log('Updating reorder rule', { orgId, id });
    const result = await this.updateReorderRuleUseCase.execute({
      id,
      orgId,
      ...dto,
    });
    return resultToHttpResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({
    summary: 'Delete reorder rule',
    description: 'Delete an existing reorder rule. Requires INVENTORY:ADJUST permission.',
  })
  @ApiParam({ name: 'id', description: 'Reorder rule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reorder rule deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Reorder rule not found' })
  async delete(@OrgId() orgId: string, @Param('id') id: string): Promise<unknown> {
    this.logger.log('Deleting reorder rule', { orgId, id });
    const result = await this.deleteReorderRuleUseCase.execute({ id, orgId });
    return resultToHttpResponse(result);
  }
}
