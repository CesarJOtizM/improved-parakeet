/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReportTemplateController } from '@interface/http/report/reportTemplate.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError, NotFoundError, ConflictError } from '@shared/domain/result/domainError';

describe('ReportTemplateController', () => {
  let controller: ReportTemplateController;
  let mockCreateReportTemplateUseCase: any;
  let mockUpdateReportTemplateUseCase: any;
  let mockGetReportTemplatesUseCase: any;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-123';

  const mockTemplateData = {
    id: 'template-123',
    name: 'Monthly Sales Report',
    description: 'Monthly summary of sales data',
    type: 'SALES',
    defaultParameters: {},
    isActive: true,
    createdBy: mockUserId,
    orgId: mockOrgId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockCreateReportTemplateUseCase = { execute: jest.fn() };
    mockUpdateReportTemplateUseCase = { execute: jest.fn() };
    mockGetReportTemplatesUseCase = { execute: jest.fn() };

    controller = new ReportTemplateController(
      mockCreateReportTemplateUseCase,
      mockUpdateReportTemplateUseCase,
      mockGetReportTemplatesUseCase
    );
  });

  describe('getTemplates', () => {
    it('Given: valid orgId When: getting templates Then: should return templates list', async () => {
      // Arrange
      const templatesResponse = {
        success: true,
        data: [mockTemplateData],
        message: 'Templates retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportTemplatesUseCase.execute.mockResolvedValue(ok(templatesResponse));

      // Act
      const result = await controller.getTemplates(undefined, undefined, undefined, mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockGetReportTemplatesUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        type: undefined,
        activeOnly: false,
        createdBy: undefined,
      });
    });

    it('Given: type filter When: getting templates Then: should pass type to use case', async () => {
      // Arrange
      const templatesResponse = {
        success: true,
        data: [mockTemplateData],
        message: 'Templates retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportTemplatesUseCase.execute.mockResolvedValue(ok(templatesResponse));

      // Act
      await controller.getTemplates('SALES', 'true', undefined, mockOrgId);

      // Assert
      expect(mockGetReportTemplatesUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        type: 'SALES',
        activeOnly: true,
        createdBy: undefined,
      });
    });

    it('Given: use case error When: getting templates Then: should throw', async () => {
      // Arrange
      mockGetReportTemplatesUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve templates'))
      );

      // Act & Assert
      await expect(
        controller.getTemplates(undefined, undefined, undefined, mockOrgId)
      ).rejects.toThrow();
    });
  });

  describe('createTemplate', () => {
    it('Given: valid template data When: creating Then: should return created template', async () => {
      // Arrange
      const dto = {
        name: 'Monthly Sales Report',
        description: 'Monthly summary',
        type: 'SALES',
        defaultParameters: { groupBy: 'MONTH' },
      };
      const createResponse = {
        success: true,
        data: mockTemplateData,
        message: 'Template created',
        timestamp: new Date().toISOString(),
      };
      mockCreateReportTemplateUseCase.execute.mockResolvedValue(ok(createResponse));

      // Act
      const result = await controller.createTemplate(dto as any, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Monthly Sales Report');
      expect(mockCreateReportTemplateUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Monthly Sales Report',
          type: 'SALES',
          createdBy: mockUserId,
          orgId: mockOrgId,
        })
      );
    });

    it('Given: duplicate name When: creating Then: should throw conflict', async () => {
      // Arrange
      const dto = { name: 'Existing Template', type: 'SALES' };
      mockCreateReportTemplateUseCase.execute.mockResolvedValue(
        err(new ConflictError('Template with same name already exists'))
      );

      // Act & Assert
      await expect(controller.createTemplate(dto as any, mockOrgId, mockUserId)).rejects.toThrow();
    });

    it('Given: invalid data When: creating Then: should throw validation error', async () => {
      // Arrange
      const dto = { name: '', type: '' };
      mockCreateReportTemplateUseCase.execute.mockResolvedValue(
        err(new ValidationError('Template name is required'))
      );

      // Act & Assert
      await expect(controller.createTemplate(dto as any, mockOrgId, mockUserId)).rejects.toThrow();
    });
  });

  describe('updateTemplate', () => {
    it('Given: valid update data When: updating Then: should return updated template', async () => {
      // Arrange
      const dto = { name: 'Updated Template', description: 'Updated description' };
      const updatedTemplate = { ...mockTemplateData, name: 'Updated Template' };
      const updateResponse = {
        success: true,
        data: updatedTemplate,
        message: 'Template updated',
        timestamp: new Date().toISOString(),
      };
      mockUpdateReportTemplateUseCase.execute.mockResolvedValue(ok(updateResponse));

      // Act
      const result = await controller.updateTemplate(
        'template-123',
        dto as any,
        mockOrgId,
        mockUserId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockUpdateReportTemplateUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'template-123',
          name: 'Updated Template',
          updatedBy: mockUserId,
          orgId: mockOrgId,
        })
      );
    });

    it('Given: non-existent template When: updating Then: should throw not found', async () => {
      // Arrange
      const dto = { name: 'Updated Template' };
      mockUpdateReportTemplateUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Template not found'))
      );

      // Act & Assert
      await expect(
        controller.updateTemplate('non-existent', dto as any, mockOrgId, mockUserId)
      ).rejects.toThrow();
    });

    it('Given: duplicate name When: updating Then: should throw conflict', async () => {
      // Arrange
      const dto = { name: 'Existing Template' };
      mockUpdateReportTemplateUseCase.execute.mockResolvedValue(
        err(new ConflictError('Template with same name already exists'))
      );

      // Act & Assert
      await expect(
        controller.updateTemplate('template-123', dto as any, mockOrgId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('getActiveTemplates', () => {
    it('Given: valid orgId When: getting active templates Then: should return only active', async () => {
      // Arrange
      const templatesResponse = {
        success: true,
        data: [mockTemplateData],
        message: 'Active templates retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportTemplatesUseCase.execute.mockResolvedValue(ok(templatesResponse));

      // Act
      const result = await controller.getActiveTemplates(mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockGetReportTemplatesUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        activeOnly: true,
      });
    });
  });

  describe('getTemplatesByType', () => {
    it('Given: valid type When: getting templates by type Then: should filter by type', async () => {
      // Arrange
      const templatesResponse = {
        success: true,
        data: [mockTemplateData],
        message: 'Templates retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportTemplatesUseCase.execute.mockResolvedValue(ok(templatesResponse));

      // Act
      const result = await controller.getTemplatesByType('SALES', mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockGetReportTemplatesUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        type: 'SALES',
      });
    });
  });
});
