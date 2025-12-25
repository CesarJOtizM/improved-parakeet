import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { GetWarehousesUseCase } from '@application/warehouseUseCases/getWarehousesUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import {
  CreateWarehouseDto,
  GetWarehousesQueryDto,
  GetWarehousesResponseDto,
  CreateWarehouseResponseDto,
} from '@warehouse/dto';

import type { IAuthenticatedUser } from '@shared/types/http.types';
import type { Request } from 'express';

@ApiTags('Inventory - Warehouses')
@Controller('inventory/warehouses')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class WarehousesController {
  private readonly logger = new Logger(WarehousesController.name);

  constructor(
    private readonly createWarehouseUseCase: CreateWarehouseUseCase,
    private readonly getWarehousesUseCase: GetWarehousesUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.WAREHOUSES_CREATE)
  @ApiOperation({
    summary: 'Create new warehouse',
    description:
      'Create a new warehouse in the organization. Requires WAREHOUSES:CREATE permission.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Warehouse created successfully',
    type: CreateWarehouseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or warehouse already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createWarehouse(
    @Body() createWarehouseDto: CreateWarehouseDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<CreateWarehouseResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Creating warehouse', {
      code: createWarehouseDto.code,
      orgId,
      createdBy: user.id,
    });

    const request = {
      code: createWarehouseDto.code,
      name: createWarehouseDto.name,
      description: createWarehouseDto.description,
      address: createWarehouseDto.address,
      isActive: createWarehouseDto.isActive,
      orgId,
    };

    return await this.createWarehouseUseCase.execute(request);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.WAREHOUSES_READ)
  @ApiOperation({
    summary: 'Get all warehouses',
    description:
      'Get a paginated list of warehouses in the organization. Requires WAREHOUSES:READ permission.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'code', 'createdAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouses retrieved successfully',
    type: GetWarehousesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getWarehouses(
    @Query() query: GetWarehousesQueryDto,
    @OrgId() orgId: string
  ): Promise<GetWarehousesResponseDto> {
    this.logger.log('Getting warehouses', { orgId, ...query });

    const request = {
      orgId,
      page: query.page,
      limit: query.limit,
      isActive: query.isActive,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    return await this.getWarehousesUseCase.execute(request);
  }
}
