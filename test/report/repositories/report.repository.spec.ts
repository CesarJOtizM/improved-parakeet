// PrismaReportRepository Integration Tests
// Tests for Report repository implementation

import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaReportRepository } from '@infrastructure/database/repositories/report.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { Report } from '@report/domain/entities/report.entity';
import {
  ReportParameters,
  ReportStatus,
  ReportType,
  REPORT_STATUSES,
  REPORT_TYPES,
} from '@report/domain/valueObjects';

describe('PrismaReportRepository', () => {
  let repository: PrismaReportRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    mockPrismaService = {
      report: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaReportRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaReportRepository>(PrismaReportRepository);
  });

  describe('findById', () => {
    it('Given: existing report When: finding by id Then: should return report', async () => {
      // Arrange
      const mockData = {
        id: 'report-123',
        orgId: 'org-123',
        type: REPORT_TYPES.SALES,
        status: REPORT_STATUSES.COMPLETED,
        parameters: { warehouseId: 'warehouse-123' },
        templateId: null,
        generatedBy: 'user-123',
        generatedAt: new Date(),
        format: null,
        exportedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.report.findFirst as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await repository.findById('report-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(Report);
      expect(result?.id).toBe('report-123');
      expect(result?.type.getValue()).toBe(REPORT_TYPES.SALES);
    });

    it('Given: non-existing report When: finding by id Then: should return null', async () => {
      // Arrange
      (mockPrismaService.report.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('Given: new report When: saving Then: should create report', async () => {
      // Arrange
      const report = Report.create(
        {
          type: ReportType.create(REPORT_TYPES.FINANCIAL),
          status: ReportStatus.pending(),
          parameters: ReportParameters.create({}),
          generatedBy: 'user-123',
        },
        'org-123'
      );

      (mockPrismaService.report.findFirst as jest.Mock).mockResolvedValue(null);

      const mockCreated = {
        id: report.id,
        orgId: 'org-123',
        type: REPORT_TYPES.FINANCIAL,
        status: REPORT_STATUSES.PENDING,
        parameters: {},
        templateId: null,
        generatedBy: 'user-123',
        generatedAt: null,
        format: null,
        exportedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.report.create as jest.Mock).mockResolvedValue(mockCreated);

      // Act
      const result = await repository.save(report);

      // Assert
      expect(result).toBeInstanceOf(Report);
      expect(result.type.getValue()).toBe(REPORT_TYPES.FINANCIAL);
      expect(mockPrismaService.report.create).toHaveBeenCalled();
    });

    it('Given: existing report When: saving Then: should update report', async () => {
      // Arrange
      const report = Report.reconstitute(
        {
          type: ReportType.create(REPORT_TYPES.SALES),
          status: ReportStatus.completed(),
          parameters: ReportParameters.create({}),
          generatedBy: 'user-123',
          generatedAt: new Date(),
        },
        'report-123',
        'org-123'
      );

      (mockPrismaService.report.findFirst as jest.Mock).mockResolvedValue({
        id: 'report-123',
      });

      const mockUpdated = {
        id: 'report-123',
        orgId: 'org-123',
        type: REPORT_TYPES.SALES,
        status: REPORT_STATUSES.COMPLETED,
        parameters: {},
        templateId: null,
        generatedBy: 'user-123',
        generatedAt: new Date(),
        format: null,
        exportedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.report.update as jest.Mock).mockResolvedValue(mockUpdated);

      // Act
      const result = await repository.save(report);

      // Assert
      expect(result).toBeInstanceOf(Report);
      expect(mockPrismaService.report.update).toHaveBeenCalled();
    });
  });

  describe('findByType', () => {
    it('Given: reports of type exist When: finding by type Then: should return reports', async () => {
      // Arrange
      const mockData = [
        {
          id: 'report-1',
          orgId: 'org-123',
          type: REPORT_TYPES.SALES,
          status: REPORT_STATUSES.COMPLETED,
          parameters: {},
          templateId: null,
          generatedBy: 'user-123',
          generatedAt: new Date(),
          format: null,
          exportedAt: null,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.report.findMany as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await repository.findByType(REPORT_TYPES.SALES, 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Report);
      expect(result[0].type.getValue()).toBe(REPORT_TYPES.SALES);
    });
  });

  describe('findByDateRange', () => {
    it('Given: reports in date range When: finding Then: should return matching reports', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockData = [
        {
          id: 'report-1',
          orgId: 'org-123',
          type: REPORT_TYPES.FINANCIAL,
          status: REPORT_STATUSES.COMPLETED,
          parameters: {},
          templateId: null,
          generatedBy: 'user-123',
          generatedAt: new Date('2024-06-15'),
          format: null,
          exportedAt: null,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.report.findMany as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await repository.findByDateRange(startDate, endDate, 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            generatedAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });
  });

  describe('findByGeneratedBy', () => {
    it('Given: reports by user When: finding Then: should return user reports', async () => {
      // Arrange
      const mockData = [
        {
          id: 'report-1',
          orgId: 'org-123',
          type: REPORT_TYPES.RETURNS,
          status: REPORT_STATUSES.COMPLETED,
          parameters: {},
          templateId: null,
          generatedBy: 'user-456',
          generatedAt: new Date(),
          format: null,
          exportedAt: null,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.report.findMany as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await repository.findByGeneratedBy('user-456', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].generatedBy).toBe('user-456');
    });
  });
});
