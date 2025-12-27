// Report Template Endpoints E2E Tests
// E2E tests for report template management endpoints

import {
  CreateReportTemplateUseCase,
  UpdateReportTemplateUseCase,
  GetReportTemplatesUseCase,
} from '@application/reportUseCases';
import { ReportTemplateController } from '@interface/http/report';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { REPORT_TYPES } from '@report/domain/valueObjects';
import { ok, err } from '@shared/domain/result';
import { ConflictError, NotFoundError } from '@shared/domain/result/domainError';
import * as request from 'supertest';

describe('Report Template Endpoints (E2E)', () => {
  let app: INestApplication;
  let mockCreateUseCase: jest.Mocked<CreateReportTemplateUseCase>;
  let mockUpdateUseCase: jest.Mocked<UpdateReportTemplateUseCase>;
  let mockGetUseCase: jest.Mocked<GetReportTemplatesUseCase>;

  beforeAll(async () => {
    mockCreateUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateReportTemplateUseCase>;

    mockUpdateUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateReportTemplateUseCase>;

    mockGetUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetReportTemplatesUseCase>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReportTemplateController],
      providers: [
        {
          provide: CreateReportTemplateUseCase,
          useValue: mockCreateUseCase,
        },
        {
          provide: UpdateReportTemplateUseCase,
          useValue: mockUpdateUseCase,
        },
        {
          provide: GetReportTemplatesUseCase,
          useValue: mockGetUseCase,
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

  describe('POST /report-templates', () => {
    it('Given: valid template data When: creating Then: should return created template', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Report template created successfully',
        data: {
          id: 'template-123',
          name: 'Monthly Sales Report',
          type: REPORT_TYPES.SALES,
          isActive: true,
          createdBy: 'user-123',
          orgId: 'org-123',
          defaultParameters: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        timestamp: new Date().toISOString(),
      };

      mockCreateUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/report-templates')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .send({
          name: 'Monthly Sales Report',
          type: REPORT_TYPES.SALES,
          description: 'Monthly sales analysis',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Monthly Sales Report');
    });

    it('Given: duplicate name When: creating Then: should return conflict error', async () => {
      // Arrange
      mockCreateUseCase.execute.mockResolvedValue(
        err(new ConflictError('Template with this name already exists'))
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/report-templates')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .send({
          name: 'Existing Template',
          type: REPORT_TYPES.SALES,
        })
        .expect(HttpStatus.CONFLICT);
    });

    it('Given: name too short When: creating Then: should return validation error', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/report-templates')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .send({
          name: 'AB',
          type: REPORT_TYPES.SALES,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('Given: invalid report type When: creating Then: should return validation error', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/report-templates')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .send({
          name: 'Valid Name',
          type: 'INVALID_TYPE',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /report-templates', () => {
    it('Given: templates exist When: listing Then: should return templates', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Report templates retrieved successfully',
        data: [
          {
            id: 'template-1',
            name: 'Sales Template',
            type: REPORT_TYPES.SALES,
            isActive: true,
          },
          {
            id: 'template-2',
            name: 'Returns Template',
            type: REPORT_TYPES.RETURNS,
            isActive: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      mockGetUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/report-templates')
        .set('X-Organization-ID', 'org-123')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('Given: filter by type When: listing Then: should filter results', async () => {
      // Arrange
      mockGetUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Report templates retrieved successfully',
          data: [],
          timestamp: new Date().toISOString(),
        })
      );

      // Act & Assert
      await request(app.getHttpServer())
        .get('/report-templates')
        .query({ type: REPORT_TYPES.FINANCIAL })
        .set('X-Organization-ID', 'org-123')
        .expect(HttpStatus.OK);

      expect(mockGetUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: REPORT_TYPES.FINANCIAL,
        })
      );
    });
  });

  describe('GET /report-templates/active', () => {
    it('Given: active templates exist When: listing active Then: should return only active', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Report templates retrieved successfully',
        data: [
          {
            id: 'template-1',
            name: 'Active Template',
            isActive: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      mockGetUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/report-templates/active')
        .set('X-Organization-ID', 'org-123')
        .expect(HttpStatus.OK);

      expect(response.body.data[0].isActive).toBe(true);
    });
  });

  describe('PUT /report-templates/:id', () => {
    it('Given: valid update data When: updating Then: should return updated template', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Report template updated successfully',
        data: {
          id: 'template-123',
          name: 'Updated Name',
          type: REPORT_TYPES.SALES,
          isActive: true,
          defaultParameters: {},
        },
        timestamp: new Date().toISOString(),
      };

      mockUpdateUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .put('/report-templates/template-123')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .send({
          name: 'Updated Name',
        })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('Given: template not found When: updating Then: should return not found error', async () => {
      // Arrange
      mockUpdateUseCase.execute.mockResolvedValue(err(new NotFoundError('Template not found')));

      // Act & Assert
      await request(app.getHttpServer())
        .put('/report-templates/non-existent')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .send({
          name: 'New Name',
        })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('Given: deactivation request When: updating Then: should deactivate template', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Report template updated successfully',
        data: {
          id: 'template-123',
          isActive: false,
        },
        timestamp: new Date().toISOString(),
      };

      mockUpdateUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .put('/report-templates/template-123')
        .set('X-Organization-ID', 'org-123')
        .set('X-User-ID', 'user-123')
        .send({
          isActive: false,
        })
        .expect(HttpStatus.OK);

      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('GET /report-templates/by-type/:type', () => {
    it('Given: templates of type exist When: getting by type Then: should return matching', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'Report templates retrieved successfully',
        data: [
          {
            id: 'template-1',
            name: 'Financial Template',
            type: REPORT_TYPES.FINANCIAL,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      mockGetUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get(`/report-templates/by-type/${REPORT_TYPES.FINANCIAL}`)
        .set('X-Organization-ID', 'org-123')
        .expect(HttpStatus.OK);

      expect(response.body.data[0].type).toBe(REPORT_TYPES.FINANCIAL);
    });
  });
});
