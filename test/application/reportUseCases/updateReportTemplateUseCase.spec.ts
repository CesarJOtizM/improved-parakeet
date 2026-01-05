import {
  UpdateReportTemplateUseCase,
  IUpdateReportTemplateRequest,
} from '@application/reportUseCases/updateReportTemplateUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReportTemplate } from '@report/domain/entities/reportTemplate.entity';
import { ReportParameters } from '@report/domain/valueObjects/reportParameters.valueObject';
import { ReportType } from '@report/domain/valueObjects/reportType.valueObject';
import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/result/domainError';

describe('UpdateReportTemplateUseCase', () => {
  let useCase: UpdateReportTemplateUseCase;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockReportTemplateRepository: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockEventDispatcher: any;

  const createMockTemplate = (id: string, name: string, isActive: boolean = true) => {
    const template = {
      id,
      name,
      description: 'Test description',
      type: ReportType.create('VALUATION'),
      defaultParameters: ReportParameters.create({
        dateRange: { startDate: new Date(), endDate: new Date() },
      }),
      isActive,
      orgId: 'org-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      domainEvents: [],
      updateName: jest.fn(),
      updateDescription: jest.fn(),
      updateParameters: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      markEventsForDispatch: jest.fn(),
      clearEvents: jest.fn(),
    };
    return template as unknown as ReportTemplate;
  };

  beforeEach(() => {
    mockReportTemplateRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      save: jest.fn(),
    };

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
    };

    useCase = new UpdateReportTemplateUseCase(mockReportTemplateRepository, mockEventDispatcher);
  });

  describe('execute', () => {
    it('Given: valid update data When: updating template Then: should return updated template', async () => {
      // Arrange
      const template = createMockTemplate('template-123', 'Original Name');
      mockReportTemplateRepository.findById.mockResolvedValue(template);
      mockReportTemplateRepository.save.mockResolvedValue(template);

      const request: IUpdateReportTemplateRequest = {
        templateId: 'template-123',
        name: 'Updated Name',
        description: 'Updated description',
        updatedBy: 'user-123',
        orgId: 'org-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      const response = result.unwrap();
      expect(response.success).toBe(true);
      expect(response.message).toBe('Report template updated successfully');
      expect(template.updateName).toHaveBeenCalledWith('Updated Name', 'user-123');
      expect(template.updateDescription).toHaveBeenCalledWith('Updated description');
    });

    it('Given: non-existent template When: updating Then: should return NotFoundError', async () => {
      // Arrange
      mockReportTemplateRepository.findById.mockResolvedValue(null);

      const request: IUpdateReportTemplateRequest = {
        templateId: 'non-existent',
        name: 'Updated Name',
        updatedBy: 'user-123',
        orgId: 'org-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('not found');
        }
      );
    });

    it('Given: short name When: updating Then: should return ValidationError', async () => {
      // Arrange
      const template = createMockTemplate('template-123', 'Original Name');
      mockReportTemplateRepository.findById.mockResolvedValue(template);

      const request: IUpdateReportTemplateRequest = {
        templateId: 'template-123',
        name: 'AB',
        updatedBy: 'user-123',
        orgId: 'org-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('at least 3 characters');
        }
      );
    });

    it('Given: long name When: updating Then: should return ValidationError', async () => {
      // Arrange
      const template = createMockTemplate('template-123', 'Original Name');
      mockReportTemplateRepository.findById.mockResolvedValue(template);

      const request: IUpdateReportTemplateRequest = {
        templateId: 'template-123',
        name: 'A'.repeat(101),
        updatedBy: 'user-123',
        orgId: 'org-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('at most 100 characters');
        }
      );
    });

    it('Given: duplicate name When: updating Then: should return ConflictError', async () => {
      // Arrange
      const template = createMockTemplate('template-123', 'Original Name');
      const existingTemplate = createMockTemplate('template-456', 'Existing Name');
      mockReportTemplateRepository.findById.mockResolvedValue(template);
      mockReportTemplateRepository.findByName.mockResolvedValue(existingTemplate);

      const request: IUpdateReportTemplateRequest = {
        templateId: 'template-123',
        name: 'Existing Name',
        updatedBy: 'user-123',
        orgId: 'org-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toContain('already exists');
        }
      );
    });

    it('Given: isActive true When: updating Then: should activate template', async () => {
      // Arrange
      const template = createMockTemplate('template-123', 'Original Name', false);
      mockReportTemplateRepository.findById.mockResolvedValue(template);
      mockReportTemplateRepository.save.mockResolvedValue(template);

      const request: IUpdateReportTemplateRequest = {
        templateId: 'template-123',
        isActive: true,
        updatedBy: 'user-123',
        orgId: 'org-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(template.activate).toHaveBeenCalled();
    });

    it('Given: isActive false When: updating Then: should deactivate template', async () => {
      // Arrange
      const template = createMockTemplate('template-123', 'Original Name', true);
      mockReportTemplateRepository.findById.mockResolvedValue(template);
      mockReportTemplateRepository.save.mockResolvedValue(template);

      const request: IUpdateReportTemplateRequest = {
        templateId: 'template-123',
        isActive: false,
        updatedBy: 'user-123',
        orgId: 'org-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(template.deactivate).toHaveBeenCalled();
    });

    it('Given: save fails When: updating Then: should return ValidationError', async () => {
      // Arrange
      const template = createMockTemplate('template-123', 'Original Name');
      mockReportTemplateRepository.findById.mockResolvedValue(template);
      mockReportTemplateRepository.save.mockRejectedValue(new Error('Database error'));

      const request: IUpdateReportTemplateRequest = {
        templateId: 'template-123',
        description: 'Updated description',
        updatedBy: 'user-123',
        orgId: 'org-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('Database error');
        }
      );
    });
  });
});
