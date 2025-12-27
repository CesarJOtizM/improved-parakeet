// PrismaReportTemplateRepository Integration Tests
// Tests for ReportTemplate repository implementation

import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaReportTemplateRepository } from '@infrastructure/database/repositories/reportTemplate.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportTemplate } from '@report/domain/entities/reportTemplate.entity';
import { ReportParameters, ReportType, REPORT_TYPES } from '@report/domain/valueObjects';

describe('PrismaReportTemplateRepository', () => {
  let repository: PrismaReportTemplateRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    mockPrismaService = {
      reportTemplate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaReportTemplateRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<PrismaReportTemplateRepository>(PrismaReportTemplateRepository);
  });

  describe('findById', () => {
    it('Given: existing template When: finding by id Then: should return template', async () => {
      // Arrange
      const mockData = {
        id: 'template-123',
        orgId: 'org-123',
        name: 'Sales Template',
        description: 'Monthly sales',
        type: REPORT_TYPES.SALES,
        defaultParameters: { warehouseId: 'warehouse-123' },
        isActive: true,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.reportTemplate.findFirst as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await repository.findById('template-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(ReportTemplate);
      expect(result?.id).toBe('template-123');
      expect(result?.name).toBe('Sales Template');
    });

    it('Given: non-existing template When: finding by id Then: should return null', async () => {
      // Arrange
      (mockPrismaService.reportTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('Given: new template When: saving Then: should create template', async () => {
      // Arrange
      const template = ReportTemplate.create(
        {
          name: 'New Template',
          description: 'Test template',
          type: ReportType.create(REPORT_TYPES.FINANCIAL),
          defaultParameters: ReportParameters.create({}),
          isActive: true,
          createdBy: 'user-123',
        },
        'org-123'
      );

      (mockPrismaService.reportTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      const mockCreated = {
        id: template.id,
        orgId: 'org-123',
        name: 'New Template',
        description: 'Test template',
        type: REPORT_TYPES.FINANCIAL,
        defaultParameters: {},
        isActive: true,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.reportTemplate.create as jest.Mock).mockResolvedValue(mockCreated);

      // Act
      const result = await repository.save(template);

      // Assert
      expect(result).toBeInstanceOf(ReportTemplate);
      expect(result.name).toBe('New Template');
      expect(mockPrismaService.reportTemplate.create).toHaveBeenCalled();
    });

    it('Given: existing template When: saving Then: should update template', async () => {
      // Arrange
      const template = ReportTemplate.reconstitute(
        {
          name: 'Updated Template',
          type: ReportType.create(REPORT_TYPES.SALES),
          defaultParameters: ReportParameters.create({}),
          isActive: true,
          createdBy: 'user-123',
        },
        'template-123',
        'org-123'
      );

      (mockPrismaService.reportTemplate.findFirst as jest.Mock).mockResolvedValue({
        id: 'template-123',
      });

      const mockUpdated = {
        id: 'template-123',
        orgId: 'org-123',
        name: 'Updated Template',
        type: REPORT_TYPES.SALES,
        defaultParameters: {},
        isActive: true,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.reportTemplate.update as jest.Mock).mockResolvedValue(mockUpdated);

      // Act
      const result = await repository.save(template);

      // Assert
      expect(result).toBeInstanceOf(ReportTemplate);
      expect(mockPrismaService.reportTemplate.update).toHaveBeenCalled();
    });
  });

  describe('findActive', () => {
    it('Given: active templates exist When: finding active Then: should return active templates', async () => {
      // Arrange
      const mockData = [
        {
          id: 'template-1',
          orgId: 'org-123',
          name: 'Active Template 1',
          type: REPORT_TYPES.SALES,
          defaultParameters: {},
          isActive: true,
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'template-2',
          orgId: 'org-123',
          name: 'Active Template 2',
          type: REPORT_TYPES.RETURNS,
          defaultParameters: {},
          isActive: true,
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.reportTemplate.findMany as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await repository.findActive('org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(ReportTemplate);
      expect(result[1]).toBeInstanceOf(ReportTemplate);
    });
  });

  describe('existsByName', () => {
    it('Given: template with name exists When: checking Then: should return true', async () => {
      // Arrange
      (mockPrismaService.reportTemplate.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await repository.existsByName('Existing Template', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: no template with name When: checking Then: should return false', async () => {
      // Arrange
      (mockPrismaService.reportTemplate.count as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await repository.existsByName('Non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });
  });
});
