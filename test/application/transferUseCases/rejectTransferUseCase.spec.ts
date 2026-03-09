import { RejectTransferUseCase } from '@application/transferUseCases/rejectTransferUseCase';
import { Quantity } from '@inventory/stock';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';
import { Transfer } from '@transfer/domain/entities/transfer.entity';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';

describe('RejectTransferUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockTransferId = 'transfer-123';
  const mockFromWarehouseId = 'warehouse-from-123';
  const mockToWarehouseId = 'warehouse-to-456';
  const mockUserId = 'user-123';

  let useCase: RejectTransferUseCase;
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

    useCase = new RejectTransferUseCase(mockTransferRepository, mockEventDispatcher);
  });

  describe('execute', () => {
    const createTransferLine = (): TransferLine => {
      return TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10),
          fromLocationId: 'loc-from-1',
          toLocationId: 'loc-to-1',
        },
        'line-1',
        mockOrgId
      );
    };

    const createTransferWithStatus = (
      status: 'DRAFT' | 'IN_TRANSIT' | 'PARTIAL' | 'RECEIVED' | 'REJECTED' | 'CANCELED',
      lines: TransferLine[] = [createTransferLine()]
    ): Transfer => {
      return Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create(status),
          createdBy: mockUserId,
          note: 'Test transfer',
        },
        mockTransferId,
        mockOrgId,
        lines
      );
    };

    const validRequest = {
      transferId: mockTransferId,
      orgId: mockOrgId,
      reason: 'Damaged goods',
    };

    it('Given: an IN_TRANSIT transfer When: rejecting with reason Then: should return success result with REJECTED status', async () => {
      // Arrange
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const rejectedTransfer = createTransferWithStatus('REJECTED');
      mockTransferRepository.save.mockResolvedValue(rejectedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('rejected successfully');
          expect(value.data.id).toBe(mockTransferId);
          expect(value.data.status).toBe('REJECTED');
          expect(value.data.fromWarehouseId).toBe(mockFromWarehouseId);
          expect(value.data.toWarehouseId).toBe(mockToWarehouseId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: a non-existent transfer When: rejecting Then: should return NotFoundError', async () => {
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

    it('Given: a DRAFT transfer When: rejecting Then: should return BusinessRuleError', async () => {
      // Arrange
      const draftTransfer = createTransferWithStatus('DRAFT');
      mockTransferRepository.findById.mockResolvedValue(draftTransfer);

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
          expect(error.message).toContain('cannot be rejected');
          expect(error.message).toContain('DRAFT');
        }
      );
      expect(mockTransferRepository.save).not.toHaveBeenCalled();
    });

    it('Given: an already REJECTED transfer When: rejecting again Then: should return BusinessRuleError', async () => {
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
          expect(error.message).toContain('cannot be rejected');
        }
      );
    });

    it('Given: an already RECEIVED transfer When: rejecting Then: should return BusinessRuleError', async () => {
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
          expect(error.message).toContain('cannot be rejected');
        }
      );
    });

    it('Given: a CANCELED transfer When: rejecting Then: should return BusinessRuleError', async () => {
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
          expect(error.message).toContain('cannot be rejected');
        }
      );
    });

    it('Given: an IN_TRANSIT transfer When: rejecting Then: should dispatch domain events via markAndDispatch', async () => {
      // Arrange
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const rejectedTransfer = createTransferWithStatus('REJECTED');
      mockTransferRepository.save.mockResolvedValue(rejectedTransfer);

      // Act
      await useCase.execute(validRequest);

      // Assert
      expect(mockEventDispatcher.markAndDispatch).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.markAndDispatch).toHaveBeenCalledWith(
        rejectedTransfer.domainEvents
      );
    });

    it('Given: an IN_TRANSIT transfer When: rejecting Then: should save transfer via repository', async () => {
      // Arrange
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const rejectedTransfer = createTransferWithStatus('REJECTED');
      mockTransferRepository.save.mockResolvedValue(rejectedTransfer);

      // Act
      await useCase.execute(validRequest);

      // Assert
      expect(mockTransferRepository.findById).toHaveBeenCalledWith(mockTransferId, mockOrgId);
      expect(mockTransferRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: an IN_TRANSIT transfer When: rejecting without reason Then: should still succeed', async () => {
      // Arrange
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const rejectedTransfer = createTransferWithStatus('REJECTED');
      mockTransferRepository.save.mockResolvedValue(rejectedTransfer);

      const requestWithoutReason = {
        transferId: mockTransferId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(requestWithoutReason);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.status).toBe('REJECTED');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: a PARTIAL transfer When: rejecting Then: should return success since PARTIAL canReject is true', async () => {
      // Arrange - TransferStatus.canReject() returns true for IN_TRANSIT and PARTIAL
      const partialTransfer = createTransferWithStatus('PARTIAL');
      mockTransferRepository.findById.mockResolvedValue(partialTransfer);

      const rejectedTransfer = createTransferWithStatus('REJECTED');
      mockTransferRepository.save.mockResolvedValue(rejectedTransfer);

      // Act
      const result = await useCase.execute({
        ...validRequest,
        reason: 'Wrong items in partial shipment',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.status).toBe('REJECTED');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: an IN_TRANSIT transfer When: rejecting Then: should return all transfer data fields', async () => {
      // Arrange
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const rejectedTransfer = createTransferWithStatus('REJECTED');
      mockTransferRepository.save.mockResolvedValue(rejectedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.note).toBe('Test transfer');
          expect(value.data.linesCount).toBeGreaterThanOrEqual(0);
          expect(value.data.orgId).toBe(mockOrgId);
          expect(value.data.createdBy).toBe(mockUserId);
          expect(value.data.createdAt).toBeDefined();
          expect(value.data.updatedAt).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
