import { CancelTransferUseCase } from '@application/transferUseCases/cancelTransferUseCase';
import { ConfirmTransferUseCase } from '@application/transferUseCases/confirmTransferUseCase';
import { GetTransferByIdUseCase } from '@application/transferUseCases/getTransferByIdUseCase';
import { GetTransfersUseCase } from '@application/transferUseCases/getTransfersUseCase';
import { InitiateTransferUseCase } from '@application/transferUseCases/initiateTransferUseCase';
import { ReceiveTransferUseCase } from '@application/transferUseCases/receiveTransferUseCase';
import { RejectTransferUseCase } from '@application/transferUseCases/rejectTransferUseCase';
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
  GetTransferByIdResponseDto,
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
    private readonly getTransfersUseCase: GetTransfersUseCase,
    private readonly getTransferByIdUseCase: GetTransferByIdUseCase,
    private readonly confirmTransferUseCase: ConfirmTransferUseCase,
    private readonly receiveTransferUseCase: ReceiveTransferUseCase,
    private readonly rejectTransferUseCase: RejectTransferUseCase,
    private readonly cancelTransferUseCase: CancelTransferUseCase
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

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_READ)
  @ApiOperation({
    summary: 'Get transfer by ID',
    description:
      'Get a transfer by its ID including warehouse names and product details. Requires INVENTORY:READ permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer retrieved successfully',
    type: GetTransferByIdResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transfer not found',
  })
  async getTransferById(
    @Param('id') id: string,
    @OrgId() orgId: string
  ): Promise<GetTransferByIdResponseDto> {
    this.logger.log('Getting transfer by ID', { transferId: id, orgId });

    const result = await this.getTransferByIdUseCase.execute({
      transferId: id,
      orgId,
    });
    return resultToHttpResponse(result);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_TRANSFER)
  @ApiOperation({
    summary: 'Confirm transfer',
    description:
      'Confirm a transfer and create OUT movement from origin warehouse. Changes status from DRAFT to IN_TRANSIT. Requires INVENTORY:TRANSFER permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer confirmed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transfer not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Transfer cannot be confirmed',
  })
  async confirmTransfer(@Param('id') id: string, @OrgId() orgId: string): Promise<unknown> {
    this.logger.log('Confirming transfer', { transferId: id, orgId });

    const result = await this.confirmTransferUseCase.execute({
      transferId: id,
      orgId,
    });
    return resultToHttpResponse(result);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_TRANSFER)
  @ApiOperation({
    summary: 'Receive transfer',
    description:
      'Receive a transfer and create IN movement at destination warehouse. Changes status from IN_TRANSIT to RECEIVED. Requires INVENTORY:TRANSFER permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer received successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transfer not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Transfer cannot be received',
  })
  async receiveTransfer(
    @Param('id') id: string,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<unknown> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Receiving transfer', { transferId: id, orgId, receivedBy: user.id });

    const result = await this.receiveTransferUseCase.execute({
      transferId: id,
      orgId,
      receivedBy: user.id,
    });
    return resultToHttpResponse(result);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_TRANSFER)
  @ApiOperation({
    summary: 'Reject transfer',
    description:
      'Reject a transfer. Changes status from IN_TRANSIT to REJECTED. Note: Stock was already deducted from origin. Requires INVENTORY:TRANSFER permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer rejected successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transfer not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Transfer cannot be rejected',
  })
  async rejectTransfer(
    @Param('id') id: string,
    @OrgId() orgId: string,
    @Body() body: { reason?: string }
  ): Promise<unknown> {
    this.logger.log('Rejecting transfer', { transferId: id, orgId, reason: body.reason });

    const result = await this.rejectTransferUseCase.execute({
      transferId: id,
      orgId,
      reason: body.reason,
    });
    return resultToHttpResponse(result);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_TRANSFER)
  @ApiOperation({
    summary: 'Cancel transfer',
    description:
      'Cancel a transfer. Only DRAFT transfers can be canceled. Requires INVENTORY:TRANSFER permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer canceled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transfer not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Transfer cannot be canceled',
  })
  async cancelTransfer(@Param('id') id: string, @OrgId() orgId: string): Promise<unknown> {
    this.logger.log('Canceling transfer', { transferId: id, orgId });

    const result = await this.cancelTransferUseCase.execute({
      transferId: id,
      orgId,
    });
    return resultToHttpResponse(result);
  }
}
