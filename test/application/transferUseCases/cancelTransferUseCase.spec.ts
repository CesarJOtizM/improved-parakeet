import { CancelTransferUseCase } from '@application/transferUseCases/cancelTransferUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';
import { Transfer } from '@transfer/domain/entities/transfer.entity';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';
import { Quantity } from '@inventory/stock';

import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';

describe('CancelTransferUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockTransferId = 'transfer-123';
  const mockFromWarehouseId = 'warehouse-from-123';
  const mockToWarehouseId = 'warehouse-to-456';
  const mockUserId = 'user-123';

  let useCase: CancelTransferUseCase;
  let mockTransferRepository: jest.Mocked<ITransferRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

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

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new CancelTransferUseCase(mockTransferRepository, mockEventDispatcher);
  });

  describe('execute', () => {
    const createDraftTransfer = (lines: TransferLine[] = []): Transfer => {
      return Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create('DRAFT'),
          createdBy: mockUserId,
          note: 'Test transfer',
        },
        mockTransferId,
        mockOrgId,
        lines
      );
    };

    const createTransferWithStatus = (
      status: 'DRAFT' | 'IN_TRANSIT' | 'PARTIAL' | 'RECEIVED' | 'REJECTED' | 'CANCELED'
    ): Transfer => {
      return Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create(status),
          createdBy: mockUserId,
        },
        mockTransferId,
        mockOrgId
      );
    };

    const validRequest = {
      transferId: mockTransferId,
      orgId: mockOrgId,
    };

    it('Given: a DRAFT transfer When: canceling Then: should return success result with CANCELED status', async () => {
      // Arrange
      const draftTransfer = createDraftTransfer();
      mockTransferRepository.findById.mockResolvedValue(draftTransfer);

      const canceledTransfer = createTransferWithStatus('CANCELED');
      mockTransferRepository.save.mockResolvedValue(canceledTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Transfer canceled successfully.');
          expect(value.data.id).toBe(mockTransferId);
          expect(value.data.status).toBe('CANCELED');
          expect(value.data.fromWarehouseId).toBe(mockFromWarehouseId);
          expect(value.data.toWarehouseId).toBe(mockToWarehouseId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: a non-existent transfer When: canceling Then: should return NotFoundError', async () => {
      // Arrange
      mockTransferRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain(mockTransferId);
        }
      );
      expect(mockTransferRepository.save).not.toHaveBeenCalled();
    });

    it('Given: an already RECEIVED transfer When: canceling Then: should return BusinessRuleError', async () => {
      // Arrange
      const receivedTransfer = createTransferWithStatus('RECEIVED');
      mockTransferRepository.findById.mockResolvedValue(receivedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('cannot be canceled');
          expect(error.message).toContain('RECEIVED');
        }
      );
      expect(mockTransferRepository.save).not.toHaveBeenCalled();
    });

    it('Given: an already CANCELED transfer When: canceling Then: should return BusinessRuleError', async () => {
      // Arrange
      const canceledTransfer = createTransferWithStatus('CANCELED');
      mockTransferRepository.findById.mockResolvedValue(canceledTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('cannot be canceled');
        }
      );
      expect(mockTransferRepository.save).not.toHaveBeenCalled();
    });

    it('Given: a REJECTED transfer When: canceling Then: should return BusinessRuleError', async () => {
      // Arrange
      const rejectedTransfer = createTransferWithStatus('REJECTED');
      mockTransferRepository.findById.mockResolvedValue(rejectedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('cannot be canceled');
        }
      );
      expect(mockTransferRepository.save).not.toHaveBeenCalled();
    });

    it('Given: a DRAFT transfer When: canceling Then: should save transfer via repository', async () => {
      // Arrange
      const draftTransfer = createDraftTransfer();
      mockTransferRepository.findById.mockResolvedValue(draftTransfer);

      const canceledTransfer = createTransferWithStatus('CANCELED');
      mockTransferRepository.save.mockResolvedValue(canceledTransfer);

      // Act
      await useCase.execute(validRequest);

      // Assert
      expect(mockTransferRepository.findById).toHaveBeenCalledWith(mockTransferId, mockOrgId);
      expect(mockTransferRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: a DRAFT transfer When: canceling Then: should dispatch domain events via markAndDispatch', async () => {
      // Arrange
      const draftTransfer = createDraftTransfer();
      mockTransferRepository.findById.mockResolvedValue(draftTransfer);

      const canceledTransfer = createTransferWithStatus('CANCELED');
      mockTransferRepository.save.mockResolvedValue(canceledTransfer);

      // Act
      await useCase.execute(validRequest);

      // Assert
      expect(mockEventDispatcher.markAndDispatch).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.markAndDispatch).toHaveBeenCalledWith(
        canceledTransfer.domainEvents
      );
    });

    it('Given: a DRAFT transfer with lines When: canceling Then: should return correct linesCount', async () => {
      // Arrange
      const line = TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10),
          fromLocationId: 'loc-from-1',
          toLocationId: 'loc-to-1',
        },
        'line-1',
        mockOrgId
      );
      const draftTransfer = createDraftTransfer([line]);
      mockTransferRepository.findById.mockResolvedValue(draftTransfer);

      const canceledWithLines = Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create('CANCELED'),
          createdBy: mockUserId,
        },
        mockTransferId,
        mockOrgId,
        [line]
      );
      mockTransferRepository.save.mockResolvedValue(canceledWithLines);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.linesCount).toBe(1);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: an IN_TRANSIT transfer When: canceling Then: should return success since IN_TRANSIT canCancel is true', async () => {
      // Arrange - TransferStatus.canCancel() returns true for DRAFT and IN_TRANSIT
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const canceledTransfer = createTransferWithStatus('CANCELED');
      mockTransferRepository.save.mockResolvedValue(canceledTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.status).toBe('CANCELED');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
