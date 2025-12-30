// Import Endpoints E2E Tests
// E2E tests for import endpoints

import {
  CreateImportBatchUseCase,
  DownloadErrorReportUseCase,
  DownloadImportTemplateUseCase,
  ExecuteImportUseCase,
  GetImportStatusUseCase,
  IExecuteImportResponse,
  IPreviewImportResponse,
  PreviewImportUseCase,
  ProcessImportUseCase,
  ValidateImportUseCase,
} from '@application/importUseCases';
import { ImportController } from '@interface/http/import/import.controller';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { err, ok } from '@shared/domain/result';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';
import request from 'supertest';

import {
  generateCSVFile,
  generateInvalidFile,
  generateProductsFileWithErrors,
  generateValidProductsFile,
} from '../helpers/testFileHelpers';

describe('Import Endpoints (E2E)', () => {
  let app: INestApplication;
  let mockPreviewImportUseCase: jest.Mocked<PreviewImportUseCase>;
  let mockExecuteImportUseCase: jest.Mocked<ExecuteImportUseCase>;
  let mockCreateImportBatchUseCase: jest.Mocked<CreateImportBatchUseCase>;
  let mockValidateImportUseCase: jest.Mocked<ValidateImportUseCase>;
  let mockProcessImportUseCase: jest.Mocked<ProcessImportUseCase>;
  let mockGetImportStatusUseCase: jest.Mocked<GetImportStatusUseCase>;
  let mockDownloadImportTemplateUseCase: jest.Mocked<DownloadImportTemplateUseCase>;
  let mockDownloadErrorReportUseCase: jest.Mocked<DownloadErrorReportUseCase>;

  beforeAll(async () => {
    mockPreviewImportUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<PreviewImportUseCase>;

    mockExecuteImportUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ExecuteImportUseCase>;

    mockCreateImportBatchUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateImportBatchUseCase>;

    mockValidateImportUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateImportUseCase>;

    mockProcessImportUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ProcessImportUseCase>;

    mockGetImportStatusUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetImportStatusUseCase>;

    mockDownloadImportTemplateUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DownloadImportTemplateUseCase>;

    mockDownloadErrorReportUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DownloadErrorReportUseCase>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        {
          provide: PreviewImportUseCase,
          useValue: mockPreviewImportUseCase,
        },
        {
          provide: ExecuteImportUseCase,
          useValue: mockExecuteImportUseCase,
        },
        {
          provide: CreateImportBatchUseCase,
          useValue: mockCreateImportBatchUseCase,
        },
        {
          provide: ValidateImportUseCase,
          useValue: mockValidateImportUseCase,
        },
        {
          provide: ProcessImportUseCase,
          useValue: mockProcessImportUseCase,
        },
        {
          provide: GetImportStatusUseCase,
          useValue: mockGetImportStatusUseCase,
        },
        {
          provide: DownloadImportTemplateUseCase,
          useValue: mockDownloadImportTemplateUseCase,
        },
        {
          provide: DownloadErrorReportUseCase,
          useValue: mockDownloadErrorReportUseCase,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /imports/preview', () => {
    it('Given: valid file with correct structure When: previewing import Then: should return preview data', async () => {
      // Arrange
      const file = generateValidProductsFile();
      const mockResponse: IPreviewImportResponse = {
        success: true,
        message: 'Preview generated successfully',
        data: {
          totalRows: 2,
          validRows: 2,
          invalidRows: 0,
          errors: [],
          warnings: [],
          preview: {
            headers: ['SKU', 'Name', 'Description'],
            rows: [
              { SKU: 'PROD-001', Name: 'Test Product 1' },
              { SKU: 'PROD-002', Name: 'Test Product 2' },
            ],
          },
        },
        timestamp: new Date().toISOString(),
      };

      mockPreviewImportUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/imports/preview')
        .field('type', 'PRODUCTS')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRows).toBe(2);
      expect(response.body.data.validRows).toBe(2);
      expect(mockPreviewImportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PRODUCTS',
          orgId: 'org-placeholder',
        })
      );
    });

    it('Given: invalid file format When: previewing import Then: should return validation error', async () => {
      // Arrange
      const file = generateInvalidFile();
      mockPreviewImportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid file format'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/imports/preview')
        .field('type', 'PRODUCTS')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('Given: invalid file structure When: previewing import Then: should return validation error', async () => {
      // Arrange
      const file = generateCSVFile({
        headers: ['Wrong', 'Headers'],
        rows: [{ Wrong: 'value' }],
      });
      mockPreviewImportUseCase.execute.mockResolvedValue(
        err(new ValidationError('File structure validation failed: Missing required column: SKU'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/imports/preview')
        .field('type', 'PRODUCTS')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('Given: file with invalid row data When: previewing import Then: should return errors', async () => {
      // Arrange
      const file = generateProductsFileWithErrors();
      const mockResponse: IPreviewImportResponse = {
        success: true,
        message: 'Preview generated with errors',
        data: {
          totalRows: 2,
          validRows: 0,
          invalidRows: 2,
          errors: ['Row 1: Missing required field "SKU"', 'Row 2: Missing required field "Name"'],
          warnings: [],
          preview: {
            headers: ['SKU', 'Name'],
            rows: [],
          },
        },
        timestamp: new Date().toISOString(),
      };

      mockPreviewImportUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/imports/preview')
        .field('type', 'PRODUCTS')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invalidRows).toBe(2);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });

    it('Given: missing file When: previewing import Then: should return validation error', async () => {
      // Arrange
      mockPreviewImportUseCase.execute.mockResolvedValue(
        err(new ValidationError('File is required'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/imports/preview')
        .field('type', 'PRODUCTS')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('Given: missing type parameter When: previewing import Then: should return validation error', async () => {
      // Arrange
      const file = generateValidProductsFile();

      // Act & Assert
      await request(app.getHttpServer())
        .post('/imports/preview')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /imports/execute', () => {
    it('Given: successful import with valid file When: executing import Then: should return success', async () => {
      // Arrange
      const file = generateValidProductsFile();
      const mockResponse: IExecuteImportResponse = {
        success: true,
        message: 'Import executed successfully',
        data: {
          batchId: 'batch-123',
          status: 'COMPLETED',
          totalRows: 2,
          processedRows: 2,
          validRows: 2,
          invalidRows: 0,
        },
        timestamp: new Date().toISOString(),
      };

      mockExecuteImportUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/imports/execute')
        .field('type', 'PRODUCTS')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.processedRows).toBe(2);
    });

    it('Given: import with validation errors When: executing import Then: should return validation error', async () => {
      // Arrange
      const file = generateProductsFileWithErrors();
      mockExecuteImportUseCase.execute.mockResolvedValue(
        err(new ValidationError('File validation failed'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/imports/execute')
        .field('type', 'PRODUCTS')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('Given: invalid file format When: executing import Then: should return validation error', async () => {
      // Arrange
      const file = generateInvalidFile();
      mockExecuteImportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid file format'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/imports/execute')
        .field('type', 'PRODUCTS')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /imports', () => {
    it('Given: valid import batch data When: creating batch Then: should return success', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Import batch created successfully',
        data: {
          id: 'batch-123',
          type: 'PRODUCTS',
          status: 'PENDING',
          fileName: 'products.xlsx',
        },
        timestamp: new Date().toISOString(),
      };

      mockCreateImportBatchUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/imports')
        .send({
          type: 'PRODUCTS',
          fileName: 'products.xlsx',
          note: 'Test import',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('batch-123');
    });

    it('Given: invalid import type When: creating batch Then: should return validation error', async () => {
      // Arrange
      mockCreateImportBatchUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid import type'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/imports')
        .send({
          type: 'INVALID_TYPE',
          fileName: 'products.xlsx',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /imports/:id/validate', () => {
    it('Given: valid file When: validating batch Then: should return success', async () => {
      // Arrange
      const file = generateValidProductsFile();
      const mockResponse = {
        success: true,
        message: 'Import batch validated successfully',
        data: {
          batchId: 'batch-123',
          status: 'VALIDATED',
          totalRows: 2,
          validRows: 2,
          invalidRows: 0,
        },
        timestamp: new Date().toISOString(),
      };

      mockValidateImportUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/imports/batch-123/validate')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('VALIDATED');
    });

    it('Given: batch not found When: validating batch Then: should return not found error', async () => {
      // Arrange
      const file = generateValidProductsFile();
      mockValidateImportUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Import batch not found'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/imports/non-existent/validate')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('Given: invalid file format When: validating batch Then: should return validation error', async () => {
      // Arrange
      const file = generateInvalidFile();
      mockValidateImportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid file format'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/imports/batch-123/validate')
        .attach('file', file.buffer, file.originalname)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /imports/:id/process', () => {
    it('Given: validated batch When: processing batch Then: should return success', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Import batch processed successfully',
        data: {
          batchId: 'batch-123',
          status: 'COMPLETED',
          processedRows: 2,
          failedRows: 0,
        },
        timestamp: new Date().toISOString(),
      };

      mockProcessImportUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/imports/batch-123/process')
        .send({ skipInvalidRows: true })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('COMPLETED');
    });

    it('Given: batch not found When: processing batch Then: should return not found error', async () => {
      // Arrange
      mockProcessImportUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Import batch not found'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/imports/non-existent/process')
        .send({ skipInvalidRows: true })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /imports/:id/status', () => {
    it('Given: existing batch When: getting status Then: should return status', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Import status retrieved successfully',
        data: {
          id: 'batch-123',
          type: 'PRODUCTS',
          status: 'VALIDATED',
          totalRows: 2,
          processedRows: 0,
          validRows: 2,
          invalidRows: 0,
        },
        timestamp: new Date().toISOString(),
      };

      mockGetImportStatusUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/imports/batch-123/status')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('VALIDATED');
    });

    it('Given: batch not found When: getting status Then: should return not found error', async () => {
      // Arrange
      mockGetImportStatusUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Import batch not found'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .get('/imports/non-existent/status')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /imports/templates/:type', () => {
    it('Given: valid import type When: downloading template Then: should return CSV file', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Template generated successfully',
        data: {
          content: Buffer.from('SKU,Name\nPROD-001,Test Product'),
          filename: 'import-template-PRODUCTS-2024-01-01.csv',
          mimeType: 'text/csv',
          columns: 'Column descriptions',
        },
        timestamp: new Date().toISOString(),
      };

      mockDownloadImportTemplateUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/imports/templates/PRODUCTS')
        .query({ format: 'csv' })
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('Given: invalid import type When: downloading template Then: should return validation error', async () => {
      // Arrange
      mockDownloadImportTemplateUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid import type'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .get('/imports/templates/INVALID_TYPE')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /imports/:id/errors', () => {
    it('Given: validated batch with errors When: downloading error report Then: should return CSV file', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Error report generated successfully',
        data: {
          content: Buffer.from('Row Number,Severity,Error Message\n1,error,Missing required field'),
          filename: 'import-errors-PRODUCTS-batch-123-2024-01-01.csv',
          mimeType: 'text/csv',
        },
        timestamp: new Date().toISOString(),
      };

      mockDownloadErrorReportUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/imports/batch-123/errors')
        .query({ format: 'csv' })
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('Given: batch not found When: downloading error report Then: should return not found error', async () => {
      // Arrange
      mockDownloadErrorReportUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Import batch not found'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .get('/imports/non-existent/errors')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('Given: batch not validated When: downloading error report Then: should return validation error', async () => {
      // Arrange
      mockDownloadErrorReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Import batch has not been validated yet'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .get('/imports/batch-123/errors')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
