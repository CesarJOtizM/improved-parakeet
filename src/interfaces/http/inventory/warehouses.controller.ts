import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { GetWarehouseByIdUseCase } from '@application/warehouseUseCases/getWarehouseByIdUseCase';
import { GetWarehousesUseCase } from '@application/warehouseUseCases/getWarehousesUseCase';
import { UpdateWarehouseUseCase } from '@application/warehouseUseCases/updateWarehouseUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
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
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';
import {
  CreateWarehouseDto,
  GetWarehouseResponseDto,
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
    private readonly getWarehousesUseCase: GetWarehousesUseCase,
    private readonly getWarehouseByIdUseCase: GetWarehouseByIdUseCase,
    private readonly updateWarehouseUseCase: UpdateWarehouseUseCase
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

    const result = await this.createWarehouseUseCase.execute(request);
    return resultToHttpResponse(result);
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

    const result = await this.getWarehousesUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.WAREHOUSES_READ)
  @ApiOperation({
    summary: 'Get warehouse by ID',
    description: 'Get a specific warehouse by ID. Requires WAREHOUSES:READ permission.',
  })
  @ApiParam({ name: 'id', description: 'Warehouse ID', example: 'warehouse-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouse retrieved successfully',
    type: GetWarehouseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Warehouse not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getWarehouseById(
    @Param('id') warehouseId: string,
    @OrgId() orgId: string
  ): Promise<GetWarehouseResponseDto> {
    this.logger.log('Getting warehouse by ID', { warehouseId, orgId });

    const request = {
      warehouseId,
      orgId,
    };

    const result = await this.getWarehouseByIdUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.WAREHOUSES_UPDATE)
  @ApiOperation({
    summary: 'Update warehouse status',
    description: 'Update warehouse active status. Requires WAREHOUSES:UPDATE permission.',
  })
  @ApiParam({ name: 'id', description: 'Warehouse ID', example: 'warehouse-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Warehouse updated successfully',
    type: GetWarehouseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Warehouse not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async updateWarehouse(
    @Param('id') warehouseId: string,
    @Body() body: { isActive?: boolean },
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<GetWarehouseResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Updating warehouse', { warehouseId, orgId, updatedBy: user.id });

    const result = await this.updateWarehouseUseCase.execute({
      warehouseId,
      orgId,
      isActive: body.isActive,
      updatedBy: user.id,
    });
    return resultToHttpResponse(result);
  }
}
