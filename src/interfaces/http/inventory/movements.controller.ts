import { CreateMovementUseCase } from '@application/movementUseCases/createMovementUseCase';
import { DeleteMovementUseCase } from '@application/movementUseCases/deleteMovementUseCase';
import { GetMovementByIdUseCase } from '@application/movementUseCases/getMovementByIdUseCase';
import { GetMovementsUseCase } from '@application/movementUseCases/getMovementsUseCase';
import { PostMovementUseCase } from '@application/movementUseCases/postMovementUseCase';
import { UpdateMovementUseCase } from '@application/movementUseCases/updateMovementUseCase';
import { VoidMovementUseCase } from '@application/movementUseCases/voidMovementUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import {
  CreateMovementDto,
  GetMovementsQueryDto,
  GetMovementsResponseDto,
  CreateMovementResponseDto,
} from '@movement/dto';
import { UpdateMovementDto } from '@movement/dto/updateMovement.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
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
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

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
    private readonly getMovementByIdUseCase: GetMovementByIdUseCase,
    private readonly postMovementUseCase: PostMovementUseCase,
    private readonly updateMovementUseCase: UpdateMovementUseCase,
    private readonly deleteMovementUseCase: DeleteMovementUseCase,
    private readonly voidMovementUseCase: VoidMovementUseCase
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

    const result = await this.createMovementUseCase.execute(request);
    return resultToHttpResponse(result);
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

    const result = await this.getMovementsUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_READ)
  @ApiOperation({
    summary: 'Get movement by ID',
    description: 'Get a single movement by its ID. Requires INVENTORY:READ permission.',
  })
  @ApiParam({ name: 'id', description: 'Movement ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Movement retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Movement not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async getMovementById(@Param('id') movementId: string, @OrgId() orgId: string) {
    this.logger.log('Getting movement by ID', { movementId, orgId });
    const result = await this.getMovementByIdUseCase.execute({ movementId, orgId });
    return resultToHttpResponse(result);
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
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<{ success: boolean; message: string; data: unknown; timestamp: string }> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Posting movement', { movementId, orgId, postedBy: user.id });

    const result = await this.postMovementUseCase.execute({ movementId, orgId, postedBy: user.id });
    return resultToHttpResponse(result);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_ENTRY)
  @ApiOperation({
    summary: 'Update DRAFT movement',
    description: 'Update a movement in DRAFT status. Requires INVENTORY:ENTRY permission.',
  })
  @ApiParam({ name: 'id', description: 'Movement ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Movement updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Movement not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Movement cannot be updated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async updateMovement(
    @Param('id') movementId: string,
    @Body() updateMovementDto: UpdateMovementDto,
    @OrgId() orgId: string
  ) {
    this.logger.log('Updating movement', { movementId, orgId });

    const result = await this.updateMovementUseCase.execute({
      movementId,
      orgId,
      reference: updateMovementDto.reference,
      reason: updateMovementDto.reason,
      note: updateMovementDto.note,
      lines: updateMovementDto.lines,
    });
    return resultToHttpResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_ENTRY)
  @ApiOperation({
    summary: 'Delete DRAFT movement',
    description: 'Delete a movement in DRAFT status. Requires INVENTORY:ENTRY permission.',
  })
  @ApiParam({ name: 'id', description: 'Movement ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Movement deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Movement not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Movement cannot be deleted' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async deleteMovement(@Param('id') movementId: string, @OrgId() orgId: string) {
    this.logger.log('Deleting movement', { movementId, orgId });

    const result = await this.deleteMovementUseCase.execute({ movementId, orgId });
    return resultToHttpResponse(result);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_ENTRY)
  @ApiOperation({
    summary: 'Void movement',
    description: 'Void a posted movement (POSTED → VOID). Requires INVENTORY:ENTRY permission.',
  })
  @ApiParam({ name: 'id', description: 'Movement ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Movement voided successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Movement not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Movement cannot be voided' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async voidMovement(@Param('id') movementId: string, @OrgId() orgId: string) {
    this.logger.log('Voiding movement', { movementId, orgId });

    const result = await this.voidMovementUseCase.execute({ movementId, orgId });
    return resultToHttpResponse(result);
  }
}
