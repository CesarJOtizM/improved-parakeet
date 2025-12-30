import {
  CreateImportBatchUseCase,
  DownloadErrorReportUseCase,
  DownloadImportTemplateUseCase,
  ExecuteImportUseCase,
  GetImportStatusUseCase,
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
  PreviewImportDto,
  PreviewImportResponseDto,
  ProcessImportDto,
} from '@import/dto';
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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

import type { ImportTypeValue } from '@import/domain';
import type { Response } from 'express';

@ApiTags('Import')
@Controller('imports')
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
    private readonly executeImportUseCase: ExecuteImportUseCase
  ) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
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
  async previewImport(@UploadedFile() file: Express.Multer.File, @Body() dto: PreviewImportDto) {
    this.logger.log('Previewing import file', { type: dto.type, fileName: file?.originalname });

    // TODO: Extract from JWT/context in production
    const orgId = 'org-placeholder';

    const result = await this.previewImportUseCase.execute({
      type: dto.type as ImportTypeValue,
      file,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
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
  async executeImport(@UploadedFile() file: Express.Multer.File, @Body() dto: ExecuteImportDto) {
    this.logger.log('Executing import', { type: dto.type, fileName: file?.originalname });

    // TODO: Extract from JWT/context in production
    const orgId = 'org-placeholder';
    const createdBy = 'user-placeholder';

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
  @ApiOperation({ summary: 'Create a new import batch' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Import batch created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data' })
  async createImportBatch(
    @Body() dto: CreateImportBatchDto
    // In production, extract orgId from JWT and createdBy from user context
    // @OrgId() orgId: string,
    // @CurrentUser() user: User
  ) {
    this.logger.log('Creating import batch', { type: dto.type, fileName: dto.fileName });

    // TODO: Extract from JWT/context in production
    const orgId = 'org-placeholder';
    const createdBy = 'user-placeholder';

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
  @UseInterceptors(FileInterceptor('file'))
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
    @UploadedFile() file: Express.Multer.File
  ) {
    this.logger.log('Validating import batch', { batchId, fileName: file?.originalname });

    // TODO: Extract from JWT/context in production
    const orgId = 'org-placeholder';

    const result = await this.validateImportUseCase.execute({
      batchId,
      file,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a validated import batch' })
  @ApiParam({ name: 'id', description: 'Import batch ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Import batch processed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Import batch not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Batch not in VALIDATED status' })
  async processImportBatch(@Param('id') batchId: string, @Body() dto: ProcessImportDto) {
    this.logger.log('Processing import batch', { batchId, skipInvalidRows: dto.skipInvalidRows });

    // TODO: Extract from JWT/context in production
    const orgId = 'org-placeholder';

    const result = await this.processImportUseCase.execute({
      batchId,
      skipInvalidRows: dto.skipInvalidRows,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Get(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get import batch status' })
  @ApiParam({ name: 'id', description: 'Import batch ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ImportStatusResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Import batch not found' })
  async getImportStatus(@Param('id') batchId: string) {
    this.logger.log('Getting import status', { batchId });

    // TODO: Extract from JWT/context in production
    const orgId = 'org-placeholder';

    const result = await this.getImportStatusUseCase.execute({
      batchId,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Get('templates/:type')
  @HttpCode(HttpStatus.OK)
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
    @Res() res: Response
  ): Promise<void> {
    this.logger.log('Downloading import template', { type, format });

    // TODO: Extract from JWT/context in production
    const orgId = 'org-placeholder';

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
    @Res() res: Response
  ): Promise<void> {
    this.logger.log('Getting error report', { batchId, format: query.format });

    // TODO: Extract from JWT/context in production
    const orgId = 'org-placeholder';

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
