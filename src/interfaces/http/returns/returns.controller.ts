import { AddReturnLineUseCase } from '@application/returnUseCases/addReturnLineUseCase';
import { CancelReturnUseCase } from '@application/returnUseCases/cancelReturnUseCase';
import { ConfirmReturnUseCase } from '@application/returnUseCases/confirmReturnUseCase';
import { CreateReturnUseCase } from '@application/returnUseCases/createReturnUseCase';
import { GetReturnByIdUseCase } from '@application/returnUseCases/getReturnByIdUseCase';
import { GetReturnsUseCase } from '@application/returnUseCases/getReturnsUseCase';
import { RemoveReturnLineUseCase } from '@application/returnUseCases/removeReturnLineUseCase';
import { UpdateReturnUseCase } from '@application/returnUseCases/updateReturnUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
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
import { CreateReturnDto, UpdateReturnDto, GetReturnsDto } from '@return/dto';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';

import type { IAuthenticatedUser } from '@shared/types/http.types';
import type { Request } from 'express';

@ApiTags('Returns')
@Controller('returns')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class ReturnsController {
  private readonly logger = new Logger(ReturnsController.name);

  constructor(
    private readonly createReturnUseCase: CreateReturnUseCase,
    private readonly getReturnsUseCase: GetReturnsUseCase,
    private readonly getReturnByIdUseCase: GetReturnByIdUseCase,
    private readonly updateReturnUseCase: UpdateReturnUseCase,
    private readonly confirmReturnUseCase: ConfirmReturnUseCase,
    private readonly cancelReturnUseCase: CancelReturnUseCase,
    private readonly addReturnLineUseCase: AddReturnLineUseCase,
    private readonly removeReturnLineUseCase: RemoveReturnLineUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.RETURNS_CREATE)
  @ApiOperation({
    summary: 'Create new return',
    description: 'Create a new return in DRAFT status. Requires RETURNS:CREATE permission.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Return created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createReturn(
    @Body() createReturnDto: CreateReturnDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ) {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Creating return', {
      type: createReturnDto.type,
      warehouseId: createReturnDto.warehouseId,
      orgId,
      createdBy: user.id,
    });

    const request = {
      type: createReturnDto.type,
      warehouseId: createReturnDto.warehouseId,
      saleId: createReturnDto.saleId,
      sourceMovementId: createReturnDto.sourceMovementId,
      reason: createReturnDto.reason,
      note: createReturnDto.note,
      lines: createReturnDto.lines,
      createdBy: user.id,
      orgId,
    };

    return await this.createReturnUseCase.execute(request);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.RETURNS_READ)
  @ApiOperation({
    summary: 'List returns',
    description: 'Get a list of returns with optional filters. Requires RETURNS:READ permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns retrieved successfully',
  })
  async getReturns(@Query() query: GetReturnsDto, @OrgId() orgId: string) {
    this.logger.log('Getting returns', { orgId, filters: query });

    const request = {
      orgId,
      page: query.page,
      limit: query.limit,
      warehouseId: query.warehouseId,
      status: query.status,
      type: query.type,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    return await this.getReturnsUseCase.execute(request);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.RETURNS_READ)
  @ApiOperation({
    summary: 'Get return by ID',
    description: 'Get a return by its ID. Requires RETURNS:READ permission.',
  })
  @ApiParam({ name: 'id', description: 'Return ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Return not found',
  })
  async getReturnById(@Param('id') id: string, @OrgId() orgId: string) {
    this.logger.log('Getting return by ID', { returnId: id, orgId });

    return await this.getReturnByIdUseCase.execute({ id, orgId });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.RETURNS_UPDATE)
  @ApiOperation({
    summary: 'Update return',
    description: 'Update a return (only DRAFT status). Requires RETURNS:UPDATE permission.',
  })
  @ApiParam({ name: 'id', description: 'Return ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or return cannot be updated',
  })
  async updateReturn(
    @Param('id') id: string,
    @Body() updateReturnDto: UpdateReturnDto,
    @OrgId() orgId: string
  ) {
    this.logger.log('Updating return', { returnId: id, orgId });

    const request = {
      id,
      reason: updateReturnDto.reason,
      note: updateReturnDto.note,
      orgId,
    };

    return await this.updateReturnUseCase.execute(request);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.RETURNS_CONFIRM)
  @ApiOperation({
    summary: 'Confirm return',
    description:
      'Confirm a return and generate inventory movement. Requires RETURNS:CONFIRM permission.',
  })
  @ApiParam({ name: 'id', description: 'Return ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return confirmed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Return cannot be confirmed or validation failed',
  })
  async confirmReturn(@Param('id') id: string, @OrgId() orgId: string) {
    this.logger.log('Confirming return', { returnId: id, orgId });

    return await this.confirmReturnUseCase.execute({ id, orgId });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.RETURNS_CANCEL)
  @ApiOperation({
    summary: 'Cancel return',
    description: 'Cancel a return. Requires RETURNS:CANCEL permission.',
  })
  @ApiParam({ name: 'id', description: 'Return ID' })
  @ApiQuery({ name: 'reason', required: false, description: 'Cancellation reason' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Return cannot be cancelled',
  })
  async cancelReturn(
    @Param('id') id: string,
    @Query('reason') reason: string | undefined,
    @OrgId() orgId: string
  ) {
    this.logger.log('Cancelling return', { returnId: id, orgId, reason });

    return await this.cancelReturnUseCase.execute({ id, reason, orgId });
  }

  @Post(':id/lines')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.RETURNS_UPDATE)
  @ApiOperation({
    summary: 'Add line to return',
    description: 'Add a line to a return (only DRAFT status). Requires RETURNS:UPDATE permission.',
  })
  @ApiParam({ name: 'id', description: 'Return ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Line added successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or return cannot be modified',
  })
  async addReturnLine(
    @Param('id') returnId: string,
    @Body()
    lineDto: {
      productId: string;
      locationId: string;
      quantity: number;
      currency?: string;
    },
    @OrgId() orgId: string
  ) {
    this.logger.log('Adding line to return', { returnId, orgId });

    const request = {
      returnId,
      productId: lineDto.productId,
      locationId: lineDto.locationId,
      quantity: lineDto.quantity,
      currency: lineDto.currency,
      orgId,
    };

    return await this.addReturnLineUseCase.execute(request);
  }

  @Delete(':id/lines/:lineId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.RETURNS_UPDATE)
  @ApiOperation({
    summary: 'Remove line from return',
    description:
      'Remove a line from a return (only DRAFT status). Requires RETURNS:UPDATE permission.',
  })
  @ApiParam({ name: 'id', description: 'Return ID' })
  @ApiParam({ name: 'lineId', description: 'Line ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Line removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Return cannot be modified or line not found',
  })
  async removeReturnLine(
    @Param('id') returnId: string,
    @Param('lineId') lineId: string,
    @OrgId() orgId: string
  ) {
    this.logger.log('Removing line from return', { returnId, lineId, orgId });

    return await this.removeReturnLineUseCase.execute({ returnId, lineId, orgId });
  }
}
