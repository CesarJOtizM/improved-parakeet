import { GetReportTemplatesUseCase } from '@application/reportUseCases/getReportTemplatesUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReportTemplate } from '@report/domain/entities/reportTemplate.entity';
import { ReportParameters } from '@report/domain/valueObjects/reportParameters.valueObject';
import { ReportType } from '@report/domain/valueObjects/reportType.valueObject';

import type { IReportTemplateRepository } from '@report/domain/ports/repositories';

describe('GetReportTemplatesUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'user-123';

  let useCase: GetReportTemplatesUseCase;
  let mockRepository: jest.Mocked<IReportTemplateRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByType: jest.fn(),
      findActive: jest.fn(),
      findByName: jest.fn(),
      existsByName: jest.fn(),
      findByCreatedBy: jest.fn(),
    } as jest.Mocked<IReportTemplateRepository>;

    useCase = new GetReportTemplatesUseCase(mockRepository);
  });

  const createMockTemplate = (overrides?: {
    name?: string;
    type?: ReportType;
    isActive?: boolean;
  }): ReportTemplate => {
    const props = {
      name: overrides?.name || 'Test Template',
      description: 'Test description',
      type: overrides?.type || ReportType.create('AVAILABLE_INVENTORY'),
      defaultParameters: ReportParameters.create({}),
      isActive: overrides?.isActive !== undefined ? overrides.isActive : true,
      createdBy: mockUserId,
    };
    return ReportTemplate.reconstitute(props, 'template-123', mockOrgId);
  };

  it('Given: no filters When: getting templates Then: should return all templates', async () => {
    // Arrange
    const mockTemplates = [createMockTemplate(), createMockTemplate({ name: 'Template 2' })];
    mockRepository.findAll.mockResolvedValue(mockTemplates);
    const request = { orgId: mockOrgId };

    // Act
    const result = await useCase.execute(request);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data).toHaveLength(2);
        expect(mockRepository.findAll).toHaveBeenCalledWith(mockOrgId);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: activeOnly filter When: getting templates Then: should return only active templates', async () => {
    // Arrange
    const mockTemplates = [createMockTemplate()];
    mockRepository.findActive.mockResolvedValue(mockTemplates);
    const request = { orgId: mockOrgId, activeOnly: true };

    // Act
    const result = await useCase.execute(request);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data).toHaveLength(1);
        expect(mockRepository.findActive).toHaveBeenCalledWith(mockOrgId);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: type filter When: getting templates Then: should return templates by type', async () => {
    // Arrange
    const mockTemplates = [createMockTemplate()];
    mockRepository.findByType.mockResolvedValue(mockTemplates);
    const request = { orgId: mockOrgId, type: 'AVAILABLE_INVENTORY' };

    // Act
    const result = await useCase.execute(request);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data).toHaveLength(1);
        expect(mockRepository.findByType).toHaveBeenCalledWith('AVAILABLE_INVENTORY', mockOrgId);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: createdBy filter When: getting templates Then: should return templates by creator', async () => {
    // Arrange
    const mockTemplates = [createMockTemplate()];
    mockRepository.findByCreatedBy.mockResolvedValue(mockTemplates);
    const request = { orgId: mockOrgId, createdBy: mockUserId };

    // Act
    const result = await useCase.execute(request);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data).toHaveLength(1);
        expect(mockRepository.findByCreatedBy).toHaveBeenCalledWith(mockUserId, mockOrgId);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: type and activeOnly filters When: getting templates Then: should apply both filters', async () => {
    // Arrange
    const mockTemplates = [
      createMockTemplate({ type: ReportType.create('AVAILABLE_INVENTORY') }),
      createMockTemplate({ type: ReportType.create('SALES') }),
    ];
    mockRepository.findActive.mockResolvedValue(mockTemplates);
    const request = { orgId: mockOrgId, activeOnly: true, type: 'AVAILABLE_INVENTORY' };

    // Act
    const result = await useCase.execute(request);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data).toHaveLength(1); // Filtered by type
        expect(value.data[0].type).toBe('AVAILABLE_INVENTORY');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: no templates found When: getting templates Then: should return empty array', async () => {
    // Arrange
    mockRepository.findAll.mockResolvedValue([]);
    const request = { orgId: mockOrgId };

    // Act
    const result = await useCase.execute(request);

    // Assert
    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data).toHaveLength(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });
});
