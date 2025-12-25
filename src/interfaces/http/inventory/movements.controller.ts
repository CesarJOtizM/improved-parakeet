import { CreateMovementUseCase } from '@application/movementUseCases/createMovementUseCase';
import { GetMovementsUseCase } from '@application/movementUseCases/getMovementsUseCase';
import { PostMovementUseCase } from '@application/movementUseCases/postMovementUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import {
  CreateMovementDto,
  GetMovementsQueryDto,
  GetMovementsResponseDto,
  CreateMovementResponseDto,
} from '@movement/dto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
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

import type { IAuthenticatedUser } from '@shared/types/http.types';
import type { Request } from 'express';

@ApiTags('Inventory - Movements')
@Controller('inventory/movements')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class MovementsController {
  private readonly logger = new Logger(MovementsController.name);

  constructor(
    private readonly createMovementUseCase: CreateMovementUseCase,
    private readonly getMovementsUseCase: GetMovementsUseCase,
    private readonly postMovementUseCase: PostMovementUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_ENTRY)
  @ApiOperation({
    summary: 'Create new movement',
    description:
      'Create a new inventory movement in DRAFT status. Requires INVENTORY:ENTRY permission.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Movement created successfully',
    type: CreateMovementResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createMovement(
    @Body() createMovementDto: CreateMovementDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<CreateMovementResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Creating movement', {
      type: createMovementDto.type,
      warehouseId: createMovementDto.warehouseId,
      orgId,
      createdBy: user.id,
    });

    const request = {
      type: createMovementDto.type,
      warehouseId: createMovementDto.warehouseId,
      reference: createMovementDto.reference,
      reason: createMovementDto.reason,
      note: createMovementDto.note,
      lines: createMovementDto.lines,
      createdBy: user.id,
      orgId,
    };

    return await this.createMovementUseCase.execute(request);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_READ)
  @ApiOperation({
    summary: 'Get all movements',
    description:
      'Get a paginated list of movements in the organization. Requires INVENTORY:READ permission.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'POSTED', 'VOID'] })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['IN', 'OUT', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER_OUT', 'TRANSFER_IN'],
  })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['type', 'status', 'createdAt', 'postedAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Movements retrieved successfully',
    type: GetMovementsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getMovements(
    @Query() query: GetMovementsQueryDto,
    @OrgId() orgId: string
  ): Promise<GetMovementsResponseDto> {
    this.logger.log('Getting movements', { orgId, ...query });

    const request = {
      orgId,
      page: query.page,
      limit: query.limit,
      warehouseId: query.warehouseId,
      status: query.status,
      type: query.type,
      productId: query.productId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    return await this.getMovementsUseCase.execute(request);
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_ENTRY)
  @ApiOperation({
    summary: 'Post movement',
    description:
      'Post a movement (change status from DRAFT to POSTED). Requires INVENTORY:ENTRY permission.',
  })
  @ApiParam({ name: 'id', description: 'Movement ID', example: 'movement-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Movement posted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Movement not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Movement cannot be posted',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async postMovement(
    @Param('id') movementId: string,
    @OrgId() orgId: string
  ): Promise<{ success: boolean; message: string; data: unknown; timestamp: string }> {
    this.logger.log('Posting movement', { movementId, orgId });

    const request = {
      movementId,
      orgId,
    };

    return await this.postMovementUseCase.execute(request);
  }
}
