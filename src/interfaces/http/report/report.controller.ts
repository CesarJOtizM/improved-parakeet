import {
  ViewReportUseCase,
  StreamReportUseCase,
  ExportReportUseCase,
  GetReportsUseCase,
} from '@application/reportUseCases';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { PermissionsGuard } from '@auth/security/guards/permissionsGuard';
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
  Headers,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import {
  RequireReportPermission,
  RequireExportPermission,
} from '@report/decorators/requireReportPermission.decorator';
import { REPORT_TYPES } from '@report/domain/valueObjects';
import { ViewReportQueryDto, ViewReportResponseDto, ExportReportDto } from '@report/dto';
import { ReportLoggingInterceptor } from '@report/interceptors/reportLogging.interceptor';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

import type { Response } from 'express';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ReportLoggingInterceptor)
@ApiBearerAuth()
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(
    private readonly viewReportUseCase: ViewReportUseCase,
    private readonly streamReportUseCase: StreamReportUseCase,
    private readonly exportReportUseCase: ExportReportUseCase,
    private readonly getReportsUseCase: GetReportsUseCase
  ) {}

  // ============================================================
  // VIEW ENDPOINTS (GET - Returns JSON for frontend tables)
  // ============================================================

  @Get('inventory/available/view')
  @RequireReportPermission(REPORT_TYPES.AVAILABLE_INVENTORY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View available inventory report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewAvailableInventory(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing available inventory report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.AVAILABLE_INVENTORY,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('inventory/movement-history/view')
  @RequireReportPermission(REPORT_TYPES.MOVEMENT_HISTORY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View movement history report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewMovementHistory(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing movement history report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.MOVEMENT_HISTORY,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('inventory/valuation/view')
  @RequireReportPermission(REPORT_TYPES.VALUATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View inventory valuation report (using PPM)' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewValuation(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing valuation report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.VALUATION,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('inventory/low-stock/view')
  @RequireReportPermission(REPORT_TYPES.LOW_STOCK)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View low stock alert report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewLowStock(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing low stock report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.LOW_STOCK,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('inventory/movements/view')
  @RequireReportPermission(REPORT_TYPES.MOVEMENTS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View movements summary report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewMovementsSummary(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing movements summary report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.MOVEMENTS,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('inventory/financial/view')
  @RequireReportPermission(REPORT_TYPES.FINANCIAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View financial report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewFinancial(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing financial report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.FINANCIAL,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('inventory/turnover/view')
  @RequireReportPermission(REPORT_TYPES.TURNOVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View inventory turnover report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewTurnover(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing turnover report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.TURNOVER,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('sales/view')
  @RequireReportPermission(REPORT_TYPES.SALES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View sales report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewSales(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing sales report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.SALES,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('sales/by-product/view')
  @RequireReportPermission(REPORT_TYPES.SALES_BY_PRODUCT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View sales by product report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewSalesByProduct(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing sales by product report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.SALES_BY_PRODUCT,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('sales/by-warehouse/view')
  @RequireReportPermission(REPORT_TYPES.SALES_BY_WAREHOUSE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View sales by warehouse report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewSalesByWarehouse(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing sales by warehouse report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.SALES_BY_WAREHOUSE,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('returns/view')
  @RequireReportPermission(REPORT_TYPES.RETURNS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View returns report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewReturns(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing returns report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.RETURNS,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('returns/by-type/view')
  @RequireReportPermission(REPORT_TYPES.RETURNS_BY_TYPE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View returns by type report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewReturnsByType(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing returns by type report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.RETURNS_BY_TYPE,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('returns/by-product/view')
  @RequireReportPermission(REPORT_TYPES.RETURNS_BY_PRODUCT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View returns by product report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewReturnsByProduct(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing returns by product report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.RETURNS_BY_PRODUCT,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('returns/by-sale/:saleId/view')
  @RequireReportPermission(REPORT_TYPES.RETURNS_BY_SALE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View returns by sale report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewReturnsBySale(
    @Query() query: ViewReportQueryDto,
    @Param('saleId') saleId: string,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing returns by sale report', { orgId, saleId });
    const parameters = {
      ...this.mapQueryToParameters(query),
      saleId,
    };
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.RETURNS_BY_SALE,
      parameters,
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('returns/customer/view')
  @RequireReportPermission(REPORT_TYPES.RETURNS_CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View customer returns report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewCustomerReturns(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing customer returns report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.RETURNS_CUSTOMER,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  @Get('returns/supplier/view')
  @RequireReportPermission(REPORT_TYPES.RETURNS_SUPPLIER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View supplier returns report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated successfully',
    type: ViewReportResponseDto,
  })
  async viewSupplierReturns(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ViewReportResponseDto> {
    this.logger.log('Viewing supplier returns report', { orgId });
    const result = await this.viewReportUseCase.execute({
      type: REPORT_TYPES.RETURNS_SUPPLIER,
      parameters: this.mapQueryToParameters(query),
      orgId,
      viewedBy: userId || 'system',
    });
    return resultToHttpResponse(result);
  }

  // ============================================================
  // STREAMING ENDPOINTS (GET - Returns NDJSON stream)
  // ============================================================

  @Get('inventory/available/stream')
  @RequireReportPermission(REPORT_TYPES.AVAILABLE_INVENTORY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stream available inventory report (NDJSON)' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report streamed successfully (NDJSON format)',
  })
  async streamAvailableInventory(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Res() res: Response
  ): Promise<void> {
    this.logger.log('Streaming available inventory report', { orgId });
    await this.handleStream(REPORT_TYPES.AVAILABLE_INVENTORY, query, orgId, res);
  }

  @Get('sales/view/stream')
  @RequireReportPermission(REPORT_TYPES.SALES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stream sales report (NDJSON)' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report streamed successfully (NDJSON format)',
  })
  async streamSales(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Res() res: Response
  ): Promise<void> {
    this.logger.log('Streaming sales report', { orgId });
    await this.handleStream(REPORT_TYPES.SALES, query, orgId, res);
  }

  @Get('returns/view/stream')
  @RequireReportPermission(REPORT_TYPES.RETURNS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stream returns report (NDJSON)' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report streamed successfully (NDJSON format)',
  })
  async streamReturns(
    @Query() query: ViewReportQueryDto,
    @Headers('X-Organization-ID') orgId: string,
    @Res() res: Response
  ): Promise<void> {
    this.logger.log('Streaming returns report', { orgId });
    await this.handleStream(REPORT_TYPES.RETURNS, query, orgId, res);
  }

  // ============================================================
  // EXPORT ENDPOINTS (POST - Returns file directly)
  // ============================================================

  @Post('inventory/available/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export available inventory report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportAvailableInventory(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.AVAILABLE_INVENTORY, dto, orgId, userId || 'system', res);
  }

  @Post('inventory/movement-history/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export movement history report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportMovementHistory(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.MOVEMENT_HISTORY, dto, orgId, userId || 'system', res);
  }

  @Post('inventory/valuation/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export inventory valuation report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportValuation(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.VALUATION, dto, orgId, userId || 'system', res);
  }

  @Post('inventory/low-stock/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export low stock alert report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportLowStock(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.LOW_STOCK, dto, orgId, userId || 'system', res);
  }

  @Post('inventory/movements/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export movements summary report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportMovementsSummary(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.MOVEMENTS, dto, orgId, userId || 'system', res);
  }

  @Post('inventory/financial/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export financial report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportFinancial(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.FINANCIAL, dto, orgId, userId || 'system', res);
  }

  @Post('inventory/turnover/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export inventory turnover report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportTurnover(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.TURNOVER, dto, orgId, userId || 'system', res);
  }

  @Post('sales/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export sales report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportSales(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.SALES, dto, orgId, userId || 'system', res);
  }

  @Post('sales/by-product/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export sales by product report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportSalesByProduct(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.SALES_BY_PRODUCT, dto, orgId, userId || 'system', res);
  }

  @Post('sales/by-warehouse/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export sales by warehouse report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportSalesByWarehouse(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.SALES_BY_WAREHOUSE, dto, orgId, userId || 'system', res);
  }

  @Post('returns/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export returns report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportReturns(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.RETURNS, dto, orgId, userId || 'system', res);
  }

  @Post('returns/by-type/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export returns by type report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportReturnsByType(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.RETURNS_BY_TYPE, dto, orgId, userId || 'system', res);
  }

  @Post('returns/by-product/export')
  @RequireExportPermission()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export returns by product report' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report exported successfully' })
  async exportReturnsByProduct(
    @Body() dto: ExportReportDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string,
    @Res() res: Response
  ): Promise<void> {
    await this.handleExport(REPORT_TYPES.RETURNS_BY_PRODUCT, dto, orgId, userId || 'system', res);
  }

  // ============================================================
  // AUDIT ENDPOINTS (GET - Report history)
  // ============================================================

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get report execution history' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Report history retrieved successfully' })
  async getReportHistory(
    @Query('type') type: string | undefined,
    @Query('status') status: string | undefined,
    @Query('generatedBy') generatedBy: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Headers('X-Organization-ID') orgId: string
  ) {
    this.logger.log('Getting report history', { orgId, type, status });
    const result = await this.getReportsUseCase.execute({
      orgId,
      type,
      status,
      generatedBy,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return resultToHttpResponse(result);
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private async handleExport(
    type: string,
    dto: ExportReportDto,
    orgId: string,
    userId: string,
    res: Response
  ): Promise<void> {
    this.logger.log('Exporting report', { type, format: dto.format, orgId });

    const result = await this.exportReportUseCase.execute({
      type,
      format: dto.format,
      parameters: this.mapDtoToParameters(dto.parameters),
      orgId,
      exportedBy: userId,
      options: dto.options,
      saveMetadata: dto.saveMetadata,
    });

    const response = resultToHttpResponse(result);

    res.set({
      'Content-Type': response.data.mimeType,
      'Content-Disposition': `attachment; filename="${response.data.filename}"`,
      'Content-Length': response.data.size,
    });

    res.send(response.data.buffer);
  }

  private mapQueryToParameters(query: ViewReportQueryDto) {
    return {
      dateRange: query.dateRange
        ? {
            startDate: new Date(query.dateRange.startDate),
            endDate: new Date(query.dateRange.endDate),
          }
        : undefined,
      warehouseId: query.warehouseId,
      productId: query.productId,
      category: query.category,
      status: query.status,
      returnType: query.returnType as 'CUSTOMER' | 'SUPPLIER' | undefined,
      groupBy: query.groupBy as
        | 'DAY'
        | 'WEEK'
        | 'MONTH'
        | 'PRODUCT'
        | 'WAREHOUSE'
        | 'CUSTOMER'
        | 'TYPE'
        | undefined,
      period: query.period as 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | undefined,
      movementType: query.movementType,
      customerReference: query.customerReference,
      saleId: query.saleId,
      movementId: query.movementId,
      includeInactive: query.includeInactive,
      locationId: query.locationId,
      severity: query.severity as 'CRITICAL' | 'WARNING' | undefined,
    };
  }

  private mapDtoToParameters(dto?: ViewReportQueryDto) {
    if (!dto) {
      return {};
    }
    return this.mapQueryToParameters(dto);
  }

  private async handleStream(
    type: string,
    query: ViewReportQueryDto,
    orgId: string,
    res: Response
  ): Promise<void> {
    try {
      // Set headers for streaming
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Create stream
      const stream = this.streamReportUseCase.execute({
        type,
        parameters: this.mapQueryToParameters(query),
        orgId,
      });

      // Stream data in chunks
      for await (const batch of stream) {
        // Check if client disconnected
        if (res.closed) {
          this.logger.log('Client disconnected, stopping stream', { type, orgId });
          break;
        }

        // Write each item in the batch as a JSON line
        for (const item of batch) {
          res.write(JSON.stringify(item) + '\n');
        }
      }

      res.end();
      this.logger.log('Stream completed successfully', { type, orgId });
    } catch (error) {
      this.logger.error('Error streaming report', {
        type,
        orgId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Try to send error as JSON line if connection is still open
      if (!res.closed) {
        try {
          res.write(
            JSON.stringify({
              error: true,
              message: error instanceof Error ? error.message : 'Failed to stream report',
            }) + '\n'
          );
          res.end();
        } catch {
          // Connection already closed, ignore
        }
      }
    }
  }
}
