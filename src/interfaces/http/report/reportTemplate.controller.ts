import {
  CreateReportTemplateUseCase,
  UpdateReportTemplateUseCase,
  GetReportTemplatesUseCase,
} from '@application/reportUseCases';
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { IReportParametersInput } from '@report/domain/valueObjects';
import {
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  ReportTemplateListResponseDto,
  ReportTemplateCreateResponseDto,
  ReportParametersDto,
} from '@report/dto';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Report Templates')
@Controller('report-templates')
export class ReportTemplateController {
  private readonly logger = new Logger(ReportTemplateController.name);

  constructor(
    private readonly createReportTemplateUseCase: CreateReportTemplateUseCase,
    private readonly updateReportTemplateUseCase: UpdateReportTemplateUseCase,
    private readonly getReportTemplatesUseCase: GetReportTemplatesUseCase
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all report templates' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report templates retrieved successfully',
    type: ReportTemplateListResponseDto,
  })
  async getTemplates(
    @Query('type') type: string | undefined,
    @Query('activeOnly') activeOnly: string | undefined,
    @Query('createdBy') createdBy: string | undefined,
    @Headers('X-Organization-ID') orgId: string
  ): Promise<ReportTemplateListResponseDto> {
    this.logger.log('Getting report templates', { orgId, type, activeOnly });
    const result = await this.getReportTemplatesUseCase.execute({
      orgId,
      type,
      activeOnly: activeOnly === 'true',
      createdBy,
    });
    return resultToHttpResponse(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new report template' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiHeader({ name: 'X-User-ID', required: true, description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report template created successfully',
    type: ReportTemplateCreateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Template with same name already exists',
  })
  async createTemplate(
    @Body() dto: CreateReportTemplateDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ReportTemplateCreateResponseDto> {
    this.logger.log('Creating report template', {
      name: dto.name,
      type: dto.type,
      orgId,
    });

    const result = await this.createReportTemplateUseCase.execute({
      name: dto.name,
      description: dto.description,
      type: dto.type,
      defaultParameters: dto.defaultParameters
        ? this.mapDtoToParameters(dto.defaultParameters)
        : {},
      createdBy: userId,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a report template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiHeader({ name: 'X-User-ID', required: true, description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report template updated successfully',
    type: ReportTemplateCreateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Template with same name already exists',
  })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateReportTemplateDto,
    @Headers('X-Organization-ID') orgId: string,
    @Headers('X-User-ID') userId: string
  ): Promise<ReportTemplateCreateResponseDto> {
    this.logger.log('Updating report template', {
      id,
      name: dto.name,
      orgId,
    });

    const result = await this.updateReportTemplateUseCase.execute({
      templateId: id,
      name: dto.name,
      description: dto.description,
      defaultParameters: dto.defaultParameters
        ? this.mapDtoToParameters(dto.defaultParameters)
        : undefined,
      isActive: dto.isActive,
      updatedBy: userId,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active report templates' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active report templates retrieved successfully',
    type: ReportTemplateListResponseDto,
  })
  async getActiveTemplates(
    @Headers('X-Organization-ID') orgId: string
  ): Promise<ReportTemplateListResponseDto> {
    this.logger.log('Getting active report templates', { orgId });
    const result = await this.getReportTemplatesUseCase.execute({
      orgId,
      activeOnly: true,
    });
    return resultToHttpResponse(result);
  }

  @Get('by-type/:type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get report templates by type' })
  @ApiParam({ name: 'type', description: 'Report type' })
  @ApiHeader({ name: 'X-Organization-ID', required: true, description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report templates retrieved successfully',
    type: ReportTemplateListResponseDto,
  })
  async getTemplatesByType(
    @Param('type') type: string,
    @Headers('X-Organization-ID') orgId: string
  ): Promise<ReportTemplateListResponseDto> {
    this.logger.log('Getting report templates by type', { orgId, type });
    const result = await this.getReportTemplatesUseCase.execute({
      orgId,
      type,
    });
    return resultToHttpResponse(result);
  }

  private mapDtoToParameters(dto: ReportParametersDto): IReportParametersInput {
    return {
      dateRange: dto.dateRange
        ? {
            startDate: new Date(dto.dateRange.startDate),
            endDate: new Date(dto.dateRange.endDate),
          }
        : undefined,
      warehouseId: dto.warehouseId,
      productId: dto.productId,
      category: dto.category,
      status: dto.status,
      returnType: dto.returnType as 'CUSTOMER' | 'SUPPLIER' | undefined,
      groupBy: dto.groupBy as
        | 'DAY'
        | 'WEEK'
        | 'MONTH'
        | 'PRODUCT'
        | 'WAREHOUSE'
        | 'CUSTOMER'
        | 'TYPE'
        | undefined,
      period: dto.period as 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | undefined,
      movementType: dto.movementType,
      customerReference: dto.customerReference,
      saleId: dto.saleId,
      movementId: dto.movementId,
      includeInactive: dto.includeInactive,
      locationId: dto.locationId,
      severity: dto.severity as 'CRITICAL' | 'WARNING' | undefined,
    };
  }
}
