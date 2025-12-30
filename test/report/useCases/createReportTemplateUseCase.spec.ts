// CreateReportTemplateUseCase Tests
// Unit tests for CreateReportTemplateUseCase following AAA and Given-When-Then pattern

import { CreateReportTemplateUseCase } from '@application/reportUseCases';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportTemplate } from '@report/domain/entities/reportTemplate.entity';
import { IReportTemplateRepository } from '@report/domain/ports/repositories';
import { REPORT_TYPES } from '@report/domain/valueObjects';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { ConflictError, ValidationError } from '@shared/domain/result/domainError';

describe('CreateReportTemplateUseCase', () => {
  let useCase: CreateReportTemplateUseCase;
  let mockRepository: jest.Mocked<IReportTemplateRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      existsByName: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByType: jest.fn(),
      findActive: jest.fn(),
      findByName: jest.fn(),
      findByCreatedBy: jest.fn(),
    };

    mockEventDispatcher = {
      dispatchEvents: jest.fn(),
      markAndDispatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateReportTemplateUseCase,
        {
          provide: 'ReportTemplateRepository',
          useValue: mockRepository,
        },
        {
          provide: 'DomainEventDispatcher',
          useValue: mockEventDispatcher,
        },
      ],
    }).compile();

    useCase = module.get<CreateReportTemplateUseCase>(CreateReportTemplateUseCase);
  });

  describe('execute', () => {
    it('Given: valid request When: executing Then: should return Ok result', async () => {
      // Arrange
      const request = {
        name: 'Monthly Sales Report',
        description: 'Report for monthly sales',
        type: REPORT_TYPES.SALES,
        defaultParameters: { warehouseId: 'warehouse-123' },
        createdBy: 'user-123',
        orgId: 'org-123',
      };

      mockRepository.existsByName.mockResolvedValue(false);
      mockRepository.save.mockImplementation(async (template: ReportTemplate) => template);

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Report template created successfully');
          expect(value.data.name).toBe('Monthly Sales Report');
          expect(value.data.type).toBe(REPORT_TYPES.SALES);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: name too short When: executing Then: should return ValidationError', async () => {
      // Arrange
      const request = {
        name: 'AB',
        type: REPORT_TYPES.SALES,
        defaultParameters: {},
        createdBy: 'user-123',
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

    it('Given: name too long When: executing Then: should return ValidationError', async () => {
      // Arrange
      const request = {
        name: 'A'.repeat(101),
        type: REPORT_TYPES.SALES,
        defaultParameters: {},
        createdBy: 'user-123',
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

    it('Given: duplicate name When: executing Then: should return ConflictError', async () => {
      // Arrange
      const request = {
        name: 'Existing Template',
        type: REPORT_TYPES.SALES,
        defaultParameters: {},
        createdBy: 'user-123',
        orgId: 'org-123',
      };

      mockRepository.existsByName.mockResolvedValue(true);

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

    it('Given: invalid report type When: executing Then: should return ValidationError', async () => {
      // Arrange
      const request = {
        name: 'Valid Name',
        type: 'INVALID_TYPE',
        defaultParameters: {},
        createdBy: 'user-123',
        orgId: 'org-123',
      };

      mockRepository.existsByName.mockResolvedValue(false);

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
          expect(error.message).toContain('Invalid report type');
        }
      );
    });

    it('Given: successful creation When: executing Then: should dispatch domain events', async () => {
      // Arrange
      const request = {
        name: 'New Template',
        type: REPORT_TYPES.FINANCIAL,
        defaultParameters: {},
        createdBy: 'user-123',
        orgId: 'org-123',
      };

      mockRepository.existsByName.mockResolvedValue(false);
      mockRepository.save.mockImplementation(async (template: ReportTemplate) => template);

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalled();
    });
  });
});
