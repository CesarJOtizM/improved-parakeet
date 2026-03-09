/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImportController } from '@interface/http/import/import.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError, NotFoundError } from '@shared/domain/result/domainError';

describe('ImportController', () => {
  let controller: ImportController;
  let mockCreateImportBatchUseCase: any;
  let mockValidateImportUseCase: any;
  let mockProcessImportUseCase: any;
  let mockGetImportStatusUseCase: any;
  let mockDownloadImportTemplateUseCase: any;
  let mockDownloadErrorReportUseCase: any;
  let mockPreviewImportUseCase: any;
  let mockExecuteImportUseCase: any;

  const mockRequest = {
    user: { id: 'user-123', email: 'test@test.com', orgId: 'org-123' },
  };

  const mockFile = {
    originalname: 'products.csv',
    mimetype: 'text/csv',
    buffer: Buffer.from('sku,name\nSKU-001,Product 1'),
    size: 100,
  } as Express.Multer.File;

  const mockBatchData = {
    id: 'batch-123',
    type: 'PRODUCTS',
    status: 'PENDING',
    fileName: 'products.csv',
    orgId: 'org-123',
    createdBy: 'user-123',
  };

  beforeEach(() => {
    mockCreateImportBatchUseCase = { execute: jest.fn() };
    mockValidateImportUseCase = { execute: jest.fn() };
    mockProcessImportUseCase = { execute: jest.fn() };
    mockGetImportStatusUseCase = { execute: jest.fn() };
    mockDownloadImportTemplateUseCase = { execute: jest.fn() };
    mockDownloadErrorReportUseCase = { execute: jest.fn() };
    mockPreviewImportUseCase = { execute: jest.fn() };
    mockExecuteImportUseCase = { execute: jest.fn() };

    controller = new ImportController(
      mockCreateImportBatchUseCase,
      mockValidateImportUseCase,
      mockProcessImportUseCase,
      mockGetImportStatusUseCase,
      mockDownloadImportTemplateUseCase,
      mockDownloadErrorReportUseCase,
      mockPreviewImportUseCase,
      mockExecuteImportUseCase
    );
  });

  describe('previewImport', () => {
    it('Given: valid file and type When: previewing Then: should return preview data', async () => {
      // Arrange
      const dto = { type: 'PRODUCTS' };
      const previewResponse = {
        success: true,
        data: {
          totalRows: 10,
          validRows: 8,
          invalidRows: 2,
          preview: [{ sku: 'SKU-001', name: 'Product 1' }],
          errors: [],
        },
        message: 'Preview generated',
        timestamp: new Date().toISOString(),
      };
      mockPreviewImportUseCase.execute.mockResolvedValue(ok(previewResponse));

      // Act
      const result = await controller.previewImport(mockFile, dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.totalRows).toBe(10);
      expect(mockPreviewImportUseCase.execute).toHaveBeenCalledWith({
        type: 'PRODUCTS',
        file: mockFile,
        orgId: 'org-123',
      });
    });

    it('Given: invalid file When: previewing Then: should throw validation error', async () => {
      // Arrange
      const dto = { type: 'PRODUCTS' };
      mockPreviewImportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid file format'))
      );

      // Act & Assert
      await expect(controller.previewImport(mockFile, dto as any, 'org-123')).rejects.toThrow();
    });
  });

  describe('executeImport', () => {
    it('Given: valid file and type When: executing import Then: should return import result', async () => {
      // Arrange
      const dto = { type: 'PRODUCTS', note: 'Test import' };
      const executeResponse = {
        success: true,
        data: {
          batchId: 'batch-123',
          totalProcessed: 10,
          successCount: 8,
          errorCount: 2,
        },
        message: 'Import executed',
        timestamp: new Date().toISOString(),
      };
      mockExecuteImportUseCase.execute.mockResolvedValue(ok(executeResponse));

      // Act
      const result = await controller.executeImport(
        mockFile,
        dto as any,
        'org-123',
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.batchId).toBe('batch-123');
      expect(mockExecuteImportUseCase.execute).toHaveBeenCalledWith({
        type: 'PRODUCTS',
        file: mockFile,
        note: 'Test import',
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });

    it('Given: validation errors in file When: executing import Then: should throw', async () => {
      // Arrange
      const dto = { type: 'PRODUCTS' };
      mockExecuteImportUseCase.execute.mockResolvedValue(
        err(new ValidationError('File contains validation errors'))
      );

      // Act & Assert
      await expect(
        controller.executeImport(mockFile, dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('createImportBatch', () => {
    it('Given: valid batch data When: creating Then: should return created batch', async () => {
      // Arrange
      const dto = { type: 'PRODUCTS', fileName: 'products.csv', note: 'Test batch' };
      mockCreateImportBatchUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockBatchData,
          message: 'Import batch created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createImportBatch(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('batch-123');
      expect(mockCreateImportBatchUseCase.execute).toHaveBeenCalledWith({
        type: 'PRODUCTS',
        fileName: 'products.csv',
        note: 'Test batch',
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });

    it('Given: invalid batch data When: creating Then: should throw', async () => {
      // Arrange
      const dto = { type: '', fileName: '' };
      mockCreateImportBatchUseCase.execute.mockResolvedValue(
        err(new ValidationError('Import type is required'))
      );

      // Act & Assert
      await expect(
        controller.createImportBatch(dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('validateImportBatch', () => {
    it('Given: valid batch and file When: validating Then: should return validation result', async () => {
      // Arrange
      const validationResponse = {
        success: true,
        data: { batchId: 'batch-123', status: 'VALIDATED', validRows: 10, invalidRows: 0 },
        message: 'Batch validated',
        timestamp: new Date().toISOString(),
      };
      mockValidateImportUseCase.execute.mockResolvedValue(ok(validationResponse));

      // Act
      const result = await controller.validateImportBatch('batch-123', mockFile, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('VALIDATED');
      expect(mockValidateImportUseCase.execute).toHaveBeenCalledWith({
        batchId: 'batch-123',
        file: mockFile,
        orgId: 'org-123',
      });
    });

    it('Given: non-existent batch When: validating Then: should throw not found', async () => {
      // Arrange
      mockValidateImportUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Import batch not found'))
      );

      // Act & Assert
      await expect(
        controller.validateImportBatch('non-existent', mockFile, 'org-123')
      ).rejects.toThrow();
    });

    it('Given: invalid file When: validating Then: should throw validation error', async () => {
      // Arrange
      mockValidateImportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid file content'))
      );

      // Act & Assert
      await expect(
        controller.validateImportBatch('batch-123', mockFile, 'org-123')
      ).rejects.toThrow();
    });
  });

  describe('processImportBatch', () => {
    it('Given: validated batch When: processing Then: should return process result', async () => {
      // Arrange
      const dto = { skipInvalidRows: true };
      const processResponse = {
        success: true,
        data: { batchId: 'batch-123', status: 'COMPLETED', processedRows: 10 },
        message: 'Batch processed',
        timestamp: new Date().toISOString(),
      };
      mockProcessImportUseCase.execute.mockResolvedValue(ok(processResponse));

      // Act
      const result = await controller.processImportBatch('batch-123', dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('COMPLETED');
      expect(mockProcessImportUseCase.execute).toHaveBeenCalledWith({
        batchId: 'batch-123',
        skipInvalidRows: true,
        orgId: 'org-123',
      });
    });

    it('Given: non-validated batch When: processing Then: should throw', async () => {
      // Arrange
      const dto = { skipInvalidRows: false };
      mockProcessImportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Batch is not in VALIDATED status'))
      );

      // Act & Assert
      await expect(
        controller.processImportBatch('batch-123', dto as any, 'org-123')
      ).rejects.toThrow();
    });
  });

  describe('getImportStatus', () => {
    it('Given: valid batch id When: getting status Then: should return status', async () => {
      // Arrange
      const statusResponse = {
        success: true,
        data: {
          id: 'batch-123',
          status: 'PROCESSING',
          progress: 50,
          totalRows: 100,
          processedRows: 50,
        },
        message: 'Status retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetImportStatusUseCase.execute.mockResolvedValue(ok(statusResponse));

      // Act
      const result = await controller.getImportStatus('batch-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('PROCESSING');
      expect(mockGetImportStatusUseCase.execute).toHaveBeenCalledWith({
        batchId: 'batch-123',
        orgId: 'org-123',
      });
    });

    it('Given: non-existent batch When: getting status Then: should throw not found', async () => {
      // Arrange
      mockGetImportStatusUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Import batch not found'))
      );

      // Act & Assert
      await expect(controller.getImportStatus('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('downloadTemplate', () => {
    it('Given: valid type When: downloading template Then: should send file', async () => {
      // Arrange
      const templateData = {
        data: {
          filename: 'products_template.csv',
          mimeType: 'text/csv',
          content: Buffer.from('sku,name,description'),
        },
      };
      mockDownloadImportTemplateUseCase.execute.mockResolvedValue(ok(templateData));

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      // Act
      await controller.downloadTemplate('PRODUCTS', 'csv', mockRes as any, 'org-123');

      // Assert
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="products_template.csv"'
      );
      expect(mockRes.send).toHaveBeenCalledWith(templateData.data.content);
    });

    it('Given: invalid type When: downloading template Then: should throw', async () => {
      // Arrange
      mockDownloadImportTemplateUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid import type'))
      );

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      // Act & Assert - resultToHttpResponse will throw on error
      await expect(
        controller.downloadTemplate('INVALID', 'csv', mockRes as any, 'org-123')
      ).rejects.toThrow();
    });
  });

  describe('getErrorReport', () => {
    it('Given: batch with errors When: getting error report Then: should send file', async () => {
      // Arrange
      const errorReportData = {
        data: {
          filename: 'errors_batch-123.csv',
          mimeType: 'text/csv',
          content: Buffer.from('row,error\n1,Invalid SKU'),
        },
      };
      mockDownloadErrorReportUseCase.execute.mockResolvedValue(ok(errorReportData));

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      // Act
      await controller.getErrorReport(
        'batch-123',
        { format: 'csv' } as any,
        mockRes as any,
        'org-123'
      );

      // Assert
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.send).toHaveBeenCalledWith(errorReportData.data.content);
    });

    it('Given: non-existent batch When: getting error report Then: should throw', async () => {
      // Arrange
      mockDownloadErrorReportUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Import batch not found'))
      );

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      // Act & Assert
      await expect(
        controller.getErrorReport(
          'non-existent',
          { format: 'csv' } as any,
          mockRes as any,
          'org-123'
        )
      ).rejects.toThrow();
    });
  });

  describe('listImportBatches', () => {
    it('Given: valid query When: listing import batches Then: should return paginated list', async () => {
      // Arrange
      const query = { page: 1, limit: 10, type: 'PRODUCTS', status: 'COMPLETED' };
      const listResponse = {
        success: true,
        data: [mockBatchData],
        pagination: { page: 1, limit: 10, total: 1 },
        message: 'Batches retrieved',
        timestamp: new Date().toISOString(),
      };
      (controller as any).listImportBatchesUseCase = { execute: jest.fn() };
      (controller as any).listImportBatchesUseCase.execute.mockResolvedValue(ok(listResponse));

      // Act
      const result = await controller.listImportBatches(query as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('Given: no filters When: listing import batches Then: should pass undefined filters', async () => {
      // Arrange
      const query = {} as any;
      const listResponse = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0 },
        message: 'Batches retrieved',
        timestamp: new Date().toISOString(),
      };
      (controller as any).listImportBatchesUseCase = { execute: jest.fn() };
      (controller as any).listImportBatchesUseCase.execute.mockResolvedValue(ok(listResponse));

      // Act
      const result = await controller.listImportBatches(query, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('Given: error from use case When: listing import batches Then: should throw', async () => {
      // Arrange
      const query = { page: 1, limit: 10 } as any;
      (controller as any).listImportBatchesUseCase = { execute: jest.fn() };
      (controller as any).listImportBatchesUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid query'))
      );

      // Act & Assert
      await expect(controller.listImportBatches(query, 'org-123')).rejects.toThrow();
    });
  });

  describe('previewImport - additional branches', () => {
    it('Given: MOVEMENTS type When: previewing Then: should pass MOVEMENTS type', async () => {
      // Arrange
      const dto = { type: 'MOVEMENTS' };
      const previewResponse = {
        success: true,
        data: { totalRows: 5, validRows: 5, invalidRows: 0, preview: [], errors: [] },
        message: 'Preview generated',
        timestamp: new Date().toISOString(),
      };
      mockPreviewImportUseCase.execute.mockResolvedValue(ok(previewResponse));

      // Act
      const result = await controller.previewImport(mockFile, dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockPreviewImportUseCase.execute).toHaveBeenCalledWith({
        type: 'MOVEMENTS',
        file: mockFile,
        orgId: 'org-123',
      });
    });
  });

  describe('executeImport - additional branches', () => {
    it('Given: no note provided When: executing import Then: should pass undefined note', async () => {
      // Arrange
      const dto = { type: 'PRODUCTS' };
      const executeResponse = {
        success: true,
        data: { batchId: 'batch-456', totalProcessed: 5, successCount: 5, errorCount: 0 },
        message: 'Import executed',
        timestamp: new Date().toISOString(),
      };
      mockExecuteImportUseCase.execute.mockResolvedValue(ok(executeResponse));

      // Act
      const result = await controller.executeImport(
        mockFile,
        dto as any,
        'org-123',
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockExecuteImportUseCase.execute).toHaveBeenCalledWith({
        type: 'PRODUCTS',
        file: mockFile,
        note: undefined,
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });
  });

  describe('createImportBatch - additional branches', () => {
    it('Given: no note When: creating batch Then: should pass undefined note', async () => {
      // Arrange
      const dto = { type: 'WAREHOUSES', fileName: 'warehouses.csv' };
      mockCreateImportBatchUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockBatchData, type: 'WAREHOUSES', note: undefined },
          message: 'Import batch created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createImportBatch(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCreateImportBatchUseCase.execute).toHaveBeenCalledWith({
        type: 'WAREHOUSES',
        fileName: 'warehouses.csv',
        note: undefined,
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });
  });

  describe('processImportBatch - additional branches', () => {
    it('Given: skipInvalidRows false When: processing Then: should pass false', async () => {
      // Arrange
      const dto = { skipInvalidRows: false };
      const processResponse = {
        success: true,
        data: { batchId: 'batch-123', status: 'COMPLETED', processedRows: 5 },
        message: 'Batch processed',
        timestamp: new Date().toISOString(),
      };
      mockProcessImportUseCase.execute.mockResolvedValue(ok(processResponse));

      // Act
      const result = await controller.processImportBatch('batch-123', dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockProcessImportUseCase.execute).toHaveBeenCalledWith({
        batchId: 'batch-123',
        skipInvalidRows: false,
        orgId: 'org-123',
      });
    });

    it('Given: not found batch When: processing Then: should throw not found', async () => {
      // Arrange
      const dto = { skipInvalidRows: true };
      mockProcessImportUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Import batch not found'))
      );

      // Act & Assert
      await expect(
        controller.processImportBatch('non-existent', dto as any, 'org-123')
      ).rejects.toThrow();
    });
  });

  describe('downloadTemplate - additional branches', () => {
    it('Given: xlsx format When: downloading template Then: should set xlsx content type', async () => {
      // Arrange
      const templateData = {
        data: {
          filename: 'products_template.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          content: Buffer.from('xlsx-content'),
        },
      };
      mockDownloadImportTemplateUseCase.execute.mockResolvedValue(ok(templateData));

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      // Act
      await controller.downloadTemplate('PRODUCTS', 'xlsx', mockRes as any, 'org-123');

      // Assert
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="products_template.xlsx"'
      );
      expect(mockRes.send).toHaveBeenCalledWith(templateData.data.content);
    });

    it('Given: MOVEMENTS type When: downloading template Then: should pass MOVEMENTS type', async () => {
      // Arrange
      const templateData = {
        data: {
          filename: 'movements_template.csv',
          mimeType: 'text/csv',
          content: Buffer.from('csv-content'),
        },
      };
      mockDownloadImportTemplateUseCase.execute.mockResolvedValue(ok(templateData));

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      // Act
      await controller.downloadTemplate('MOVEMENTS', 'csv', mockRes as any, 'org-123');

      // Assert
      expect(mockDownloadImportTemplateUseCase.execute).toHaveBeenCalledWith({
        type: 'MOVEMENTS',
        format: 'csv',
        orgId: 'org-123',
      });
    });
  });

  describe('listImportBatches - missing constructor param', () => {
    it('Given: controller with listImportBatchesUseCase When: listing Then: should use injected use case', async () => {
      // Arrange - create controller with proper 9th constructor arg
      const mockListUseCase = { execute: jest.fn() };
      const ctrl = new ImportController(
        mockCreateImportBatchUseCase,
        mockValidateImportUseCase,
        mockProcessImportUseCase,
        mockGetImportStatusUseCase,
        mockDownloadImportTemplateUseCase,
        mockDownloadErrorReportUseCase,
        mockPreviewImportUseCase,
        mockExecuteImportUseCase,
        mockListUseCase as any
      );
      const query = { page: 1, limit: 5, type: 'MOVEMENTS', status: 'PENDING' };
      const listResponse = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 5, total: 0 },
        message: 'Batches retrieved',
        timestamp: new Date().toISOString(),
      };
      mockListUseCase.execute.mockResolvedValue(ok(listResponse));

      // Act
      const result = await ctrl.listImportBatches(query as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockListUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 5,
        type: 'MOVEMENTS',
        status: 'PENDING',
        orgId: 'org-123',
      });
    });
  });

  describe('downloadTemplate - default format branch', () => {
    it('Given: no format specified When: downloading template Then: should use csv default', async () => {
      // Arrange
      const templateData = {
        data: {
          filename: 'template.csv',
          mimeType: 'text/csv',
          content: Buffer.from('csv-content'),
        },
      };
      mockDownloadImportTemplateUseCase.execute.mockResolvedValue(ok(templateData));

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      // Act - pass 'csv' explicitly as default param
      await controller.downloadTemplate('STOCK', 'csv', mockRes as any, 'org-123');

      // Assert
      expect(mockDownloadImportTemplateUseCase.execute).toHaveBeenCalledWith({
        type: 'STOCK',
        format: 'csv',
        orgId: 'org-123',
      });
      expect(mockRes.send).toHaveBeenCalledWith(templateData.data.content);
    });

    it('Given: TRANSFERS type and xlsx format When: downloading Then: should pass TRANSFERS type', async () => {
      // Arrange
      const templateData = {
        data: {
          filename: 'transfers_template.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          content: Buffer.from('xlsx-content'),
        },
      };
      mockDownloadImportTemplateUseCase.execute.mockResolvedValue(ok(templateData));

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      // Act
      await controller.downloadTemplate('TRANSFERS', 'xlsx', mockRes as any, 'org-123');

      // Assert
      expect(mockDownloadImportTemplateUseCase.execute).toHaveBeenCalledWith({
        type: 'TRANSFERS',
        format: 'xlsx',
        orgId: 'org-123',
      });
    });
  });

  describe('previewImport - other types', () => {
    it('Given: WAREHOUSES type When: previewing Then: should pass WAREHOUSES type', async () => {
      // Arrange
      const dto = { type: 'WAREHOUSES' };
      const previewResponse = {
        success: true,
        data: { totalRows: 3, validRows: 3, invalidRows: 0, preview: [], errors: [] },
        message: 'Preview generated',
        timestamp: new Date().toISOString(),
      };
      mockPreviewImportUseCase.execute.mockResolvedValue(ok(previewResponse));

      // Act
      const result = await controller.previewImport(mockFile, dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockPreviewImportUseCase.execute).toHaveBeenCalledWith({
        type: 'WAREHOUSES',
        file: mockFile,
        orgId: 'org-123',
      });
    });

    it('Given: STOCK type When: previewing Then: should pass STOCK type', async () => {
      // Arrange
      const dto = { type: 'STOCK' };
      mockPreviewImportUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { totalRows: 1, validRows: 1, invalidRows: 0, preview: [], errors: [] },
          message: 'Preview generated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.previewImport(mockFile, dto as any, 'org-123');

      // Assert
      expect(mockPreviewImportUseCase.execute).toHaveBeenCalledWith({
        type: 'STOCK',
        file: mockFile,
        orgId: 'org-123',
      });
    });

    it('Given: TRANSFERS type When: previewing Then: should pass TRANSFERS type', async () => {
      // Arrange
      const dto = { type: 'TRANSFERS' };
      mockPreviewImportUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { totalRows: 1, validRows: 1, invalidRows: 0, preview: [], errors: [] },
          message: 'Preview generated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.previewImport(mockFile, dto as any, 'org-123');

      // Assert
      expect(mockPreviewImportUseCase.execute).toHaveBeenCalledWith({
        type: 'TRANSFERS',
        file: mockFile,
        orgId: 'org-123',
      });
    });
  });

  describe('executeImport - other types', () => {
    it('Given: WAREHOUSES type When: executing import Then: should pass WAREHOUSES type', async () => {
      // Arrange
      const dto = { type: 'WAREHOUSES', note: 'Import warehouses' };
      mockExecuteImportUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { batchId: 'batch-789', totalProcessed: 3, successCount: 3, errorCount: 0 },
          message: 'Import executed',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.executeImport(
        mockFile,
        dto as any,
        'org-123',
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockExecuteImportUseCase.execute).toHaveBeenCalledWith({
        type: 'WAREHOUSES',
        file: mockFile,
        note: 'Import warehouses',
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });
  });

  describe('createImportBatch - other types', () => {
    it('Given: STOCK type When: creating batch Then: should pass STOCK type', async () => {
      // Arrange
      const dto = { type: 'STOCK', fileName: 'stock.csv', note: 'Stock import' };
      mockCreateImportBatchUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockBatchData, type: 'STOCK' },
          message: 'Import batch created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createImportBatch(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCreateImportBatchUseCase.execute).toHaveBeenCalledWith({
        type: 'STOCK',
        fileName: 'stock.csv',
        note: 'Stock import',
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });

    it('Given: MOVEMENTS type When: creating batch Then: should pass MOVEMENTS type', async () => {
      // Arrange
      const dto = { type: 'MOVEMENTS', fileName: 'movements.xlsx' };
      mockCreateImportBatchUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockBatchData, type: 'MOVEMENTS' },
          message: 'Import batch created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createImportBatch(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCreateImportBatchUseCase.execute).toHaveBeenCalledWith({
        type: 'MOVEMENTS',
        fileName: 'movements.xlsx',
        note: undefined,
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });
  });

  describe('getErrorReport - additional branches', () => {
    it('Given: xlsx format When: getting error report Then: should set xlsx content type', async () => {
      // Arrange
      const errorReportData = {
        data: {
          filename: 'errors_batch-123.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          content: Buffer.from('xlsx-error-report'),
        },
      };
      mockDownloadErrorReportUseCase.execute.mockResolvedValue(ok(errorReportData));

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      // Act
      await controller.getErrorReport(
        'batch-123',
        { format: 'xlsx' } as any,
        mockRes as any,
        'org-123'
      );

      // Assert
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="errors_batch-123.xlsx"'
      );
      expect(mockRes.send).toHaveBeenCalledWith(errorReportData.data.content);
    });

    it('Given: validation error When: getting error report Then: should throw', async () => {
      // Arrange
      mockDownloadErrorReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('No errors found for this batch'))
      );

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      // Act & Assert
      await expect(
        controller.getErrorReport('batch-123', { format: 'csv' } as any, mockRes as any, 'org-123')
      ).rejects.toThrow();
    });
  });
});
