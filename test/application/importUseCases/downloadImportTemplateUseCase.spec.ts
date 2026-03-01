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

    it('Given: xlsx format When: downloading template Then: should fall back to CSV generation', async () => {
      // Arrange
      const csvBuffer = Buffer.from('sku,name,unit');
      jest.spyOn(ImportTemplateService, 'generateCSVTemplateBuffer').mockReturnValue(csvBuffer);
      jest
        .spyOn(ImportTemplateService, 'getTemplateFilename')
        .mockReturnValue('products-template.xlsx');
      jest
        .spyOn(ImportTemplateService, 'getMimeType')
        .mockReturnValue('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      jest
        .spyOn(ImportTemplateService, 'getColumnDescriptions')
        .mockReturnValue('Column descriptions');

      const request: IDownloadImportTemplateRequest = {
        type: 'PRODUCTS' as const,
        format: 'xlsx' as const,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.content).toBe(csvBuffer);
          expect(ImportTemplateService.generateCSVTemplateBuffer).toHaveBeenCalled();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: format not provided When: downloading template Then: should default to csv', async () => {
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

      const request: IDownloadImportTemplateRequest = {
        type: 'PRODUCTS' as const,
        orgId: mockOrgId,
        // format intentionally omitted
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(ImportTemplateService.getTemplateFilename).toHaveBeenCalledWith(
        expect.anything(),
        'csv'
      );
      expect(ImportTemplateService.getMimeType).toHaveBeenCalledWith('csv');
    });

    it('Given: template service throws error When: downloading template Then: should return ValidationError from outer catch', async () => {
      // Arrange
      jest.spyOn(ImportTemplateService, 'generateCSVTemplateBuffer').mockImplementation(() => {
        throw new Error('Template generation failed');
      });

      const request: IDownloadImportTemplateRequest = {
        type: 'PRODUCTS' as const,
        format: 'csv' as const,
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
          expect(error.message).toBe('Failed to generate import template');
        }
      );
    });
  });
});
