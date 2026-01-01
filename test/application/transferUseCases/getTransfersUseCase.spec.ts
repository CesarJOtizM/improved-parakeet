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
  });
});
