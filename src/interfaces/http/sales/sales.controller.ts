import { GetReturnsBySaleUseCase } from '@application/returnUseCases/getReturnsBySaleUseCase';
import { AddSaleLineUseCase } from '@application/saleUseCases/addSaleLineUseCase';
import { CancelSaleUseCase } from '@application/saleUseCases/cancelSaleUseCase';
import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
import { CreateSaleUseCase } from '@application/saleUseCases/createSaleUseCase';
import { GetSaleByIdUseCase } from '@application/saleUseCases/getSaleByIdUseCase';
import { GetSaleMovementUseCase } from '@application/saleUseCases/getSaleMovementUseCase';
import { GetSalesUseCase } from '@application/saleUseCases/getSalesUseCase';
import { RemoveSaleLineUseCase } from '@application/saleUseCases/removeSaleLineUseCase';
import { UpdateSaleUseCase } from '@application/saleUseCases/updateSaleUseCase';
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
import { CreateSaleDto, UpdateSaleDto, GetSalesDto } from '@sale/dto';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';

import type { IAuthenticatedUser } from '@shared/types/http.types';
import type { Request } from 'express';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class SalesController {
  private readonly logger = new Logger(SalesController.name);

  constructor(
    private readonly createSaleUseCase: CreateSaleUseCase,
    private readonly getSalesUseCase: GetSalesUseCase,
    private readonly getSaleByIdUseCase: GetSaleByIdUseCase,
    private readonly updateSaleUseCase: UpdateSaleUseCase,
    private readonly confirmSaleUseCase: ConfirmSaleUseCase,
    private readonly cancelSaleUseCase: CancelSaleUseCase,
    private readonly addSaleLineUseCase: AddSaleLineUseCase,
    private readonly removeSaleLineUseCase: RemoveSaleLineUseCase,
    private readonly getSaleMovementUseCase: GetSaleMovementUseCase,
    private readonly getReturnsBySaleUseCase: GetReturnsBySaleUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.SALES_CREATE)
  @ApiOperation({
    summary: 'Create new sale',
    description: 'Create a new sale in DRAFT status. Requires INVENTORY:ENTRY permission.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Sale created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createSale(
    @Body() createSaleDto: CreateSaleDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ) {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Creating sale', {
      warehouseId: createSaleDto.warehouseId,
      orgId,
      createdBy: user.id,
    });

    const request = {
      warehouseId: createSaleDto.warehouseId,
      customerReference: createSaleDto.customerReference,
      externalReference: createSaleDto.externalReference,
      note: createSaleDto.note,
      lines: createSaleDto.lines,
      createdBy: user.id,
      orgId,
    };

    return await this.createSaleUseCase.execute(request);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SALES_READ)
  @ApiOperation({
    summary: 'List sales',
    description: 'Get a list of sales with optional filters. Requires INVENTORY:VIEW permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sales retrieved successfully',
  })
  async getSales(@Query() query: GetSalesDto, @OrgId() orgId: string) {
    this.logger.log('Getting sales', { orgId, filters: query });

    const request = {
      orgId,
      page: query.page,
      limit: query.limit,
      warehouseId: query.warehouseId,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    return await this.getSalesUseCase.execute(request);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SALES_READ)
  @ApiOperation({
    summary: 'Get sale by ID',
    description: 'Get a sale by its ID. Requires INVENTORY:VIEW permission.',
  })
  @ApiParam({ name: 'id', description: 'Sale ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sale retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Sale not found',
  })
  async getSaleById(@Param('id') id: string, @OrgId() orgId: string) {
    this.logger.log('Getting sale by ID', { saleId: id, orgId });

    return await this.getSaleByIdUseCase.execute({ id, orgId });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SALES_UPDATE)
  @ApiOperation({
    summary: 'Update sale',
    description: 'Update a sale (only DRAFT status). Requires INVENTORY:ENTRY permission.',
  })
  @ApiParam({ name: 'id', description: 'Sale ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sale updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or sale cannot be updated',
  })
  async updateSale(
    @Param('id') id: string,
    @Body() updateSaleDto: UpdateSaleDto,
    @OrgId() orgId: string
  ) {
    this.logger.log('Updating sale', { saleId: id, orgId });

    const request = {
      id,
      customerReference: updateSaleDto.customerReference,
      externalReference: updateSaleDto.externalReference,
      note: updateSaleDto.note,
      orgId,
    };

    return await this.updateSaleUseCase.execute(request);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SALES_CONFIRM)
  @ApiOperation({
    summary: 'Confirm sale',
    description:
      'Confirm a sale and generate inventory movement. Requires INVENTORY:ENTRY permission.',
  })
  @ApiParam({ name: 'id', description: 'Sale ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sale confirmed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Sale cannot be confirmed or insufficient stock',
  })
  async confirmSale(@Param('id') id: string, @OrgId() orgId: string) {
    this.logger.log('Confirming sale', { saleId: id, orgId });

    return await this.confirmSaleUseCase.execute({ id, orgId });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SALES_CANCEL)
  @ApiOperation({
    summary: 'Cancel sale',
    description: 'Cancel a sale. Requires INVENTORY:ENTRY permission.',
  })
  @ApiParam({ name: 'id', description: 'Sale ID' })
  @ApiQuery({ name: 'reason', required: false, description: 'Cancellation reason' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sale cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Sale cannot be cancelled',
  })
  async cancelSale(
    @Param('id') id: string,
    @Query('reason') reason: string | undefined,
    @OrgId() orgId: string
  ) {
    this.logger.log('Cancelling sale', { saleId: id, orgId, reason });

    return await this.cancelSaleUseCase.execute({ id, reason, orgId });
  }

  @Post(':id/lines')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.SALES_UPDATE)
  @ApiOperation({
    summary: 'Add line to sale',
    description: 'Add a line to a sale (only DRAFT status). Requires INVENTORY:ENTRY permission.',
  })
  @ApiParam({ name: 'id', description: 'Sale ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Line added successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or sale cannot be modified',
  })
  async addSaleLine(
    @Param('id') saleId: string,
    @Body()
    lineDto: {
      productId: string;
      locationId: string;
      quantity: number;
      salePrice: number;
      currency?: string;
    },
    @OrgId() orgId: string
  ) {
    this.logger.log('Adding line to sale', { saleId, orgId });

    const request = {
      saleId,
      productId: lineDto.productId,
      locationId: lineDto.locationId,
      quantity: lineDto.quantity,
      salePrice: lineDto.salePrice,
      currency: lineDto.currency,
      orgId,
    };

    return await this.addSaleLineUseCase.execute(request);
  }

  @Delete(':id/lines/:lineId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SALES_UPDATE)
  @ApiOperation({
    summary: 'Remove line from sale',
    description:
      'Remove a line from a sale (only DRAFT status). Requires INVENTORY:ENTRY permission.',
  })
  @ApiParam({ name: 'id', description: 'Sale ID' })
  @ApiParam({ name: 'lineId', description: 'Line ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Line removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Sale cannot be modified or line not found',
  })
  async removeSaleLine(
    @Param('id') saleId: string,
    @Param('lineId') lineId: string,
    @OrgId() orgId: string
  ) {
    this.logger.log('Removing line from sale', { saleId, lineId, orgId });

    return await this.removeSaleLineUseCase.execute({ saleId, lineId, orgId });
  }

  @Get(':id/movement')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SALES_READ)
  @ApiOperation({
    summary: 'Get movement for sale',
    description:
      'Get the associated inventory movement for a confirmed sale. Requires INVENTORY:VIEW permission.',
  })
  @ApiParam({ name: 'id', description: 'Sale ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Movement retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Sale is not confirmed or does not have an associated movement',
  })
  async getSaleMovement(@Param('id') id: string, @OrgId() orgId: string) {
    this.logger.log('Getting movement for sale', { saleId: id, orgId });

    return await this.getSaleMovementUseCase.execute({ saleId: id, orgId });
  }

  @Get(':id/returns')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SALES_READ)
  @ApiOperation({
    summary: 'Get returns for sale',
    description: 'Get all returns associated with a sale. Requires SALES:READ permission.',
  })
  @ApiParam({ name: 'id', description: 'Sale ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Sale not found',
  })
  async getReturnsBySale(@Param('id') id: string, @OrgId() orgId: string) {
    this.logger.log('Getting returns for sale', { saleId: id, orgId });

    return await this.getReturnsBySaleUseCase.execute({ saleId: id, orgId });
  }
}
