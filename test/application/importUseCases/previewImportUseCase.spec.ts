import { PreviewImportUseCase } from '@application/importUseCases/previewImportUseCase';
import { ImportValidationService } from '@import/domain/services/importValidation.service';
import { ValidationResult } from '@import/domain/valueObjects/validationResult.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ValidationError } from '@shared/domain/result/domainError';

import type { IFileParsingService } from '@shared/ports/externalServices';

describe('PreviewImportUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: PreviewImportUseCase;
  let mockFileParsingService: jest.Mocked<IFileParsingService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFileParsingService = {
      validateFileFormat: jest.fn(),
      parseFile: jest.fn(),
    } as jest.Mocked<IFileParsingService>;

    useCase = new PreviewImportUseCase(mockFileParsingService);
  });

  describe('execute', () => {
    const mockFile = {
      originalname: 'products.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    it('Given: valid file When: previewing import Then: should return preview result', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockFileParsingService.parseFile.mockResolvedValue({
        headers: ['sku', 'name', 'unit'],
        rows: [{ sku: 'PROD-001', name: 'Product 1', unit: 'UNIT' }],
        totalRows: 1,
        fileType: 'excel' as const,
      });

      jest
        .spyOn(ImportValidationService, 'validateFileStructure')
        .mockReturnValue(ValidationResult.valid());

      jest
        .spyOn(ImportValidationService, 'validateRowData')
        .mockReturnValue(ValidationResult.valid());

      const request = {
        type: 'PRODUCTS' as const,
        file: mockFile,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('File is valid and can be processed');
          expect(value.data.totalRows).toBeGreaterThanOrEqual(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: invalid file format When: previewing import Then: should return ValidationError', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: false,
        errors: ['Invalid file format'],
      });

      const request = {
        type: 'PRODUCTS' as const,
        file: mockFile,
        orgId: mockOrgId,
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
        }
      );
    });
  });
});
