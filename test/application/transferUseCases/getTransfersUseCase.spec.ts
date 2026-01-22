import { GetTransfersUseCase } from '@application/transferUseCases/getTransfersUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Transfer } from '@transfer/domain/entities/transfer.entity';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';

describe('GetTransfersUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetTransfersUseCase;
  let mockTransferRepository: jest.Mocked<ITransferRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransferRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByFromWarehouse: jest.fn(),
      findByToWarehouse: jest.fn(),
      findByStatus: jest.fn(),
      findByDateRange: jest.fn(),
      findInTransitTransfers: jest.fn(),
      findPendingTransfers: jest.fn(),
    } as jest.Mocked<ITransferRepository>;

    useCase = new GetTransfersUseCase(mockTransferRepository);
  });

  describe('execute', () => {
    const createMockTransfer = () => {
      return Transfer.create(
        {
          fromWarehouseId: 'warehouse-from-123',
          toWarehouseId: 'warehouse-to-123',
          status: TransferStatus.create('DRAFT'),
          createdBy: 'user-123',
        },
        mockOrgId
      );
    };

    const createTransferWithDates = ({
      fromWarehouseId = 'warehouse-from-123',
      toWarehouseId = 'warehouse-to-123',
      status = 'DRAFT',
      initiatedAt,
      receivedAt,
    }: {
      fromWarehouseId?: string;
      toWarehouseId?: string;
      status?: 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'CANCELED' | 'PARTIAL';
      initiatedAt?: Date;
      receivedAt?: Date;
    }) => {
      return Transfer.reconstitute(
        {
          fromWarehouseId,
          toWarehouseId,
          status: TransferStatus.create(status),
          createdBy: 'user-123',
          initiatedAt,
          receivedAt,
        },
        `transfer-${fromWarehouseId}-${toWarehouseId}`,
        mockOrgId
      );
    };

    it('Given: valid request When: getting transfers Then: should return paginated transfers', async () => {
      // Arrange
      const mockTransfers = [createMockTransfer(), createMockTransfer()];
      mockTransferRepository.findAll.mockResolvedValue(mockTransfers);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Transfers retrieved successfully');
          expect(value.pagination).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with status filter When: getting transfers Then: should return filtered transfers', async () => {
      // Arrange
      const mockTransfers = [createMockTransfer()];
      mockTransferRepository.findByStatus.mockResolvedValue(mockTransfers);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'PENDING',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockTransferRepository.findByStatus).toHaveBeenCalledWith('PENDING', mockOrgId);
    });

    it('Given: request with from/to filters When: getting transfers Then: should apply additional filters', async () => {
      // Arrange
      const mockTransfers = [
        createTransferWithDates({
          fromWarehouseId: 'warehouse-from-123',
          toWarehouseId: 'warehouse-to-123',
          status: 'IN_TRANSIT',
          initiatedAt: new Date('2024-01-05T10:00:00.000Z'),
        }),
        createTransferWithDates({
          fromWarehouseId: 'warehouse-from-123',
          toWarehouseId: 'warehouse-to-999',
          status: 'DRAFT',
          initiatedAt: new Date('2024-01-04T10:00:00.000Z'),
        }),
      ];

      mockTransferRepository.findByFromWarehouse.mockResolvedValue(mockTransfers);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        fromWarehouseId: 'warehouse-from-123',
        toWarehouseId: 'warehouse-to-123',
        status: 'IN_TRANSIT',
        sortBy: 'initiatedAt',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].toWarehouseId).toBe('warehouse-to-123');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: date range filter When: getting transfers Then: should use date range query and handle empty list', async () => {
      // Arrange
      mockTransferRepository.findByDateRange.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-01-31T23:59:59.999Z'),
        sortBy: 'receivedAt',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockTransferRepository.findByDateRange).toHaveBeenCalled();
    });
  });
});
