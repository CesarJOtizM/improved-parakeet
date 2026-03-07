import { ListImportBatchesUseCase } from '@application/importUseCases/listImportBatchesUseCase';
import { ImportBatch } from '@import/domain';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { IImportBatchRepository } from '@import/domain';

describe('ListImportBatchesUseCase', () => {
  let useCase: ListImportBatchesUseCase;
  let mockRepository: jest.Mocked<IImportBatchRepository>;

  const createMockBatch = (id: string, type: string, status: string) => {
    return ImportBatch.reconstitute(
      {
        type: ImportType.create(type),
        status: ImportStatus.create(status),
        fileName: 'test.csv',
        totalRows: 10,
        processedRows: 10,
        validRows: 8,
        invalidRows: 2,
        startedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-01'),
        createdBy: 'user-1',
      },
      id,
      'org-1'
    );
  };

  beforeEach(() => {
    mockRepository = {
      findPaginated: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByType: jest.fn(),
      findByStatus: jest.fn(),
      findByCreatedBy: jest.fn(),
      findByTypeAndStatus: jest.fn(),
      findRecent: jest.fn(),
      countByStatus: jest.fn(),
    } as jest.Mocked<IImportBatchRepository>;

    useCase = new ListImportBatchesUseCase(mockRepository);
  });

  it('should return paginated list of import batches', async () => {
    const batches = [
      createMockBatch('batch-1', 'PRODUCTS', 'COMPLETED'),
      createMockBatch('batch-2', 'MOVEMENTS', 'FAILED'),
    ];

    mockRepository.findPaginated.mockResolvedValue({
      data: batches,
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    const result = await useCase.execute({ orgId: 'org-1' });

    expect(result.isOk()).toBe(true);
    const response = result.unwrap();
    expect(response.data).toHaveLength(2);
    expect(response.pagination.total).toBe(2);
    expect(response.data[0].type).toBe('PRODUCTS');
    expect(response.data[1].type).toBe('MOVEMENTS');
  });

  it('should map batch entities to summary DTOs', async () => {
    const batches = [createMockBatch('batch-1', 'PRODUCTS', 'COMPLETED')];

    mockRepository.findPaginated.mockResolvedValue({
      data: batches,
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const result = await useCase.execute({ orgId: 'org-1' });
    const response = result.unwrap();
    const summary = response.data[0];

    expect(summary.id).toBe('batch-1');
    expect(summary.type).toBe('PRODUCTS');
    expect(summary.status).toBe('COMPLETED');
    expect(summary.fileName).toBe('test.csv');
    expect(summary.totalRows).toBe(10);
    expect(summary.processedRows).toBe(10);
    expect(summary.validRows).toBe(8);
    expect(summary.invalidRows).toBe(2);
    expect(summary.createdBy).toBe('user-1');
    expect(summary.progress).toBe(100);
  });

  it('should pass filters to repository', async () => {
    mockRepository.findPaginated.mockResolvedValue({
      data: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
    });

    await useCase.execute({
      orgId: 'org-1',
      page: 2,
      limit: 10,
      type: 'PRODUCTS',
      status: 'COMPLETED',
    });

    expect(mockRepository.findPaginated).toHaveBeenCalledWith('org-1', {
      page: 2,
      limit: 10,
      type: 'PRODUCTS',
      status: 'COMPLETED',
    });
  });

  it('should use default pagination values', async () => {
    mockRepository.findPaginated.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await useCase.execute({ orgId: 'org-1' });

    expect(mockRepository.findPaginated).toHaveBeenCalledWith('org-1', {
      page: 1,
      limit: 20,
      type: undefined,
      status: undefined,
    });
  });

  it('should cap limit at 100', async () => {
    mockRepository.findPaginated.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
    });

    await useCase.execute({ orgId: 'org-1', limit: 500 });

    expect(mockRepository.findPaginated).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ limit: 100 })
    );
  });

  it('should handle repository errors', async () => {
    mockRepository.findPaginated.mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({ orgId: 'org-1' });

    expect(result.isErr()).toBe(true);
  });

  it('should include success message and timestamp in response', async () => {
    mockRepository.findPaginated.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const result = await useCase.execute({ orgId: 'org-1' });
    const response = result.unwrap();

    expect(response.success).toBe(true);
    expect(response.message).toBe('Import batches retrieved successfully');
    expect(response.timestamp).toBeDefined();
  });
});
