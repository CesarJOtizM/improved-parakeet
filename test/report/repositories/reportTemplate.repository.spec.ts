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

  describe('findAll', () => {
    it('Given: templates exist When: finding all Then: should return all templates for org', async () => {
      // Arrange
      const mockData = [
        {
          id: 'template-1',
          orgId: 'org-123',
          name: 'Template A',
          description: 'First template',
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
          name: 'Template B',
          description: null,
          type: REPORT_TYPES.FINANCIAL,
          defaultParameters: { warehouseId: 'wh-1' },
          isActive: false,
          createdBy: 'user-456',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.reportTemplate.findMany as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(ReportTemplate);
      expect(result[1]).toBeInstanceOf(ReportTemplate);
      expect(result[0].name).toBe('Template A');
      expect(result[1].name).toBe('Template B');
      expect(mockPrismaService.reportTemplate.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123', deletedAt: null },
        orderBy: { name: 'asc' },
      });
    });

    it('Given: no templates exist When: finding all Then: should return empty array', async () => {
      // Arrange
      (mockPrismaService.reportTemplate.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('exists', () => {
    it('Given: template exists When: checking existence Then: should return true', async () => {
      // Arrange
      (mockPrismaService.reportTemplate.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await repository.exists('template-123', 'org-123');

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.reportTemplate.count).toHaveBeenCalledWith({
        where: { id: 'template-123', orgId: 'org-123', deletedAt: null },
      });
    });

    it('Given: template does not exist When: checking existence Then: should return false', async () => {
      // Arrange
      (mockPrismaService.reportTemplate.count as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('Given: existing template When: deleting Then: should soft delete by setting deletedAt', async () => {
      // Arrange
      (mockPrismaService.reportTemplate.update as jest.Mock).mockResolvedValue({});

      // Act
      await repository.delete('template-123', 'org-123');

      // Assert
      expect(mockPrismaService.reportTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('findByType', () => {
    it('Given: templates of type exist When: finding by type Then: should return matching templates', async () => {
      // Arrange
      const mockData = [
        {
          id: 'template-1',
          orgId: 'org-123',
          name: 'Sales Template 1',
          description: null,
          type: REPORT_TYPES.SALES,
          defaultParameters: {},
          isActive: true,
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.reportTemplate.findMany as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await repository.findByType(REPORT_TYPES.SALES, 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ReportTemplate);
      expect(mockPrismaService.reportTemplate.findMany).toHaveBeenCalledWith({
        where: { type: REPORT_TYPES.SALES, orgId: 'org-123', deletedAt: null },
        orderBy: { name: 'asc' },
      });
    });

    it('Given: no templates of type When: finding by type Then: should return empty array', async () => {
      // Arrange
      (mockPrismaService.reportTemplate.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await repository.findByType(REPORT_TYPES.FINANCIAL, 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findByName', () => {
    it('Given: template with name exists When: finding by name Then: should return template', async () => {
      // Arrange
      const mockData = {
        id: 'template-123',
        orgId: 'org-123',
        name: 'My Sales Report',
        description: 'Monthly sales analysis',
        type: REPORT_TYPES.SALES,
        defaultParameters: {},
        isActive: true,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.reportTemplate.findFirst as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await repository.findByName('My Sales Report', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(ReportTemplate);
      expect(result?.name).toBe('My Sales Report');
      expect(mockPrismaService.reportTemplate.findFirst).toHaveBeenCalledWith({
        where: { name: 'My Sales Report', orgId: 'org-123', deletedAt: null },
      });
    });

    it('Given: no template with name When: finding by name Then: should return null', async () => {
      // Arrange
      (mockPrismaService.reportTemplate.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await repository.findByName('Non-existent Report', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByCreatedBy', () => {
    it('Given: templates created by user exist When: finding by creator Then: should return templates', async () => {
      // Arrange
      const mockData = [
        {
          id: 'template-1',
          orgId: 'org-123',
          name: 'User Template 1',
          description: 'Created by user-456',
          type: REPORT_TYPES.RETURNS,
          defaultParameters: {},
          isActive: true,
          createdBy: 'user-456',
          createdAt: new Date('2026-01-15'),
          updatedAt: new Date('2026-01-15'),
        },
        {
          id: 'template-2',
          orgId: 'org-123',
          name: 'User Template 2',
          description: null,
          type: REPORT_TYPES.FINANCIAL,
          defaultParameters: {},
          isActive: true,
          createdBy: 'user-456',
          createdAt: new Date('2026-01-10'),
          updatedAt: new Date('2026-01-10'),
        },
      ];

      (mockPrismaService.reportTemplate.findMany as jest.Mock).mockResolvedValue(mockData);

      // Act
      const result = await repository.findByCreatedBy('user-456', 'org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(ReportTemplate);
      expect(result[1]).toBeInstanceOf(ReportTemplate);
      expect(mockPrismaService.reportTemplate.findMany).toHaveBeenCalledWith({
        where: { createdBy: 'user-456', orgId: 'org-123', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: no templates by user When: finding by creator Then: should return empty array', async () => {
      // Arrange
      (mockPrismaService.reportTemplate.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await repository.findByCreatedBy('unknown-user', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
