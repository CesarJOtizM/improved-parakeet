import { ImportBatch, ImportRow, ImportStatus, ImportType, ValidationResult } from '@import/domain';
import { PrismaImportBatchRepository } from '@infrastructure/database/repositories/prismaImportBatchRepository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('PrismaImportBatchRepository', () => {
  let repository: PrismaImportBatchRepository;

  let mockPrismaClient: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    importBatch: Record<string, jest.Mock<any>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    importRow: Record<string, jest.Mock<any>>;
  };

  const mockBatchData = {
    id: 'batch-123',
    orgId: 'org-123',
    type: 'PRODUCTS',
    status: 'PENDING',
    fileName: 'products.csv',
    totalRows: 100,
    processedRows: 0,
    validRows: 0,
    invalidRows: 0,
    startedAt: null,
    validatedAt: null,
    completedAt: null,
    errorMessage: null,
    note: 'Test import',
    createdBy: 'user-789',
    createdAt: new Date('2026-02-20T10:00:00Z'),
    updatedAt: new Date('2026-02-20T10:00:00Z'),
    rows: [
      {
        id: 'row-1',
        orgId: 'org-123',
        rowNumber: 1,
        data: { name: 'Product A', sku: 'SKU-001' },
        isValid: true,
        validationErrors: [],
        warnings: [],
      },
    ],
  };

  const mockBatchDataNoRows = {
    ...mockBatchData,
    rows: [],
  };

  const mockCompletedBatchData = {
    ...mockBatchData,
    status: 'COMPLETED',
    processedRows: 100,
    validRows: 95,
    invalidRows: 5,
    startedAt: new Date('2026-02-20T10:01:00Z'),
    validatedAt: new Date('2026-02-20T10:02:00Z'),
    completedAt: new Date('2026-02-20T10:05:00Z'),
  };

  beforeEach(() => {
    mockPrismaClient = {
      importBatch: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      importRow: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockPrismaClient);
      }),
    };

    // The repository casts prismaService to PrismaClient internally
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaImportBatchRepository(mockPrismaClient as any);
  });

  describe('save', () => {
    it('Given: valid import batch When: saving Then: should upsert batch', async () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create('PENDING'),
          fileName: 'products.csv',
          totalRows: 100,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-789',
          note: 'Test import',
        },
        'batch-123',
        'org-123'
      );

      mockPrismaClient.importBatch.upsert.mockResolvedValue(mockBatchData);

      // Act
      const result = await repository.save(batch);

      // Assert
      expect(result).not.toBeNull();
      expect(result.id).toBe('batch-123');
      expect(mockPrismaClient.importBatch.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'batch-123' },
        })
      );
    });

    it('Given: batch with rows When: saving Then: should save rows too', async () => {
      // Arrange
      const batch = ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create('PENDING'),
          fileName: 'products.csv',
          totalRows: 1,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-789',
        },
        'batch-123',
        'org-123'
      );

      const row = ImportRow.reconstitute(
        {
          rowNumber: 1,
          data: { name: 'Product A', sku: 'SKU-001' },
          validationResult: ValidationResult.valid(),
        },
        'row-1',
        'org-123'
      );
      batch.restoreRows([row]);

      mockPrismaClient.importBatch.upsert.mockResolvedValue(mockBatchData);
      mockPrismaClient.importRow.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.importRow.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await repository.save(batch);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaClient.importRow.deleteMany).toHaveBeenCalledWith({
        where: { importBatchId: 'batch-123' },
      });
      expect(mockPrismaClient.importRow.createMany).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return import batch', async () => {
      // Arrange
      mockPrismaClient.importBatch.findFirst.mockResolvedValue(mockBatchData);

      // Act
      const result = await repository.findById('batch-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('batch-123');
      expect(result?.type.getValue()).toBe('PRODUCTS');
      expect(result?.status.getValue()).toBe('PENDING');
      expect(result?.fileName).toBe('products.csv');
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaClient.importBatch.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return batches', async () => {
      // Arrange
      mockPrismaClient.importBatch.findMany.mockResolvedValue([mockBatchDataNoRows]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('batch-123');
    });

    it('Given: no batches When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaClient.importBatch.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('exists', () => {
    it('Given: existing batch When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaClient.importBatch.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('batch-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-existent batch When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaClient.importBatch.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findByType', () => {
    it('Given: valid type When: finding by type Then: should return matching batches', async () => {
      // Arrange
      mockPrismaClient.importBatch.findMany.mockResolvedValue([mockBatchDataNoRows]);

      // Act
      const result = await repository.findByType('PRODUCTS', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaClient.importBatch.findMany).toHaveBeenCalledWith({
        where: { type: 'PRODUCTS', orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: no batches of type When: finding by type Then: should return empty array', async () => {
      // Arrange
      mockPrismaClient.importBatch.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByType('MOVEMENTS', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findByStatus', () => {
    it('Given: valid status When: finding by status Then: should return matching batches', async () => {
      // Arrange
      mockPrismaClient.importBatch.findMany.mockResolvedValue([mockBatchDataNoRows]);

      // Act
      const result = await repository.findByStatus('PENDING', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaClient.importBatch.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING', orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByCreatedBy', () => {
    it('Given: valid userId When: finding by creator Then: should return matching batches', async () => {
      // Arrange
      mockPrismaClient.importBatch.findMany.mockResolvedValue([mockBatchDataNoRows]);

      // Act
      const result = await repository.findByCreatedBy('user-789', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaClient.importBatch.findMany).toHaveBeenCalledWith({
        where: { createdBy: 'user-789', orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByTypeAndStatus', () => {
    it('Given: type and status When: finding Then: should return matching batches', async () => {
      // Arrange
      mockPrismaClient.importBatch.findMany.mockResolvedValue([
        { ...mockCompletedBatchData, rows: [] },
      ]);

      // Act
      const result = await repository.findByTypeAndStatus('PRODUCTS', 'COMPLETED', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaClient.importBatch.findMany).toHaveBeenCalledWith({
        where: { type: 'PRODUCTS', status: 'COMPLETED', orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findRecent', () => {
    it('Given: valid orgId When: finding recent Then: should return limited batches', async () => {
      // Arrange
      mockPrismaClient.importBatch.findMany.mockResolvedValue([mockBatchDataNoRows]);

      // Act
      const result = await repository.findRecent('org-123', 5);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaClient.importBatch.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });

    it('Given: no limit specified When: finding recent Then: should default to 10', async () => {
      // Arrange
      mockPrismaClient.importBatch.findMany.mockResolvedValue([]);

      // Act
      await repository.findRecent('org-123');

      // Assert
      expect(mockPrismaClient.importBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe('countByStatus', () => {
    it('Given: valid status When: counting Then: should return count', async () => {
      // Arrange
      mockPrismaClient.importBatch.count.mockResolvedValue(3);

      // Act
      const result = await repository.countByStatus('PENDING', 'org-123');

      // Assert
      expect(result).toBe(3);
      expect(mockPrismaClient.importBatch.count).toHaveBeenCalledWith({
        where: { status: 'PENDING', orgId: 'org-123' },
      });
    });
  });

  describe('delete', () => {
    it('Given: valid id When: deleting Then: should delete batch', async () => {
      // Arrange
      mockPrismaClient.importBatch.delete.mockResolvedValue(mockBatchData);

      // Act
      await repository.delete('batch-123', 'org-123');

      // Assert
      expect(mockPrismaClient.importBatch.delete).toHaveBeenCalledWith({
        where: { id: 'batch-123' },
      });
    });
  });
});
