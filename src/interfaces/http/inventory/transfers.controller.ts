import { GetTransfersUseCase } from '@application/transferUseCases/getTransfersUseCase';
import { InitiateTransferUseCase } from '@application/transferUseCases/initiateTransferUseCase';
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
import { resultToHttpResponse } from '@shared/utils/resultToHttp';
import {
  InitiateTransferDto,
  GetTransfersQueryDto,
  GetTransfersResponseDto,
  InitiateTransferResponseDto,
} from '@transfer/dto';

import type { IAuthenticatedUser } from '@shared/types/http.types';
import type { Request } from 'express';

@ApiTags('Inventory - Transfers')
@Controller('inventory/transfers')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class TransfersController {
  private readonly logger = new Logger(TransfersController.name);

  constructor(
    private readonly initiateTransferUseCase: InitiateTransferUseCase,
    private readonly getTransfersUseCase: GetTransfersUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_TRANSFER)
  @ApiOperation({
    summary: 'Initiate transfer',
    description:
      'Initiate a new transfer between warehouses. Requires INVENTORY:TRANSFER permission.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transfer initiated successfully',
    type: InitiateTransferResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async initiateTransfer(
    @Body() initiateTransferDto: InitiateTransferDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<InitiateTransferResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Initiating transfer', {
      fromWarehouseId: initiateTransferDto.fromWarehouseId,
      toWarehouseId: initiateTransferDto.toWarehouseId,
      orgId,
      createdBy: user.id,
    });

    const request = {
      fromWarehouseId: initiateTransferDto.fromWarehouseId,
      toWarehouseId: initiateTransferDto.toWarehouseId,
      note: initiateTransferDto.note,
      lines: initiateTransferDto.lines,
      createdBy: user.id,
      orgId,
    };

    const result = await this.initiateTransferUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_READ)
  @ApiOperation({
    summary: 'Get all transfers',
    description:
      'Get a paginated list of transfers in the organization. Requires INVENTORY:READ permission.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'fromWarehouseId', required: false, type: String })
  @ApiQuery({ name: 'toWarehouseId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'IN_TRANSIT', 'PARTIAL', 'RECEIVED', 'REJECTED', 'CANCELED'],
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['status', 'createdAt', 'initiatedAt', 'receivedAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfers retrieved successfully',
    type: GetTransfersResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getTransfers(
    @Query() query: GetTransfersQueryDto,
    @OrgId() orgId: string
  ): Promise<GetTransfersResponseDto> {
    this.logger.log('Getting transfers', { orgId, ...query });

    const request = {
      orgId,
      page: query.page,
      limit: query.limit,
      fromWarehouseId: query.fromWarehouseId,
      toWarehouseId: query.toWarehouseId,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await this.getTransfersUseCase.execute(request);
    return resultToHttpResponse(result);
  }
}
