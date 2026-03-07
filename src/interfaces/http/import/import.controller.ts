import {
  CreateImportBatchUseCase,
  DownloadErrorReportUseCase,
  DownloadImportTemplateUseCase,
  ExecuteImportUseCase,
  GetImportStatusUseCase,
  ListImportBatchesUseCase,
  PreviewImportUseCase,
  ProcessImportUseCase,
  ValidateImportUseCase,
} from '@application/importUseCases';
import {
  CreateImportBatchDto,
  DownloadErrorReportQueryDto,
  ErrorReportResponseDto,
  ExecuteImportDto,
  ExecuteImportResponseDto,
  ImportStatusResponseDto,
  ListImportBatchesQueryDto,
  PreviewImportDto,
  PreviewImportResponseDto,
  ProcessImportDto,
} from '@import/dto';
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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { PermissionGuard } from '@shared/guards/permission.guard';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

import type { IAuthenticatedUser } from '@shared/types/http.types';
import type { ImportTypeValue } from '@import/domain';
import type { Request, Response } from 'express';

@ApiTags('Import')
@Controller('imports')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class ImportController {
  private readonly logger = new Logger(ImportController.name);

  constructor(
    private readonly createImportBatchUseCase: CreateImportBatchUseCase,
    private readonly validateImportUseCase: ValidateImportUseCase,
    private readonly processImportUseCase: ProcessImportUseCase,
    private readonly getImportStatusUseCase: GetImportStatusUseCase,
    private readonly downloadImportTemplateUseCase: DownloadImportTemplateUseCase,
    private readonly downloadErrorReportUseCase: DownloadErrorReportUseCase,
    private readonly previewImportUseCase: PreviewImportUseCase,
    private readonly executeImportUseCase: ExecuteImportUseCase,
    private readonly listImportBatchesUseCase: ListImportBatchesUseCase
  ) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_IMPORT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Preview and validate import file without persisting' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel or CSV file to preview',
        },
        type: {
          type: 'string',
          enum: ['PRODUCTS', 'MOVEMENTS', 'WAREHOUSES', 'STOCK', 'TRANSFERS'],
          description: 'Type of import',
        },
      },
      required: ['file', 'type'],
    },
  })
  @ApiResponse({ status: HttpStatus.OK, type: PreviewImportResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file or validation failed' })
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: PreviewImportDto,
    @OrgId() orgId: string
  ) {
    this.logger.log('Previewing import file', { type: dto.type, fileName: file?.originalname });

    const result = await this.previewImportUseCase.execute({
      type: dto.type as ImportTypeValue,
      file,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_IMPORT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({
    summary: 'Execute complete import process (validate + create + process) in one operation',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel or CSV file to import',
        },
        type: {
          type: 'string',
          enum: ['PRODUCTS', 'MOVEMENTS', 'WAREHOUSES', 'STOCK', 'TRANSFERS'],
          description: 'Type of import',
        },
        note: {
          type: 'string',
          description: 'Optional note for this import',
        },
      },
      required: ['file', 'type'],
    },
  })
  @ApiResponse({ status: HttpStatus.OK, type: ExecuteImportResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation errors - import rejected',
  })
  async executeImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ExecuteImportDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ) {
    this.logger.log('Executing import', { type: dto.type, fileName: file?.originalname });

    const user = req.user as IAuthenticatedUser;
    const createdBy = user.id;

    const result = await this.executeImportUseCase.execute({
      type: dto.type as ImportTypeValue,
      file,
      note: dto.note,
      createdBy,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_IMPORT)
  @ApiOperation({ summary: 'Create a new import batch' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Import batch created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data' })
  async createImportBatch(
    @Body() dto: CreateImportBatchDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ) {
    this.logger.log('Creating import batch', { type: dto.type, fileName: dto.fileName });

    const user = req.user as IAuthenticatedUser;
    const createdBy = user.id;

    const result = await this.createImportBatchUseCase.execute({
      type: dto.type as ImportTypeValue,
      fileName: dto.fileName,
      note: dto.note,
      createdBy,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_IMPORT)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Validate an import batch with uploaded file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel or CSV file to validate',
        },
      },
      required: ['file'],
    },
  })
  @ApiParam({ name: 'id', description: 'Import batch ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Import batch validated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Import batch not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file or validation failed' })
  async validateImportBatch(
    @Param('id') batchId: string,
    @UploadedFile() file: Express.Multer.File,
    @OrgId() orgId: string
  ) {
    this.logger.log('Validating import batch', { batchId, fileName: file?.originalname });

    const result = await this.validateImportUseCase.execute({
      batchId,
      file,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_IMPORT)
  @ApiOperation({ summary: 'Process a validated import batch' })
  @ApiParam({ name: 'id', description: 'Import batch ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Import batch processed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Import batch not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Batch not in VALIDATED status' })
  async processImportBatch(
    @Param('id') batchId: string,
    @Body() dto: ProcessImportDto,
    @OrgId() orgId: string
  ) {
    this.logger.log('Processing import batch', { batchId, skipInvalidRows: dto.skipInvalidRows });

    const result = await this.processImportUseCase.execute({
      batchId,
      skipInvalidRows: dto.skipInvalidRows,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_IMPORT)
  @ApiOperation({ summary: 'List import batches with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['PRODUCTS', 'MOVEMENTS', 'WAREHOUSES', 'STOCK', 'TRANSFERS'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'VALIDATING', 'VALIDATED', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of import batches' })
  async listImportBatches(@Query() query: ListImportBatchesQueryDto, @OrgId() orgId: string) {
    this.logger.log('Listing import batches', { ...query });

    const result = await this.listImportBatchesUseCase.execute({
      page: query.page,
      limit: query.limit,
      type: query.type as import('@import/domain').ImportTypeValue,
      status: query.status as import('@import/domain').ImportStatusValue,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Get(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_IMPORT)
  @ApiOperation({ summary: 'Get import batch status' })
  @ApiParam({ name: 'id', description: 'Import batch ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ImportStatusResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Import batch not found' })
  async getImportStatus(@Param('id') batchId: string, @OrgId() orgId: string) {
    this.logger.log('Getting import status', { batchId });

    const result = await this.getImportStatusUseCase.execute({
      batchId,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Get('templates/:type')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_IMPORT)
  @ApiOperation({ summary: 'Download import template for a specific type' })
  @ApiParam({
    name: 'type',
    description: 'Import type',
    enum: ['PRODUCTS', 'MOVEMENTS', 'WAREHOUSES', 'STOCK', 'TRANSFERS'],
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['xlsx', 'csv'],
    description: 'Template format',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template file downloaded' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid import type' })
  async downloadTemplate(
    @Param('type') type: string,
    @Query('format') format: 'xlsx' | 'csv' = 'csv',
    @Res() res: Response,
    @OrgId() orgId: string
  ): Promise<void> {
    this.logger.log('Downloading import template', { type, format });

    const result = await this.downloadImportTemplateUseCase.execute({
      type: type as ImportTypeValue,
      format,
      orgId,
    });

    if (result.isErr()) {
      resultToHttpResponse(result);
      return;
    }

    const data = result.unwrap().data;

    res.setHeader('Content-Type', data.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
    res.send(data.content);
  }

  @Get(':id/errors')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_IMPORT)
  @ApiOperation({ summary: 'Get error report for an import batch' })
  @ApiParam({ name: 'id', description: 'Import batch ID' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['xlsx', 'csv'],
    description: 'Report format',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ErrorReportResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Import batch not found' })
  async getErrorReport(
    @Param('id') batchId: string,
    @Query() query: DownloadErrorReportQueryDto,
    @Res() res: Response,
    @OrgId() orgId: string
  ): Promise<void> {
    this.logger.log('Getting error report', { batchId, format: query.format });

    const result = await this.downloadErrorReportUseCase.execute({
      batchId,
      format: query.format,
      orgId,
    });

    if (result.isErr()) {
      resultToHttpResponse(result);
      return;
    }

    const data = result.unwrap().data;

    res.setHeader('Content-Type', data.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${data.filename}"`);
    res.send(data.content);
  }
}
