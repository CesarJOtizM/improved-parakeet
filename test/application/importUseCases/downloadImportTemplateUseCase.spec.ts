import {
  DownloadImportTemplateUseCase,
  type IDownloadImportTemplateRequest,
} from '@application/importUseCases/downloadImportTemplateUseCase';
import { ImportTemplateService } from '@import/domain/services/importTemplate.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ValidationError } from '@shared/domain/result/domainError';

describe('DownloadImportTemplateUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: DownloadImportTemplateUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DownloadImportTemplateUseCase();
  });

  describe('execute', () => {
    it('Given: valid import type When: downloading template Then: should return template', async () => {
      // Arrange
      jest
        .spyOn(ImportTemplateService, 'generateCSVTemplateBuffer')
        .mockReturnValue(Buffer.from('test'));
      jest
        .spyOn(ImportTemplateService, 'getTemplateFilename')
        .mockReturnValue('products-template.csv');
      jest.spyOn(ImportTemplateService, 'getMimeType').mockReturnValue('text/csv');
      jest
        .spyOn(ImportTemplateService, 'getColumnDescriptions')
        .mockReturnValue('Column descriptions');

      const request = {
        type: 'PRODUCTS' as const,
        format: 'csv' as const,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Import template generated successfully');
          expect(value.data.content).toBeInstanceOf(Buffer);
          expect(value.data.filename).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: invalid import type When: downloading template Then: should return ValidationError', async () => {
      // Arrange
      const request: IDownloadImportTemplateRequest = {
        type: 'INVALID_TYPE' as 'PRODUCTS',
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
