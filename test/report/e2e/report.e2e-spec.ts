// Report Endpoints E2E Tests
// E2E tests for report view and export endpoints

import {
  ViewReportUseCase,
  ExportReportUseCase,
  GetReportsUseCase,
} from '@application/reportUseCases';
import { ReportController } from '@interface/http/report';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { REPORT_TYPES } from '@report/domain/valueObjects';
import { ok, err } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';
import * as request from 'supertest';

describe('Report Endpoints (E2E)', () => {
  let app: INestApplication;
  let mockViewReportUseCase: jest.Mocked<ViewReportUseCase>;
  let mockExportReportUseCase: jest.Mocked<ExportReportUseCase>;
  let mockGetReportsUseCase: jest.Mocked<GetReportsUseCase>;

  beforeAll(async () => {
    mockViewReportUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ViewReportUseCase>;

    mockExportReportUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ExportReportUseCase>;

    mockGetReportsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetReportsUseCase>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        {
          provide: ViewReportUseCase,
          useValue: mockViewReportUseCase,
        },
        {
          provide: ExportReportUseCase,
          useValue: mockExportReportUseCase,
        },
        {
          provide: GetReportsUseCase,
          useValue: mockGetReportsUseCase,
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

  describe('GET /reports/inventory/available/view', () => {
    it('Given: valid request When: viewing available inventory Then: should return report data', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Report generated successfully',
        data: {
          columns: [{ key: 'sku', header: 'SKU', type: 'string' }],
          rows: [{ sku: 'PROD-001' }],
          metadata: {
            reportType: REPORT_TYPES.AVAILABLE_INVENTORY,
            reportTitle: 'Available Inventory Report',
            generatedAt: new Date(),
            parameters: {},
            totalRecords: 1,
            orgId: 'org-123',
          },
        },
        timestamp: new Date().toISOString(),
      };

      mockViewReportUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/reports/inventory/available/view')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rows).toHaveLength(1);
    });

    it('Given: missing org header When: viewing report Then: should use empty orgId', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Organization ID is required'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .get('/reports/inventory/available/view')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /reports/sales/view', () => {
    it('Given: valid request with parameters When: viewing sales report Then: should return data', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Report generated successfully',
        data: {
          columns: [{ key: 'saleNumber', header: 'Sale #', type: 'string' }],
          rows: [{ saleNumber: 'SALE-001' }],
          metadata: {
            reportType: REPORT_TYPES.SALES,
            reportTitle: 'Sales Report',
            generatedAt: new Date(),
            parameters: { warehouseId: 'warehouse-123' },
            totalRecords: 1,
            orgId: 'org-123',
          },
        },
        timestamp: new Date().toISOString(),
      };

      mockViewReportUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/reports/sales/view')
        .query({ warehouseId: 'warehouse-123' })
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata.reportType).toBe(REPORT_TYPES.SALES);
    });
  });

  describe('POST /reports/sales/export', () => {
    it('Given: valid export request When: exporting to CSV Then: should return file', async () => {
      // Arrange
      const mockBuffer = Buffer.from('sku,name\nPROD-001,Product 1');
      const mockResponse = {
        success: true,
        message: 'Report exported successfully',
        data: {
          buffer: mockBuffer,
          filename: 'sales-report-2024-01-01.csv',
          mimeType: 'text/csv; charset=utf-8',
          size: mockBuffer.length,
        },
        timestamp: new Date().toISOString(),
      };

      mockExportReportUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/reports/sales/export')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .send({ format: 'CSV' })
        .expect(HttpStatus.OK);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('Given: invalid format When: exporting Then: should return error', async () => {
      // Arrange
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid export format'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/reports/sales/export')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .send({ format: 'INVALID' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /reports/history', () => {
    it('Given: valid request When: getting report history Then: should return list', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Reports retrieved successfully',
        data: [
          {
            id: 'report-1',
            type: REPORT_TYPES.SALES,
            status: 'COMPLETED',
            generatedAt: new Date(),
          },
        ],
        timestamp: new Date().toISOString(),
      };

      mockGetReportsUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/reports/history')
        .set('X-Organization-ID', 'org-123')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('Given: filter by type When: getting history Then: should filter results', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Reports retrieved successfully',
        data: [],
        timestamp: new Date().toISOString(),
      };

      mockGetReportsUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      await request(app.getHttpServer())
        .get('/reports/history')
        .query({ type: REPORT_TYPES.FINANCIAL })
        .set('X-Organization-ID', 'org-123')
        .expect(HttpStatus.OK);

      expect(mockGetReportsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: REPORT_TYPES.FINANCIAL,
        })
      );
    });
  });

  describe('GET /reports/returns/view', () => {
    it('Given: valid request When: viewing returns report Then: should return data', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Report generated successfully',
        data: {
          columns: [{ key: 'returnNumber', header: 'Return #', type: 'string' }],
          rows: [{ returnNumber: 'RET-001' }],
          metadata: {
            reportType: REPORT_TYPES.RETURNS,
            reportTitle: 'Returns Report',
            generatedAt: new Date(),
            parameters: {},
            totalRecords: 1,
            orgId: 'org-123',
          },
        },
        timestamp: new Date().toISOString(),
      };

      mockViewReportUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/reports/returns/view')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .expect(HttpStatus.OK);

      expect(response.body.data.metadata.reportType).toBe(REPORT_TYPES.RETURNS);
    });
  });
});
